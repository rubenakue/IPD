-- S12: políticas RLS para el BOOTSTRAP de creación de proyecto.
--
-- Las políticas de S10 (FOR ALL, WITH CHECK app_is_active_agent) impiden crear el
-- primer Project y el primer Agent: nadie es "agente activo" todavía (huevo y gallina).
-- Estas políticas adicionales son PERMISIVAS (se combinan con OR con las de S10) y
-- habilitan solo el arranque controlado, bajo el rol `ipd_app` con `ipd.current_user_id`.

-- Helper: ¿el proyecto aún no tiene agentes? SECURITY DEFINER para no disparar la RLS
-- de "Agent" (evita recursión), igual que los helpers de S10.
CREATE OR REPLACE FUNCTION app_project_has_no_agents(p_project_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT NOT EXISTS (SELECT 1 FROM "Agent" WHERE "projectId" = p_project_id) $$;

-- 1) Crear un proyecto: cualquier usuario autenticado (hay `ipd.current_user_id`).
--    Queda como su PM en el mismo flujo (política 2). No expone proyectos ajenos: la
--    lectura sigue gobernada por "Project_rls" (solo agentes activos).
CREATE POLICY "Project_insert_bootstrap" ON "Project"
FOR INSERT
WITH CHECK (app_current_user_id() IS NOT NULL AND app_current_user_id() <> '');

-- 2) Auto-alta del creador como PM, SOLO en el bootstrap (proyecto sin agentes aún).
--    Impide que un usuario se auto-añada a un proyecto ajeno ya existente: si el
--    proyecto ya tiene agentes, esta política no aplica y la de S10 (app_is_active_agent)
--    exige participar. Añadir OTROS agentes a un proyecto existente lo cubre "Agent_rls".
CREATE POLICY "Agent_insert_bootstrap" ON "Agent"
FOR INSERT
WITH CHECK (
  "userId" = app_current_user_id()
  AND "role" = 'PROJECT_MANAGER'
  AND app_project_has_no_agents("projectId")
);

-- Phase (INSERT de las 4 fases) y el UPDATE de "Project"."activePhaseId" NO necesitan
-- política nueva: se ejecutan DESPUÉS de insertar el Agent PM, momento en el que
-- app_is_active_agent(projectId) ya es verdadero (políticas de S10).
