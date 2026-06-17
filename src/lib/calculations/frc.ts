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

/** Reparte la desviación en bonus (ahorro, positivo) o malus (sobrecoste, negativo). */
function computeBonusMalus(
  deviation: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  // Ahorro: reparto proporcional sin tope (regla 1). El residuo de redondeo va al
  // agente de mayor % para cuadrar exactamente con el total (regla 7).
  if (deviation > 0) return distributeProportional(deviation, agents);
  if (deviation < 0) return distributeOverrun(-deviation, agents);
  return new Map(); // equilibrio: nadie gana ni pierde
}

// ── Sobrecoste ────────────────────────────────────────────────────────────────
// Dos fases que mantienen separadas dos reglas distintas de §9.5:
//   Fase A — cada agente asume su % del sobrecoste; el residuo de redondeo va al de
//            mayor % (regla 7). Es el reparto "ideal", aún sin topes.
//   Fase B — constructor y proyectista topan su pérdida en sus honorarios en riesgo
//            (regla 2); SOLO el exceso real sobre ese tope lo absorbe el promotor
//            (reglas 3 y 4). El residuo de redondeo NO se mezcla con ese exceso.
function distributeOverrun(
  overrun: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  const idealLoss = distributeProportional(overrun, agents); // Fase A (montos positivos)

  const result = new Map<string, number>();
  let cappedExcess = 0;
  for (const agent of agents) {
    const share = idealLoss.get(agent.agentId) ?? 0;
    if (agent.role === 'promoter') {
      result.set(agent.agentId, -share); // su parte; el exceso de otros se suma luego
    } else {
      const loss = Math.min(share, agent.feeAtRisk); // tope = honorarios en riesgo
      result.set(agent.agentId, -loss);
      cappedExcess += share - loss; // lo que supera el tope (≥ 0)
    }
  }

  // Fase B: el exceso de los topados lo absorben los promotores (reglas 3 y 4).
  addLossToPromoters(cappedExcess, agents.filter((a) => a.role === 'promoter'), result);
  return result;
}

/** Reparto proporcional al %, redondeado al céntimo, con el residuo asignado al agente
 *  de mayor % para que la suma cuadre exactamente con el total (regla 7). Devuelve montos
 *  positivos; el signo (bonus/malus) lo aplica quien llama. */
function distributeProportional(
  total: number,
  agents: readonly AgentFrcTerms[],
): Map<string, number> {
  const result = new Map<string, number>();
  let assigned = 0;
  for (const agent of agents) {
    const share = Math.round((total * agent.sharePercent) / 100);
    result.set(agent.agentId, share);
    assigned += share;
  }
  const residual = total - assigned;
  if (residual !== 0) {
    const top = largestShareAgent(agents);
    if (top) result.set(top.agentId, (result.get(top.agentId) ?? 0) + residual);
  }
  return result;
}

/** Suma una pérdida extra (el exceso de los topados) a los promotores, proporcional a su
 *  %, con el residuo al de mayor %. Con un único promotor —el caso normal en IPD— recibe todo. */
function addLossToPromoters(
  excess: number,
  promoters: readonly AgentFrcTerms[],
  result: Map<string, number>,
): void {
  if (excess === 0 || promoters.length === 0) return;
  const totalPercent = promoters.reduce((sum, agent) => sum + agent.sharePercent, 0);
  let assigned = 0;
  for (const agent of promoters) {
    const extra =
      totalPercent > 0
        ? Math.round((excess * agent.sharePercent) / totalPercent)
        : Math.round(excess / promoters.length);
    result.set(agent.agentId, (result.get(agent.agentId) ?? 0) - extra);
    assigned += extra;
  }
  const residual = excess - assigned;
  if (residual !== 0) {
    const top = largestShareAgent(promoters);
    if (top) result.set(top.agentId, (result.get(top.agentId) ?? 0) - residual);
  }
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
