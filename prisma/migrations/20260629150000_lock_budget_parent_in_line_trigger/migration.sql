-- S13 hardening: cierra la carrera concurrente que permitía mutar la línea base de un
-- presupuesto ya aprobado.
--
-- Problema: approveBudget bloquea la fila "Budget" con FOR UPDATE, pero el trigger de
-- "BudgetLine" solo LEÍA el estado del padre sin bloquearlo. Bajo READ COMMITTED, una
-- mutación de línea concurrente podía leer el padre como DRAFT, pasar la comprobación y
-- confirmar DESPUÉS de la aprobación, dejando una base mutada dentro de un presupuesto
-- APPROVED (viola la inmutabilidad de la línea base, §8.1).
--
-- Solución: el trigger bloquea ahora la fila "Budget" padre con FOR KEY SHARE antes de
-- comprobar su estado. FOR KEY SHARE entra en conflicto con el FOR UPDATE de la
-- aprobación, así que la mutación de línea se serializa frente a la aprobación: o espera a
-- que ésta confirme (y entonces re-lee APPROVED y aborta), o la aprobación espera a que la
-- mutación confirme (y aprueba el estado final). Dos mutaciones de línea entre sí siguen
-- sin bloquearse (FOR KEY SHARE es compartido).

CREATE OR REPLACE FUNCTION "prevent_approved_budgetline_base_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_is_approved boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT ("status" = 'APPROVED') INTO parent_is_approved
      FROM "Budget" WHERE "id" = NEW."budgetId" FOR KEY SHARE;
    IF parent_is_approved THEN
      RAISE EXCEPTION 'Cannot add budget lines to an approved budget'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT ("status" = 'APPROVED') INTO parent_is_approved
      FROM "Budget" WHERE "id" = OLD."budgetId" FOR KEY SHARE;
    IF parent_is_approved THEN
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
    -- Bloquea la(s) fila(s) padre antes de comprobar el estado (normalmente una sola: no
    -- se permite re-parentar una línea, pero el IN cubre OLD y NEW por robustez).
    PERFORM 1 FROM "Budget"
      WHERE "id" IN (OLD."budgetId", NEW."budgetId") FOR KEY SHARE;
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
