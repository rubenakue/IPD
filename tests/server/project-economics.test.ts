import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgentRole, BudgetStatus, RealCostType } from '../../src/generated/prisma/client.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import type { ProjectEconomicsResponse } from '../../src/types/api.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's15-economics-password';
const runId = Date.now();
const codePrefix = `S15-ECON-${runId}`;
const pmEmail = `s15-pm-${runId}@ipd.test`;
const constructorEmail = `s15-con-${runId}@ipd.test`;
const observerEmail = `s15-obs-${runId}@ipd.test`;
const outsiderEmail = `s15-out-${runId}@ipd.test`;

describe('derivados economicos y alertas (S15)', () => {
  const prisma: DbClient = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let pmUserId: string;
  let constructorUserId: string;
  let observerUserId: string;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: { startsWith: codePrefix } } });
    await prisma.user.deleteMany({
      where: { email: { in: [pmEmail, constructorEmail, observerEmail, outsiderEmail] } },
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

  // Proyecto + presupuesto con 2 partidas (01.01 en presupuesto, 01.02 en sobrecoste).
  // Importes en céntimos: base 1.000,00 € cada una; coste 500 € en L1, 1.200 € en L2.
  async function createScenario(
    suffix: string,
    { approved = true, withCosts = true }: { approved?: boolean; withCosts?: boolean } = {},
  ): Promise<{ projectId: string; l1Id: string; l2Id: string }> {
    const project = await prisma.project.create({
      data: { code: `${codePrefix}-${suffix}`, name: `S15 ${suffix}`, clientName: 'IPD Test' },
    });
    await prisma.agent.createMany({
      data: [
        { userId: pmUserId, projectId: project.id, role: AgentRole.PROJECT_MANAGER, sharePercent: 0 },
        { userId: constructorUserId, projectId: project.id, role: AgentRole.CONSTRUCTOR, sharePercent: 100 },
        { userId: observerUserId, projectId: project.id, role: AgentRole.OBSERVER, sharePercent: 0 },
      ],
    });
    const budget = await prisma.budget.create({ data: { projectId: project.id } });
    const l1 = await prisma.budgetLine.create({
      data: { budgetId: budget.id, chapterCode: '01', chapterName: 'Cimentacion', code: '01.01', name: 'A', baseAmount: 1_000_00n },
    });
    const l2 = await prisma.budgetLine.create({
      data: { budgetId: budget.id, chapterCode: '01', chapterName: 'Cimentacion', code: '01.02', name: 'B', baseAmount: 1_000_00n },
    });
    if (withCosts) {
      await prisma.realCost.create({
        data: { budgetLineId: l1.id, amount: 500_00n, type: RealCostType.NORMAL, description: 'c1', incurredOn: new Date('2026-06-20'), recordedById: pmUserId },
      });
      await prisma.realCost.create({
        data: { budgetLineId: l2.id, amount: 1_200_00n, type: RealCostType.NORMAL, description: 'c2', incurredOn: new Date('2026-06-20'), recordedById: pmUserId },
      });
    }
    if (approved) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { status: BudgetStatus.APPROVED, approvedAt: new Date() },
      });
    }
    return { projectId: project.id, l1Id: l1.id, l2Id: l2.id };
  }

  function getEconomics(projectId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/economics`, { headers: { Cookie: cookie } });
  }

  function patchForecast(projectId: string, lineId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}/forecast`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [pm, constructor, observer] = await Promise.all([
      prisma.user.create({ data: { email: pmEmail, displayName: 'S15 PM', passwordHash } }),
      prisma.user.create({ data: { email: constructorEmail, displayName: 'S15 Con', passwordHash } }),
      prisma.user.create({ data: { email: observerEmail, displayName: 'S15 Obs', passwordHash } }),
      prisma.user.create({ data: { email: outsiderEmail, displayName: 'S15 Out', passwordHash } }),
    ]);
    pmUserId = pm.id;
    constructorUserId = constructor.id;
    observerUserId = observer.id;

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

  // ── US1: tabla de derivados ─────────────────────────────────────────

  it('calcula vigente, previsión, desviación y alertas que cuadran', async () => {
    const { projectId } = await createScenario('CUADRE');
    const cookie = await login(constructorEmail);
    const res = await getEconomics(projectId, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ProjectEconomicsResponse;

    expect(body.budgetStatus).toBe('APPROVED');
    const lines = body.chapters[0].lines;
    const l1 = lines.find((l) => l.code === '01.01')!;
    const l2 = lines.find((l) => l.code === '01.02')!;

    // L1: coste 500 < vigente 1000 → previsión = vigente, desviación 0, normal.
    expect(l1.currentBudgetCents).toBe(1_000_00);
    expect(l1.forecastCents).toBe(1_000_00);
    expect(l1.varianceCents).toBe(0);
    expect(l1.alertLevel).toBe('normal');

    // L2: coste 1200 > vigente 1000 → previsión = coste, desviación -200 (-20%), alerta.
    expect(l2.forecastCents).toBe(1_200_00);
    expect(l2.varianceCents).toBe(-200_00);
    expect(l2.variancePercent).toBe(-20);
    expect(l2.alertLevel).toBe('alert');

    // Total: vigente 2000, previsión 2200, desviación -200 (-10%).
    expect(body.totals.currentBudgetCents).toBe(2_000_00);
    expect(body.totals.forecastCents).toBe(2_200_00);
    expect(body.totals.varianceCents).toBe(-200_00);
    expect(body.totals.variancePercent).toBe(-10);
  });

  it('partida sin costes: previsión = vigente y desviación 0', async () => {
    const { projectId } = await createScenario('NOCOST', { withCosts: false });
    const cookie = await login(constructorEmail);
    const body = (await (await getEconomics(projectId, cookie)).json()) as ProjectEconomicsResponse;
    for (const line of body.chapters[0].lines) {
      expect(line.forecastCents).toBe(line.currentBudgetCents);
      expect(line.varianceCents).toBe(0);
      expect(line.alertLevel).toBe('normal');
    }
  });

  it('un presupuesto en borrador no muestra derivados', async () => {
    const { projectId } = await createScenario('DRAFT', { approved: false });
    const cookie = await login(constructorEmail);
    const body = (await (await getEconomics(projectId, cookie)).json()) as ProjectEconomicsResponse;
    expect(body.budgetStatus).toBe('DRAFT');
    expect(body.chapters).toEqual([]);
  });

  it('un no agente no puede consultar la economía (NOT_FOUND)', async () => {
    const { projectId } = await createScenario('OUT');
    const cookie = await login(outsiderEmail);
    expect((await getEconomics(projectId, cookie)).status).toBe(404);
  });

  // ── US2: previsión manual ───────────────────────────────────────────

  it('el PM fija y elimina la previsión manual (con audit)', async () => {
    const { projectId, l1Id } = await createScenario('FORECAST');
    const cookie = await login(pmEmail);

    const setRes = await patchForecast(projectId, l1Id, cookie, { manualForecastCents: 1_500_00 });
    expect(setRes.status).toBe(200);
    const afterSet = (await setRes.json()) as ProjectEconomicsResponse;
    const l1Set = afterSet.chapters[0].lines.find((l) => l.code === '01.01')!;
    expect(l1Set.manualForecastCents).toBe(1_500_00);
    expect(l1Set.forecastCents).toBe(1_500_00);
    expect(l1Set.varianceCents).toBe(-500_00);
    expect(l1Set.alertLevel).toBe('alert');

    const clearRes = await patchForecast(projectId, l1Id, cookie, { manualForecastCents: null });
    const afterClear = (await clearRes.json()) as ProjectEconomicsResponse;
    const l1Clear = afterClear.chapters[0].lines.find((l) => l.code === '01.01')!;
    expect(l1Clear.manualForecastCents).toBeNull();
    expect(l1Clear.forecastCents).toBe(1_000_00); // vuelve a max(coste, vigente)

    const audit = await prisma.auditEvent.count({ where: { action: 'forecast.updated', projectId } });
    expect(audit).toBe(2);
  });

  it('rechaza una previsión manual <= 0 (VALIDATION_ERROR)', async () => {
    const { projectId, l1Id } = await createScenario('BADFORECAST');
    const cookie = await login(pmEmail);
    const res = await patchForecast(projectId, l1Id, cookie, { manualForecastCents: 0 });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un observador no puede fijar la previsión (FORBIDDEN)', async () => {
    const { projectId, l1Id } = await createScenario('FORECASTOBS');
    const cookie = await login(observerEmail);
    const res = await patchForecast(projectId, l1Id, cookie, { manualForecastCents: 1_500_00 });
    expect(res.status).toBe(403);
  });

  it('no permite fijar previsión si el presupuesto no está aprobado (DOMAIN_ERROR)', async () => {
    const { projectId, l1Id } = await createScenario('FORECASTDRAFT', { approved: false });
    const cookie = await login(pmEmail);
    const res = await patchForecast(projectId, l1Id, cookie, { manualForecastCents: 1_500_00 });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('DOMAIN_ERROR');
  });
});
