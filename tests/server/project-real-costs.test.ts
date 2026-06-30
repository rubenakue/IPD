import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgentRole, BudgetStatus } from '../../src/generated/prisma/client.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import type { BudgetLineDetailView } from '../../src/types/api.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's14-costs-password';
const runId = Date.now();
const codePrefix = `S14-COSTS-${runId}`;
const pmEmail = `s14-pm-${runId}@ipd.test`;
const constructorEmail = `s14-con-${runId}@ipd.test`;
const observerEmail = `s14-obs-${runId}@ipd.test`;
const outsiderEmail = `s14-out-${runId}@ipd.test`;

describe('costes reales, contra-asientos y avance (S14)', () => {
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

  // Crea proyecto + agentes + presupuesto con una partida. Para evitar el trigger de
  // inmutabilidad de la base (S13), inserta la línea en DRAFT y aprueba después.
  async function createLine(
    suffix: string,
    { approved = true }: { approved?: boolean } = {},
  ): Promise<{ projectId: string; lineId: string }> {
    const project = await prisma.project.create({
      data: { code: `${codePrefix}-${suffix}`, name: `S14 ${suffix}`, clientName: 'IPD Test' },
    });
    await prisma.agent.createMany({
      data: [
        { userId: pmUserId, projectId: project.id, role: AgentRole.PROJECT_MANAGER, sharePercent: 0 },
        { userId: constructorUserId, projectId: project.id, role: AgentRole.CONSTRUCTOR, sharePercent: 100 },
        { userId: observerUserId, projectId: project.id, role: AgentRole.OBSERVER, sharePercent: 0 },
      ],
    });
    const budget = await prisma.budget.create({ data: { projectId: project.id } });
    const line = await prisma.budgetLine.create({
      data: {
        budgetId: budget.id,
        chapterCode: '01',
        chapterName: 'Cimentacion',
        code: '01.01',
        name: 'Excavacion',
        baseAmount: 1_000_00n,
      },
    });
    if (approved) {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { status: BudgetStatus.APPROVED, approvedAt: new Date() },
      });
    }
    return { projectId: project.id, lineId: line.id };
  }

  function getDetail(projectId: string, lineId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}`, {
      headers: { Cookie: cookie },
    });
  }

  function postCost(projectId: string, lineId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  function reverseCost(projectId: string, costId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/costs/${costId}/reversal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  function patchProgress(projectId: string, lineId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  const cost = { amountCents: 150_00, incurredOn: '2026-06-20', description: 'Factura hormigon' };

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [pm, constructor, observer] = await Promise.all([
      prisma.user.create({ data: { email: pmEmail, displayName: 'S14 PM', passwordHash } }),
      prisma.user.create({ data: { email: constructorEmail, displayName: 'S14 Con', passwordHash } }),
      prisma.user.create({ data: { email: observerEmail, displayName: 'S14 Obs', passwordHash } }),
      prisma.user.create({ data: { email: outsiderEmail, displayName: 'S14 Out', passwordHash } }),
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

  // ── US1: imputar coste ──────────────────────────────────────────────

  it('el constructor imputa costes y el acumulado es la suma (con audit)', async () => {
    const { projectId, lineId } = await createLine('IMPUTE');
    const cookie = await login(constructorEmail);

    const first = await postCost(projectId, lineId, cookie, cost);
    expect(first.status).toBe(201);
    const afterFirst = (await first.json()) as BudgetLineDetailView;
    expect(afterFirst.accumulatedCostCents).toBe(150_00);

    const second = (await (
      await postCost(projectId, lineId, cookie, { ...cost, amountCents: 100_00 })
    ).json()) as BudgetLineDetailView;
    expect(second.accumulatedCostCents).toBe(250_00);
    expect(second.costs).toHaveLength(2);

    const audit = await prisma.auditEvent.count({ where: { action: 'realCost.created', projectId } });
    expect(audit).toBe(2);
  });

  it('rechaza un importe <= 0 (VALIDATION_ERROR)', async () => {
    const { projectId, lineId } = await createLine('NONPOS');
    const cookie = await login(constructorEmail);
    const res = await postCost(projectId, lineId, cookie, { ...cost, amountCents: 0 });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza una fecha inexistente aunque tenga formato YYYY-MM-DD (VALIDATION_ERROR)', async () => {
    const { projectId, lineId } = await createLine('BADDATE');
    const cookie = await login(constructorEmail);
    const res = await postCost(projectId, lineId, cookie, { ...cost, incurredOn: '2026-02-31' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un observador no puede imputar (FORBIDDEN)', async () => {
    const { projectId, lineId } = await createLine('OBS');
    const cookie = await login(observerEmail);
    const res = await postCost(projectId, lineId, cookie, cost);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
  });

  it('no permite imputar si el presupuesto no esta aprobado (DOMAIN_ERROR)', async () => {
    const { projectId, lineId } = await createLine('DRAFT', { approved: false });
    const cookie = await login(constructorEmail);
    const res = await postCost(projectId, lineId, cookie, cost);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('DOMAIN_ERROR');
  });

  it('un no agente no ve el detalle de la partida (NOT_FOUND)', async () => {
    const { projectId, lineId } = await createLine('OUT');
    const cookie = await login(outsiderEmail);
    expect((await getDetail(projectId, lineId, cookie)).status).toBe(404);
  });

  it('un coste real es inmutable: no se puede editar (el trigger bloquea el UPDATE)', async () => {
    const { projectId, lineId } = await createLine('IMMUT');
    const cookie = await login(constructorEmail);
    const created = (await (await postCost(projectId, lineId, cookie, cost)).json()) as BudgetLineDetailView;
    const costId = created.costs[0].id;

    // La edición de un asiento se bloquea a nivel BBDD. El borrado individual no se expone por
    // la API (cubierto por RLS); el borrado en cascada del proyecto sí es legítimo (cleanup).
    await expect(
      prisma.realCost.update({ where: { id: costId }, data: { amount: 1n } }),
    ).rejects.toThrow();
  });

  // ── US2: avance físico ──────────────────────────────────────────────

  it('registra el avance y lo sustituye (40 -> 60), con audit', async () => {
    const { projectId, lineId } = await createLine('PROG');
    const cookie = await login(constructorEmail);

    expect((await patchProgress(projectId, lineId, cookie, { progressPercent: 40 })).status).toBe(200);
    const after = (await (
      await patchProgress(projectId, lineId, cookie, { progressPercent: 60 })
    ).json()) as BudgetLineDetailView;
    expect(after.progressPercent).toBe(60);
    expect(after.progressUpdatedAt).not.toBeNull();

    const audit = await prisma.auditEvent.count({ where: { action: 'progress.updated', projectId } });
    expect(audit).toBe(2);
  });

  it('rechaza un avance fuera de 0-100 (VALIDATION_ERROR)', async () => {
    const { projectId, lineId } = await createLine('PROGBAD');
    const cookie = await login(constructorEmail);
    expect((await patchProgress(projectId, lineId, cookie, { progressPercent: 150 })).status).toBe(400);
  });

  it('imputar un coste no cambia el avance fisico (§8.7)', async () => {
    const { projectId, lineId } = await createLine('PROGINDEP');
    const cookie = await login(constructorEmail);
    await patchProgress(projectId, lineId, cookie, { progressPercent: 30 });
    const detail = (await (await postCost(projectId, lineId, cookie, cost)).json()) as BudgetLineDetailView;
    expect(detail.progressPercent).toBe(30);
  });

  // ── US3: anular con contra-asiento ──────────────────────────────────

  it('el PM anula un coste: original intacto, acumulado vuelve al previo', async () => {
    const { projectId, lineId } = await createLine('VOID');
    const conCookie = await login(constructorEmail);
    const pmCookie = await login(pmEmail);

    const created = (await (await postCost(projectId, lineId, conCookie, cost)).json()) as BudgetLineDetailView;
    await postCost(projectId, lineId, conCookie, { ...cost, amountCents: 100_00 });
    const costId = created.costs[0].id;

    const res = await reverseCost(projectId, costId, pmCookie, { reason: 'Importe erroneo' });
    expect(res.status).toBe(201);
    const after = (await res.json()) as BudgetLineDetailView;
    expect(after.accumulatedCostCents).toBe(100_00); // 150 anulado, queda 100
    const original = after.costs.find((c) => c.id === costId);
    expect(original?.voided).toBe(true);
    const reversal = after.costs.find((c) => c.type === 'REVERSAL');
    expect(reversal?.amountCents).toBe(-150_00);
    expect(reversal?.reversalOfId).toBe(costId);

    const audit = await prisma.auditEvent.count({ where: { action: 'realCost.voided', projectId } });
    expect(audit).toBe(1);
  });

  it('rechaza anular sin motivo (VALIDATION_ERROR)', async () => {
    const { projectId, lineId } = await createLine('VOIDNOREASON');
    const conCookie = await login(constructorEmail);
    const pmCookie = await login(pmEmail);
    const created = (await (await postCost(projectId, lineId, conCookie, cost)).json()) as BudgetLineDetailView;
    const res = await reverseCost(projectId, created.costs[0].id, pmCookie, { reason: '  ' });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('no permite anular dos veces el mismo coste (CONFLICT)', async () => {
    const { projectId, lineId } = await createLine('VOIDTWICE');
    const conCookie = await login(constructorEmail);
    const pmCookie = await login(pmEmail);
    const created = (await (await postCost(projectId, lineId, conCookie, cost)).json()) as BudgetLineDetailView;
    const costId = created.costs[0].id;
    expect((await reverseCost(projectId, costId, pmCookie, { reason: 'una' })).status).toBe(201);
    const res = await reverseCost(projectId, costId, pmCookie, { reason: 'otra' });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CONFLICT');
  });

  it('no permite anular un contra-asiento (CONFLICT)', async () => {
    const { projectId, lineId } = await createLine('VOIDREV');
    const conCookie = await login(constructorEmail);
    const pmCookie = await login(pmEmail);
    const created = (await (await postCost(projectId, lineId, conCookie, cost)).json()) as BudgetLineDetailView;
    const afterVoid = (await (
      await reverseCost(projectId, created.costs[0].id, pmCookie, { reason: 'motivo' })
    ).json()) as BudgetLineDetailView;
    const reversalId = afterVoid.costs.find((c) => c.type === 'REVERSAL')?.id;
    const res = await reverseCost(projectId, reversalId ?? '', pmCookie, { reason: 'sobre el reversal' });
    expect(res.status).toBe(409);
  });

  it('un constructor no puede anular costes (FORBIDDEN)', async () => {
    const { projectId, lineId } = await createLine('VOIDCON');
    const conCookie = await login(constructorEmail);
    const created = (await (await postCost(projectId, lineId, conCookie, cost)).json()) as BudgetLineDetailView;
    const res = await reverseCost(projectId, created.costs[0].id, conCookie, { reason: 'no deberia' });
    expect(res.status).toBe(403);
  });
});
