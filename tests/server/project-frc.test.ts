import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgentRole, BudgetStatus, RealCostType } from '../../src/generated/prisma/client.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import type { ProjectFrcResponse } from '../../src/types/api.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's16-frc-password';
const runId = Date.now();
const codePrefix = `S16-FRC-${runId}`;
const promoterEmail = `s16-prom-${runId}@ipd.test`;
const constructorEmail = `s16-con-${runId}@ipd.test`;
const designerEmail = `s16-des-${runId}@ipd.test`;
const observerEmail = `s16-obs-${runId}@ipd.test`;
const outsiderEmail = `s16-out-${runId}@ipd.test`;

interface ScenarioAgents {
  promoter: string;
  constructor: string;
  designer: string;
}

describe('FRC servido por rol (S16)', () => {
  const prisma: DbClient = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let promoterUserId: string;
  let constructorUserId: string;
  let designerUserId: string;
  let observerUserId: string;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: { startsWith: codePrefix } } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [promoterEmail, constructorEmail, designerEmail, observerEmail, outsiderEmail],
        },
      },
    });
  }

  async function login(email: string): Promise<string> {
    const res = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(200);
    return getSessionCookie(res);
  }

  // Proyecto con 2 partidas (base 1.000,00 € cada una). L2 en sobrecoste (coste 1.200,00 €) →
  // previsión total 2.200,00 €, vigente 2.000,00 €, desviación −200,00 € (malus).
  // Reparto: promotor 40 %, constructor 60 %; el proyectista NO participa (0 %) → FR-011.
  async function createScenario(
    suffix: string,
    { approved = true }: { approved?: boolean } = {},
  ): Promise<{ projectId: string; agents: ScenarioAgents }> {
    const project = await prisma.project.create({
      data: { code: `${codePrefix}-${suffix}`, name: `S16 ${suffix}`, clientName: 'IPD Test' },
    });
    const promoter = await prisma.agent.create({
      data: { userId: promoterUserId, projectId: project.id, role: AgentRole.PROMOTER, sharePercent: 40 },
    });
    const constructor = await prisma.agent.create({
      data: {
        userId: constructorUserId,
        projectId: project.id,
        role: AgentRole.CONSTRUCTOR,
        sharePercent: 60,
        guaranteedFee: 10_000_00n,
        feeAtRisk: 5_000_00n,
      },
    });
    const designer = await prisma.agent.create({
      data: { userId: designerUserId, projectId: project.id, role: AgentRole.DESIGNER, sharePercent: 0 },
    });
    await prisma.agent.create({
      data: { userId: observerUserId, projectId: project.id, role: AgentRole.OBSERVER, sharePercent: 0 },
    });

    const budget = await prisma.budget.create({ data: { projectId: project.id } });
    const l1 = await prisma.budgetLine.create({
      data: { budgetId: budget.id, chapterCode: '01', chapterName: 'Cim', code: '01.01', name: 'A', baseAmount: 1_000_00n },
    });
    const l2 = await prisma.budgetLine.create({
      data: { budgetId: budget.id, chapterCode: '01', chapterName: 'Cim', code: '01.02', name: 'B', baseAmount: 1_000_00n },
    });
    await prisma.realCost.create({
      data: { budgetLineId: l1.id, amount: 500_00n, type: RealCostType.NORMAL, description: 'c1', incurredOn: new Date('2026-06-20'), recordedById: constructorUserId },
    });
    await prisma.realCost.create({
      data: { budgetLineId: l2.id, amount: 1_200_00n, type: RealCostType.NORMAL, description: 'c2', incurredOn: new Date('2026-06-20'), recordedById: constructorUserId },
    });
    if (approved) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { status: BudgetStatus.APPROVED, approvedAt: new Date() },
      });
    }
    return {
      projectId: project.id,
      agents: { promoter: promoter.id, constructor: constructor.id, designer: designer.id },
    };
  }

  function getFrc(projectId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/frc`, { headers: { Cookie: cookie } });
  }

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [prom, con, des, obs] = await Promise.all([
      prisma.user.create({ data: { email: promoterEmail, displayName: 'FRC Prom', passwordHash } }),
      prisma.user.create({ data: { email: constructorEmail, displayName: 'FRC Con', passwordHash } }),
      prisma.user.create({ data: { email: designerEmail, displayName: 'FRC Des', passwordHash } }),
      prisma.user.create({ data: { email: observerEmail, displayName: 'FRC Obs', passwordHash } }),
      prisma.user.create({ data: { email: outsiderEmail, displayName: 'FRC Out', passwordHash } }),
    ]);
    promoterUserId = prom.id;
    constructorUserId = con.id;
    designerUserId = des.id;
    observerUserId = obs.id;

    const { app, store } = createTestApp(prisma);
    sessionStore = store;
    const listener = await listen(app);
    url = listener.url;
    server = listener.server;
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
  });

  afterAll(async () => {
    server.close();
    await cleanup();
    sessionStore.close();
    await prisma.$disconnect();
  });

  it('promotor: cuadro completo con desviación y la suma de bonus/malus cuadra (SC-002)', async () => {
    const { projectId } = await createScenario('GLOBAL');
    const body = (await (await getFrc(projectId, await login(promoterEmail))).json()) as ProjectFrcResponse;

    expect(body.visibility).toBe('global');
    if (body.visibility !== 'global') throw new Error('narrow');
    expect(body.budgetStatus).toBe('APPROVED');
    expect(body.fundStatus).toBe('malus');
    expect(body.deviationCents).toBe(-200_00);
    // El proyectista al 0 % no participa → solo promotor + constructor.
    expect(body.agents).toHaveLength(2);
    const sum = body.agents.reduce((s, a) => s + a.bonusMalusCents, 0);
    expect(sum).toBe(body.deviationCents);
  });

  it('constructor: SOLO su fila + desviación; nunca el resultado de otros (SC-003)', async () => {
    const { projectId, agents } = await createScenario('OWN');
    const res = await getFrc(projectId, await login(constructorEmail));
    const raw = await res.text();
    const body = JSON.parse(raw) as ProjectFrcResponse;

    expect(body.visibility).toBe('own');
    if (body.visibility !== 'own') throw new Error('narrow');
    expect(body.deviationCents).toBe(-200_00);
    expect(body.own?.agentId).toBe(agents.constructor);
    expect(body.own?.role).toBe('CONSTRUCTOR');
    expect(body.own?.bonusMalusCents).toBe(-120_00); // 60 % de 200,00 €
    expect(body).not.toHaveProperty('agents');
    // El JSON crudo no expone al promotor ni su fila.
    expect(raw).not.toContain(agents.promoter);
    expect(raw).not.toContain('FRC Prom');
  });

  it('proyectista al 0 %: degrada a estado agregado (FR-011)', async () => {
    const { projectId } = await createScenario('ZEROSHARE');
    const body = (await (await getFrc(projectId, await login(designerEmail))).json()) as ProjectFrcResponse;
    expect(body.visibility).toBe('aggregate');
    expect(body.fundStatus).toBe('malus');
  });

  it('observador: solo el estado agregado, SIN importes ni filas (SC-004)', async () => {
    const { projectId } = await createScenario('AGG');
    const res = await getFrc(projectId, await login(observerEmail));
    const raw = await res.text();
    const body = JSON.parse(raw) as ProjectFrcResponse;

    expect(body.visibility).toBe('aggregate');
    expect(body.fundStatus).toBe('malus');
    expect(body.budgetStatus).toBe('APPROVED');
    expect(body).not.toHaveProperty('deviationCents');
    expect(body).not.toHaveProperty('agents');
    expect(body).not.toHaveProperty('own');
    expect(raw).not.toContain('FRC Con');
  });

  it('un no agente no puede consultar el FRC (NOT_FOUND — SC-005)', async () => {
    const { projectId } = await createScenario('OUT');
    expect((await getFrc(projectId, await login(outsiderEmail))).status).toBe(404);
  });

  it('sin presupuesto aprobado: estado neutro y sin filas', async () => {
    const { projectId } = await createScenario('DRAFT', { approved: false });
    const body = (await (await getFrc(projectId, await login(constructorEmail))).json()) as ProjectFrcResponse;
    expect(body.visibility).toBe('own'); // el constructor participa → conserva su visibilidad
    if (body.visibility !== 'own') throw new Error('narrow');
    expect(body.budgetStatus).toBe('DRAFT');
    expect(body.fundStatus).toBe('neutral');
    expect(body.own).toBeNull();
  });
});
