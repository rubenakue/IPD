import { describe, expect, it } from 'vitest';
import {
  fundStatusFromDeviation,
  projectFrcForRole,
  type FrcBoard,
  type FrcProjectionRequester,
} from '../src/lib/frc/visibility.ts';
import type { FrcAgentRow } from '../src/types/api.ts';

const promoterRow: FrcAgentRow = {
  agentId: 'a-promoter',
  displayName: 'Promotora Levante',
  role: 'PROMOTER',
  bonusMalusCents: -400_00,
  guaranteedFeeCents: 0,
  totalCents: -400_00,
};
const constructorRow: FrcAgentRow = {
  agentId: 'a-constructor',
  displayName: 'Construcciones Turia',
  role: 'CONSTRUCTOR',
  bonusMalusCents: -600_00,
  guaranteedFeeCents: 800_000_00,
  totalCents: 799_400_00,
};
const designerRow: FrcAgentRow = {
  agentId: 'a-designer',
  displayName: 'Estudio Albor',
  role: 'DESIGNER',
  bonusMalusCents: 0,
  guaranteedFeeCents: 180_000_00,
  totalCents: 180_000_00,
};

// Sobrecoste de 1.000,00 € (desviación negativa) repartido entre las filas.
const board: FrcBoard = {
  budgetStatus: 'APPROVED',
  deviationCents: -1_000_00,
  rows: [promoterRow, constructorRow, designerRow],
};

const req = (over: Partial<FrcProjectionRequester>): FrcProjectionRequester => ({
  agentId: 'a-constructor',
  canViewGlobal: false,
  canViewOwn: false,
  participates: false,
  ...over,
});

describe('fundStatusFromDeviation (lógica pura)', () => {
  it('positivo = bonus, negativo = malus, cero = neutral', () => {
    expect(fundStatusFromDeviation(1)).toBe('bonus');
    expect(fundStatusFromDeviation(-1)).toBe('malus');
    expect(fundStatusFromDeviation(0)).toBe('neutral');
  });
});

describe('projectFrcForRole (filtrado por rol — el innegociable)', () => {
  it('global: promotor/PM ve todas las filas, la desviación y el estado', () => {
    const out = projectFrcForRole(board, req({ agentId: 'a-promoter', canViewGlobal: true }));
    expect(out.visibility).toBe('global');
    if (out.visibility !== 'global') throw new Error('narrow');
    expect(out.deviationCents).toBe(-1_000_00);
    expect(out.fundStatus).toBe('malus');
    expect(out.agents).toHaveLength(3);
    // SC-002: la suma de bonus/malus cuadra con la desviación.
    const sum = out.agents.reduce((s, a) => s + a.bonusMalusCents, 0);
    expect(sum).toBe(out.deviationCents);
  });

  it('own: constructor que participa ve SOLO su fila + desviación + estado', () => {
    const out = projectFrcForRole(
      board,
      req({ agentId: 'a-constructor', canViewOwn: true, participates: true }),
    );
    expect(out.visibility).toBe('own');
    if (out.visibility !== 'own') throw new Error('narrow');
    expect(out.deviationCents).toBe(-1_000_00);
    expect(out.own?.agentId).toBe('a-constructor');
    // SC-003: nunca la fila de otro agente ni el cuadro completo.
    expect(out).not.toHaveProperty('agents');
    expect(JSON.stringify(out)).not.toContain('a-designer');
    expect(JSON.stringify(out)).not.toContain('a-promoter');
  });

  it('own sin datos (presupuesto no aprobado): own = null, sigue siendo su visibilidad', () => {
    const empty: FrcBoard = { budgetStatus: 'DRAFT', deviationCents: 0, rows: [] };
    const out = projectFrcForRole(
      empty,
      req({ agentId: 'a-constructor', canViewOwn: true, participates: true }),
    );
    expect(out.visibility).toBe('own');
    if (out.visibility !== 'own') throw new Error('narrow');
    expect(out.own).toBeNull();
    expect(out.fundStatus).toBe('neutral');
  });

  it('agente 0 % con visibilidad propia degrada a aggregate (FR-011)', () => {
    const out = projectFrcForRole(
      board,
      req({ agentId: 'a-designer', canViewOwn: true, participates: false }),
    );
    expect(out.visibility).toBe('aggregate');
  });

  it('observador: solo estado agregado, SIN importes ni filas (FR-009/SC-004)', () => {
    const out = projectFrcForRole(board, req({ agentId: 'a-observer' }));
    expect(out.visibility).toBe('aggregate');
    expect(out.fundStatus).toBe('malus');
    expect(out.budgetStatus).toBe('APPROVED');
    // SC-004: la respuesta cruda no contiene las claves vetadas.
    expect(out).not.toHaveProperty('deviationCents');
    expect(out).not.toHaveProperty('agents');
    expect(out).not.toHaveProperty('own');
    expect(JSON.stringify(out)).not.toContain('a-constructor');
  });

  it('global sin datos: agents vacío, estado neutral', () => {
    const empty: FrcBoard = { budgetStatus: null, deviationCents: 0, rows: [] };
    const out = projectFrcForRole(empty, req({ agentId: 'a-promoter', canViewGlobal: true }));
    expect(out.visibility).toBe('global');
    if (out.visibility !== 'global') throw new Error('narrow');
    expect(out.agents).toEqual([]);
    expect(out.fundStatus).toBe('neutral');
    expect(out.budgetStatus).toBeNull();
  });
});
