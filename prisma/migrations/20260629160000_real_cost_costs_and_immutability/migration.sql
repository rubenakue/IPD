-- S14: costes reales (flujo C).
-- 1) Campos del coste: descripción y fecha (el esquema base no los tenía).
-- 2) Refuerzos de integridad: rango de avance, inmutabilidad de RealCost y una sola
--    anulación por coste.

-- 1) Nuevos campos de RealCost (additivos). Backfill defensivo para filas previas.
ALTER TABLE "RealCost" ADD COLUMN "description" TEXT;
ALTER TABLE "RealCost" ADD COLUMN "incurredOn" DATE;

UPDATE "RealCost"
SET "description" = COALESCE("description", '(sin descripción)'),
    "incurredOn" = COALESCE("incurredOn", "createdAt"::date)
WHERE "description" IS NULL OR "incurredOn" IS NULL;

ALTER TABLE "RealCost" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "RealCost" ALTER COLUMN "incurredOn" SET NOT NULL;

ALTER TABLE "RealCost" ADD CONSTRAINT "RealCost_description_check"
CHECK (btrim("description") <> '');

-- 2) Rango del avance físico (hoy solo lo documentaba un comentario del esquema).
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_progressPercent_range_check"
CHECK ("progressPercent" IS NULL OR ("progressPercent" BETWEEN 0 AND 100));

-- 3) Una sola anulación por coste: un original solo puede tener un contra-asiento.
CREATE UNIQUE INDEX "RealCost_one_reversal_per_cost"
ON "RealCost" ("reversalOfId")
WHERE "type" = 'REVERSAL';

-- 4) Inmutabilidad de RealCost: nunca se edita ni se borra (§8.8). Una corrección es un
--    contra-asiento (INSERT), no un UPDATE/DELETE. El INSERT no se ve afectado.
CREATE OR REPLACE FUNCTION "prevent_realcost_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'RealCost is immutable: corrections are made with a reversal entry'
    USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "RealCost_prevent_mutation"
BEFORE UPDATE OR DELETE ON "RealCost"
FOR EACH ROW
EXECUTE FUNCTION "prevent_realcost_mutation"();
