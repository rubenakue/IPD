// applyChange — determina los efectos económicos de un cambio aprobado, según su tipo.
// Función PURA: devuelve los efectos a aplicar, NO ejecuta ninguna escritura.
// La implementación llega en la sesión S5 (TDD: este esqueleto deja los tests en rojo).
import type { ApprovedChange, ChangeEffects } from '../../types/domain';

export function applyChange(_change: ApprovedChange): ChangeEffects {
  throw new Error('Not implemented');
}
