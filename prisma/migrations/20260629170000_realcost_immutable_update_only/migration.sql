-- Ajuste de la inmutabilidad de RealCost.
--
-- El trigger anterior bloqueaba UPDATE y DELETE. Pero un DELETE también ocurre en el borrado
-- EN CASCADA legítimo de un proyecto (Project → Budget → BudgetLine → RealCost), que el
-- trigger impedía. La inmutabilidad de dominio es sobre la EDICIÓN de un asiento (§8.8): una
-- corrección es un contra-asiento, nunca un UPDATE. El borrado de un asiento individual no se
-- expone por la API y queda cubierto por RLS; el borrado en cascada es ciclo de vida.
--
-- Limitamos el trigger a UPDATE para permitir el cascade y seguir prohibiendo la edición.

DROP TRIGGER IF EXISTS "RealCost_prevent_mutation" ON "RealCost";

CREATE TRIGGER "RealCost_prevent_mutation"
BEFORE UPDATE ON "RealCost"
FOR EACH ROW
EXECUTE FUNCTION "prevent_realcost_mutation"();
