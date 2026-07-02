// Proyección del FRC por rol: recorta la salida de calculateFRC() a lo que cada rol puede ver.
// Función PURA (sin I/O, sin permisos resueltos aquí): el servicio arma el cuadro completo con
// datos de BD y resuelve los flags de permiso; esta pieza solo SELECCIONA la porción visible.
// El innegociable de seguridad (§9.5, Principio V) vive aquí y se prueba sin BD.
import type {
  FrcAgentRow,
  FrcFundStatus,
  ProjectFrcResponse,
} from '../../types/api';
import type { BudgetStatusCode } from '../../types/api';

/** Estado agregado del fondo a partir de la desviación total (FR-005). */
export function fundStatusFromDeviation(deviationCents: number): FrcFundStatus {
  if (deviationCents > 0) return 'bonus';
  if (deviationCents < 0) return 'malus';
  return 'neutral';
}

/** Cuadro completo del reparto, ya ensamblado por el servicio (vacío si no hay base aprobada). */
export interface FrcBoard {
  budgetStatus: BudgetStatusCode | null;
  deviationCents: number;
  /** Filas de todos los agentes que participan en el fondo. */
  rows: FrcAgentRow[];
}

/** Quién pregunta: identidad + permisos ya resueltos + si participa en el fondo. */
export interface FrcProjectionRequester {
  agentId: string;
  /** frc.global.view (promotor/PM). */
  canViewGlobal: boolean;
  /** frc.own.view (constructor/proyectista). */
  canViewOwn: boolean;
  /** sharePercent > 0: solo entonces existe "resultado propio" (Nota² §15 / FR-011). */
  participates: boolean;
}

/**
 * Devuelve la respuesta del FRC filtrada por rol. La unión discriminada por `visibility` hace
 * que el servidor solo serialice lo permitido: el observador ni siquiera recibe los campos
 * `deviationCents`/`agents`/`own`.
 */
export function projectFrcForRole(
  board: FrcBoard,
  requester: FrcProjectionRequester,
): ProjectFrcResponse {
  const fundStatus = fundStatusFromDeviation(board.deviationCents);
  const base = { budgetStatus: board.budgetStatus, fundStatus };

  // Promotor/PM: cuadro completo.
  if (requester.canViewGlobal) {
    return { ...base, visibility: 'global', deviationCents: board.deviationCents, agents: board.rows };
  }

  // Constructor/proyectista que participa: su fila + desviación + estado.
  // Si no participa (0 %), cae al agregado (FR-011). Si participa pero no hay datos
  // (presupuesto sin aprobar), su fila es null pero conserva su visibilidad.
  if (requester.canViewOwn && requester.participates) {
    const own = board.rows.find((row) => row.agentId === requester.agentId) ?? null;
    return { ...base, visibility: 'own', deviationCents: board.deviationCents, own };
  }

  // Observador o agente al 0 %: solo el estado agregado.
  return { ...base, visibility: 'aggregate' };
}
