-- S15/main hardening: un ajuste no puede enlazar un Change de un proyecto con una
-- BudgetLine de otro. Sin esta regla, un cambio aprobado en A podria alterar el vigente
-- derivado de B al sumar ChangeAdjustment.delta sobre la partida de B.

CREATE OR REPLACE FUNCTION app_changeadjustment_same_project(p_change_id text, p_budget_line_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT app_change_project(p_change_id) IS NOT NULL
     AND app_budgetline_project(p_budget_line_id) IS NOT NULL
     AND app_change_project(p_change_id) = app_budgetline_project(p_budget_line_id)
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ChangeAdjustment" ca
    JOIN "Change" c ON c."id" = ca."changeId"
    JOIN "BudgetLine" bl ON bl."id" = ca."budgetLineId"
    JOIN "Budget" b ON b."id" = bl."budgetId"
    WHERE c."projectId" <> b."projectId"
  ) THEN
    RAISE EXCEPTION 'Existing ChangeAdjustment rows link changes and budget lines from different projects'
      USING ERRCODE = '23514';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION enforce_changeadjustment_same_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT app_changeadjustment_same_project(NEW."changeId", NEW."budgetLineId") THEN
    RAISE EXCEPTION 'ChangeAdjustment must link a Change and BudgetLine from the same Project'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "ChangeAdjustment_same_project_check" ON "ChangeAdjustment";
CREATE CONSTRAINT TRIGGER "ChangeAdjustment_same_project_check"
AFTER INSERT OR UPDATE OF "changeId", "budgetLineId" ON "ChangeAdjustment"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW
EXECUTE FUNCTION enforce_changeadjustment_same_project();

DROP POLICY IF EXISTS "ChangeAdjustment_rls" ON "ChangeAdjustment";
CREATE POLICY "ChangeAdjustment_rls" ON "ChangeAdjustment"
FOR ALL
USING (
  app_is_active_agent(app_change_project("changeId"))
  AND app_changeadjustment_same_project("changeId", "budgetLineId")
)
WITH CHECK (
  app_is_active_agent(app_change_project("changeId"))
  AND app_changeadjustment_same_project("changeId", "budgetLineId")
);
