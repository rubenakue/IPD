-- S10 (review PR #35): amplía la 2ª capa RLS a TODAS las tablas con ámbito de
-- proyecto y concede la pertenencia al rol `ipd_app` al rol de conexión.
--
-- Contexto: la migración anterior creó `ipd_app` (NOLOGIN, NOBYPASSRLS) y la RLS
-- de `PromoterPrivateCost`. El runtime usa `SET LOCAL ROLE ipd_app` por petición.

-- 1) Pertenencia al rol. `SET ROLE ipd_app` solo lo permite PostgreSQL si el rol de
--    conexión es superuser O miembro de `ipd_app`. En dev la conexión es superuser
--    (funciona), pero en un despliegue con usuario de menor privilegio fallaría con
--    "permission denied to set role". Concedemos la membresía al rol que aplica la
--    migración; si el rol de runtime difiere, debe concederse en el despliegue.
GRANT ipd_app TO CURRENT_USER;

-- 2) Helpers SECURITY DEFINER: se ejecutan con los privilegios del propietario (que
--    NO está sujeto a RLS), de modo que resolver la participación o el projectId de
--    una fila NO dispara las políticas de otras tablas (evita RLS recursiva). El
--    `SET search_path = public` evita ataques de search_path en funciones DEFINER.
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT current_setting('ipd.current_user_id', true) $$;

CREATE OR REPLACE FUNCTION app_is_active_agent(p_project_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM "Agent"
    WHERE "Agent"."projectId" = p_project_id
      AND "Agent"."userId" = current_setting('ipd.current_user_id', true)
      AND "Agent"."status" = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION app_can_view_private_costs(p_project_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM "Agent"
    WHERE "Agent"."projectId" = p_project_id
      AND "Agent"."userId" = current_setting('ipd.current_user_id', true)
      AND "Agent"."status" = 'ACTIVE'
      AND "Agent"."role" IN ('PROMOTER', 'PROJECT_MANAGER')
  );
$$;

-- Resolvers de projectId para tablas con ámbito indirecto.
CREATE OR REPLACE FUNCTION app_budget_project(p_budget_id text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT "projectId" FROM "Budget" WHERE "id" = p_budget_id $$;

CREATE OR REPLACE FUNCTION app_budgetline_project(p_budget_line_id text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b."projectId"
  FROM "BudgetLine" bl JOIN "Budget" b ON b."id" = bl."budgetId"
  WHERE bl."id" = p_budget_line_id
$$;

CREATE OR REPLACE FUNCTION app_change_project(p_change_id text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT "projectId" FROM "Change" WHERE "id" = p_change_id $$;

-- 3) `PromoterPrivateCost`: reescribe sus políticas para usar el helper DEFINER
--    (más robusto ahora que `Agent` también tiene RLS: la comprobación no depende de
--    la RLS de `Agent`). La RLS ya está habilitada+forzada desde la migración previa.
DROP POLICY IF EXISTS "PromoterPrivateCost_select_by_project_role" ON "PromoterPrivateCost";
DROP POLICY IF EXISTS "PromoterPrivateCost_insert_by_project_role" ON "PromoterPrivateCost";

CREATE POLICY "PromoterPrivateCost_rls" ON "PromoterPrivateCost"
FOR ALL
USING (app_can_view_private_costs("projectId"))
WITH CHECK (app_can_view_private_costs("projectId"));

-- 4) Resto de tablas con ámbito de proyecto: el agente activo del proyecto puede
--    operar sobre sus filas; nadie ve filas de proyectos donde no participa. La
--    autorización fina por rol/acción la aplica la matriz §15 en la API; esto es la
--    red de seguridad de aislamiento por proyecto en la base de datos.

-- Project (ámbito = su propio id).
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Project_rls" ON "Project"
FOR ALL USING (app_is_active_agent("id")) WITH CHECK (app_is_active_agent("id"));

-- Phase, Agent, Budget, Change, PromoterPrivateCost ya cubierto: directo por projectId.
ALTER TABLE "Phase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Phase" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Phase_rls" ON "Phase"
FOR ALL USING (app_is_active_agent("projectId")) WITH CHECK (app_is_active_agent("projectId"));

ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Agent_rls" ON "Agent"
FOR ALL USING (app_is_active_agent("projectId")) WITH CHECK (app_is_active_agent("projectId"));

ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Budget_rls" ON "Budget"
FOR ALL USING (app_is_active_agent("projectId")) WITH CHECK (app_is_active_agent("projectId"));

ALTER TABLE "Change" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Change" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Change_rls" ON "Change"
FOR ALL USING (app_is_active_agent("projectId")) WITH CHECK (app_is_active_agent("projectId"));

-- BudgetLine (ámbito indirecto: budgetId -> Budget.projectId).
ALTER TABLE "BudgetLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetLine" FORCE ROW LEVEL SECURITY;
CREATE POLICY "BudgetLine_rls" ON "BudgetLine"
FOR ALL
USING (app_is_active_agent(app_budget_project("budgetId")))
WITH CHECK (app_is_active_agent(app_budget_project("budgetId")));

-- RealCost (ámbito indirecto: budgetLineId -> BudgetLine -> Budget.projectId).
ALTER TABLE "RealCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RealCost" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RealCost_rls" ON "RealCost"
FOR ALL
USING (app_is_active_agent(app_budgetline_project("budgetLineId")))
WITH CHECK (app_is_active_agent(app_budgetline_project("budgetLineId")));

-- ChangeAdjustment (ámbito indirecto: changeId -> Change.projectId).
ALTER TABLE "ChangeAdjustment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeAdjustment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ChangeAdjustment_rls" ON "ChangeAdjustment"
FOR ALL
USING (app_is_active_agent(app_change_project("changeId")))
WITH CHECK (app_is_active_agent(app_change_project("changeId")));

-- AuditEvent (projectId NULLABLE: eventos sin proyecto -p. ej. login- visibles; los
-- de proyecto, solo a sus participantes). La visibilidad fina por entidad de §517
-- (p. ej. eventos de costes privados solo a Promotor/PM) queda como refinamiento
-- futuro: aquí se garantiza el aislamiento por proyecto.
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AuditEvent_rls" ON "AuditEvent"
FOR ALL
USING ("projectId" IS NULL OR app_is_active_agent("projectId"))
WITH CHECK ("projectId" IS NULL OR app_is_active_agent("projectId"));
