// calculateFRC — reparto del Fondo de Riesgo Compartido (ahorro/sobrecoste) por agente.
// Función PURA: entradas → salida, sin I/O, sin fechas del sistema, sin azar.
// Reglas del dominio: docs/concepto-global.md §9.5 (reparto y límites).
import type {
  FrcInput,
  FrcResult,
  AgentFrcTerms,
  AgentFrcResult,
} from '../../types/domain';

export function calculateFRC(input: FrcInput): FrcResult {
  // Desviación = presupuesto vigente − previsión a cierre.
  // Positiva = ahorro (bonus); negativa = sobrecoste (malus); cero = equilibrio.
  const deviation = input.currentBudget - input.forecastAtCompletion;
  const bonusMalusById = computeBonusMalus(deviation, input.agents);

  const agents: AgentFrcResult[] = input.agents.map((agent) => {
    const bonusMalus = bonusMalusById.get(agent.agentId) ?? 0;
    return {
      agentId: agent.agentId,
      role: agent.role,
      bonusMalus,
      total: agent.guaranteedFee + bonusMalus, // resultado proyectado (§9.5)
    };
  });

  return { deviation, agents };
}

/** Reparte la desviación en bonus (ahorro) o malus (sobrecoste) por agente. */
function computeBonusMalus(
  deviation: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  if (deviation > 0) return distributeSaving(deviation, agents);
  if (deviation < 0) return distributeOverrun(-deviation, agents);
  return new Map(); // equilibrio: nadie gana ni pierde
}

// ── Ahorro ──────────────────────────────────────────────────────────────────
// Se reparte según el porcentaje de cada agente, sin tope (regla 1). El residuo
// de redondeo se asigna al agente de mayor % para que la suma cuadre exactamente
// con el ahorro total (regla 7).
function distributeSaving(
  saving: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  const result = new Map<string, number>();
  let assigned = 0;
  for (const agent of agents) {
    const share = Math.round((saving * agent.sharePercent) / 100);
    result.set(agent.agentId, share);
    assigned += share;
  }
  addResidualToLargestShare(saving - assigned, agents, result);
  return result;
}

// ── Sobrecoste ────────────────────────────────────────────────────────────────
// Constructor y proyectista asumen su porcentaje hasta agotar sus honorarios en
// riesgo: ese es su tope de pérdida (regla 2). El/los promotores asumen su parte
// SIN tope y, además, absorben el exceso que supere el fondo en riesgo de los
// demás (reglas 3 y 4). Se modela como "resto": primero las pérdidas topadas, y
// el promotor absorbe todo lo que falta para cuadrar la desviación (regla 7).
function distributeOverrun(
  overrun: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  const result = new Map<string, number>();
  const promoters = agents.filter((agent) => agent.role === 'promoter');
  const capped = agents.filter((agent) => agent.role !== 'promoter');

  let cappedLoss = 0;
  for (const agent of capped) {
    const theoretical = Math.round((overrun * agent.sharePercent) / 100);
    const loss = Math.min(theoretical, agent.feeAtRisk); // tope = honorarios en riesgo
    result.set(agent.agentId, -loss); // malus = negativo
    cappedLoss += loss;
  }

  // El resto = parte del promotor + exceso de los demás + residuo de redondeo.
  distributePromoterLoss(overrun - cappedLoss, promoters, result);
  return result;
}

/** Reparte la pérdida restante entre los promotores (proporcional al %, residuo al
 *  mayor). Con un único promotor —el caso normal en IPD— recibe todo el resto. */
function distributePromoterLoss(
  remainder: number,
  promoters: readonly AgentFrcTerms[],
  result: Map<string, number>,
): void {
  if (promoters.length === 0) return; // entrada inválida (siempre hay promotor); no rompe
  const totalPercent = promoters.reduce((sum, agent) => sum + agent.sharePercent, 0);
  let assigned = 0;
  for (const agent of promoters) {
    const loss =
      totalPercent > 0
        ? Math.round((remainder * agent.sharePercent) / totalPercent)
        : Math.round(remainder / promoters.length);
    result.set(agent.agentId, -loss);
    assigned += loss;
  }
  addResidualToLargestShare(-(remainder - assigned), promoters, result);
}

/** Suma el residuo de redondeo al agente de mayor % (>0), para que el reparto
 *  cuadre exactamente con el total (regla 7). `residual` ya trae el signo correcto. */
function addResidualToLargestShare(
  residual: number,
  agents: readonly AgentFrcTerms[],
  result: Map<string, number>,
): void {
  if (residual === 0) return;
  const top = largestShareAgent(agents);
  if (top) result.set(top.agentId, (result.get(top.agentId) ?? 0) + residual);
}

/** Agente con mayor porcentaje de reparto (>0). Empate → el primero (determinista). */
function largestShareAgent(
  agents: readonly AgentFrcTerms[],
): AgentFrcTerms | null {
  let top: AgentFrcTerms | null = null;
  for (const agent of agents) {
    if (agent.sharePercent > 0 && (top === null || agent.sharePercent > top.sharePercent)) {
      top = agent;
    }
  }
  return top;
}
