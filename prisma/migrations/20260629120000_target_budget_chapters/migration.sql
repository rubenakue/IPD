-- S13: presupuesto objetivo manual con capítulos en BudgetLine e inmutabilidad
-- de la línea base aprobada.

-- Capítulo como datos de la partida, sin tabla Chapter.
ALTER TABLE "BudgetLine" ADD COLUMN "chapterCode" TEXT;
ALTER TABLE "BudgetLine" ADD COLUMN "chapterName" TEXT;

-- Backfill defensivo para instalaciones con partidas previas a S13.
UPDATE "BudgetLine"
SET "chapterCode" = 'SIN_CAPITULO',
    "chapterName" = 'Sin capítulo'
WHERE "chapterCode" IS NULL OR "chapterName" IS NULL;

ALTER TABLE "BudgetLine" ALTER COLUMN "chapterCode" SET NOT NULL;
ALTER TABLE "BudgetLine" ALTER COLUMN "chapterName" SET NOT NULL;

ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_baseAmount_nonnegative_check"
CHECK ("baseAmount" >= 0);

ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_required_text_check"
CHECK (
  btrim("chapterCode") <> ''
  AND btrim("chapterName") <> ''
  AND btrim("code") <> ''
  AND btrim("name") <> ''
);

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_status_approvedAt_check"
CHECK (
  ("status" = 'DRAFT' AND "approvedAt" IS NULL)
  OR
  ("status" = 'APPROVED' AND "approvedAt" IS NOT NULL)
);

CREATE OR REPLACE FUNCTION "prevent_approved_budgetline_base_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF EXISTS (
      SELECT 1 FROM "Budget"
      WHERE "id" = NEW."budgetId" AND "status" = 'APPROVED'
    ) THEN
      RAISE EXCEPTION 'Cannot add budget lines to an approved budget'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM "Budget"
      WHERE "id" = OLD."budgetId" AND "status" = 'APPROVED'
    ) THEN
      RAISE EXCEPTION 'Cannot delete budget lines from an approved budget'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF (
    NEW."budgetId",
    NEW."chapterCode",
    NEW."chapterName",
    NEW."code",
    NEW."name",
    NEW."baseAmount"
  ) IS DISTINCT FROM (
    OLD."budgetId",
    OLD."chapterCode",
    OLD."chapterName",
    OLD."code",
    OLD."name",
    OLD."baseAmount"
  ) THEN
    IF EXISTS (
      SELECT 1 FROM "Budget"
      WHERE "id" IN (OLD."budgetId", NEW."budgetId") AND "status" = 'APPROVED'
    ) THEN
      RAISE EXCEPTION 'Cannot mutate the base lines of an approved budget'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "BudgetLine_prevent_approved_base_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "BudgetLine"
FOR EACH ROW
EXECUTE FUNCTION "prevent_approved_budgetline_base_mutation"();

CREATE OR REPLACE FUNCTION "prevent_approved_budget_reopen"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'APPROVED' AND NEW."status" <> 'APPROVED' THEN
    RAISE EXCEPTION 'Cannot reopen an approved budget'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'APPROVED' AND NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt" THEN
    RAISE EXCEPTION 'Cannot change approvedAt of an approved budget'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Budget_prevent_approved_reopen"
BEFORE UPDATE OF "status", "approvedAt" ON "Budget"
FOR EACH ROW
EXECUTE FUNCTION "prevent_approved_budget_reopen"();

