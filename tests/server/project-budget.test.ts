import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgentRole } from '../../src/generated/prisma/client.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import type { BudgetView, ProjectBudgetResponse } from '../../src/types/api.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's13-budget-password';
const runId = Date.now();
const codePrefix = `S13-BUDGET-${runId}`;
const pmEmail = `s13-pm-${runId}@ipd.test`;
const constructorEmail = `s13-constructor-${runId}@ipd.test`;
const outsiderEmail = `s13-outsider-${runId}@ipd.test`;

describe('presupuesto objetivo (S13)', () => {
  const prisma: DbClient = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let pmUserId: string;
  let constructorUserId: string;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: { startsWith: codePrefix } } });
    await prisma.user.deleteMany({
      where: { email: { in: [pmEmail, constructorEmail, outsiderEmail] } },
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

  async function createProject(suffix: string): Promise<string> {
    const project = await prisma.project.create({
      data: { code: `${codePrefix}-${suffix}`, name: `S13 ${suffix}`, clientName: 'IPD Test' },
    });
    await prisma.agent.createMany({
      data: [
        { userId: pmUserId, projectId: project.id, role: AgentRole.PROJECT_MANAGER, sharePercent: 0 },
        { userId: constructorUserId, projectId: project.id, role: AgentRole.CONSTRUCTOR, sharePercent: 100 },
      ],
    });
    return project.id;
  }

  function getBudget(projectId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget`, { headers: { Cookie: cookie } });
  }

  function postLine(projectId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  function patchLine(projectId: string, lineId: string, cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  function deleteLine(projectId: string, lineId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/lines/${lineId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie },
    });
  }

  function approve(projectId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/budget/approve`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
  }

  const line = {
    chapterCode: '01',
    chapterName: 'Cimentacion',
    code: '01.01',
    name: 'Excavacion',
    baseAmountCents: 100_00,
  };

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [pm, constructor] = await Promise.all([
      prisma.user.create({ data: { email: pmEmail, displayName: 'S13 PM', passwordHash } }),
      prisma.user.create({
        data: { email: constructorEmail, displayName: 'S13 Constructor', passwordHash },
      }),
      prisma.user.create({ data: { email: outsiderEmail, displayName: 'S13 Outsider', passwordHash } }),
    ]);
    pmUserId = pm.id;
    constructorUserId = constructor.id;

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

  it('devuelve estado vacio y marca gestion solo para PM', async () => {
    const projectId = await createProject('EMPTY');
    const pmCookie = await login(pmEmail);
    const constructorCookie = await login(constructorEmail);

    const pmRes = await getBudget(projectId, pmCookie);
    expect(pmRes.status).toBe(200);
    expect((await pmRes.json()) as ProjectBudgetResponse).toEqual({
      budget: null,
      canManageBudget: true,
    });

    const constructorRes = await getBudget(projectId, constructorCookie);
    expect(constructorRes.status).toBe(200);
    expect((await constructorRes.json()) as ProjectBudgetResponse).toEqual({
      budget: null,
      canManageBudget: false,
    });
  });

  it('crea borrador implicito, edita, borra y recalcula total', async () => {
    const projectId = await createProject('CRUD');
    const cookie = await login(pmEmail);

    const createdRes = await postLine(projectId, cookie, line);
    expect(createdRes.status).toBe(201);
    const created = (await createdRes.json()) as BudgetView;
    const lineId = created.chapters[0].lines[0].id;
    expect(created.status).toBe('DRAFT');
    expect(created.totalBaseAmountCents).toBe(100_00);

    const updatedRes = await patchLine(projectId, lineId, cookie, { baseAmountCents: 150_00 });
    expect(updatedRes.status).toBe(200);
    expect(((await updatedRes.json()) as BudgetView).totalBaseAmountCents).toBe(150_00);

    const deletedRes = await deleteLine(projectId, lineId, cookie);
    expect(deletedRes.status).toBe(200);
    expect(((await deletedRes.json()) as BudgetView).totalBaseAmountCents).toBe(0);
  });

  it('aprueba presupuesto valido, audita y bloquea mutaciones posteriores', async () => {
    const projectId = await createProject('APPROVE');
    const cookie = await login(pmEmail);

    const created = (await (await postLine(projectId, cookie, line)).json()) as BudgetView;
    const lineId = created.chapters[0].lines[0].id;

    const approveRes = await approve(projectId, cookie);
    expect(approveRes.status).toBe(200);
    const approved = (await approveRes.json()) as BudgetView;
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedAt).not.toBeNull();

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'budget.approved', entityId: approved.id },
    });
    expect(audit).not.toBeNull();

    expect((await postLine(projectId, cookie, { ...line, code: '01.02' })).status).toBe(422);
    expect((await patchLine(projectId, lineId, cookie, { baseAmountCents: 200_00 })).status).toBe(422);
    expect((await deleteLine(projectId, lineId, cookie)).status).toBe(422);
    expect((await approve(projectId, cookie)).status).toBe(422);

    await expect(
      prisma.budgetLine.update({ where: { id: lineId }, data: { baseAmount: 999n } }),
    ).rejects.toThrow();
  });

  it('permite duplicados en borrador pero los rechaza al aprobar', async () => {
    const projectId = await createProject('DUP');
    const cookie = await login(pmEmail);

    expect((await postLine(projectId, cookie, line)).status).toBe(201);
    expect((await postLine(projectId, cookie, { ...line, name: 'Losa' })).status).toBe(201);

    const approveRes = await approve(projectId, cookie);
    expect(approveRes.status).toBe(422);
    expect((await approveRes.json()).error.code).toBe('DOMAIN_ERROR');
  });

  it('rechaza capitulo inconsistente, mutacion no PM y consulta de no agente', async () => {
    const projectId = await createProject('PERMS');
    const pmCookie = await login(pmEmail);
    const constructorCookie = await login(constructorEmail);
    const outsiderCookie = await login(outsiderEmail);

    expect((await postLine(projectId, pmCookie, line)).status).toBe(201);
    const conflictRes = await postLine(projectId, pmCookie, {
      ...line,
      code: '01.02',
      chapterName: 'Estructura',
    });
    expect(conflictRes.status).toBe(400);
    expect((await conflictRes.json()).error.code).toBe('VALIDATION_ERROR');

    expect((await postLine(projectId, constructorCookie, { ...line, code: '02.01' })).status).toBe(403);
    expect((await getBudget(projectId, outsiderCookie)).status).toBe(404);
  });

  it('no permite mutar la linea base por carrera entre edicion y aprobacion concurrentes', async () => {
    const projectId = await createProject('RACE');
    const cookie = await login(pmEmail);
    const created = (await (await postLine(projectId, cookie, line)).json()) as BudgetView;
    const budgetId = created.id;
    const lineId = created.chapters[0].lines[0].id;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // T1: toma el lock de aprobacion (FOR UPDATE sobre Budget), deja una ventana para que
    // T2 intente mutar la linea (y se bloquee en el trigger), y entonces aprueba.
    const approveTx = prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT "id" FROM "Budget" WHERE "id" = ${budgetId} FOR UPDATE`;
        await sleep(500);
        await tx.$executeRaw`UPDATE "Budget" SET "status" = 'APPROVED', "approvedAt" = now() WHERE "id" = ${budgetId}`;
      },
      { timeout: 15_000, maxWait: 15_000 },
    );

    // T2: edita la base en paralelo. Con el lock del trigger espera a que T1 apruebe y
    // entonces aborta; sin el fix, colaria la mutacion DESPUES de la aprobacion.
    const mutateTx = sleep(100).then(() =>
      prisma.budgetLine.update({ where: { id: lineId }, data: { baseAmount: 999_00n } }),
    );

    await approveTx;
    await expect(mutateTx).rejects.toThrow();

    const finalLine = await prisma.budgetLine.findUniqueOrThrow({ where: { id: lineId } });
    expect(finalLine.baseAmount).toBe(BigInt(line.baseAmountCents));
    const finalBudget = await prisma.budget.findUniqueOrThrow({ where: { id: budgetId } });
    expect(finalBudget.status).toBe('APPROVED');
  });

  it('permite una partida cero si el total del presupuesto es mayor que cero', async () => {
    const projectId = await createProject('ZERO');
    const cookie = await login(pmEmail);

    expect((await postLine(projectId, cookie, { ...line, baseAmountCents: 0 })).status).toBe(201);
    expect(
      (
        await postLine(projectId, cookie, {
          chapterCode: '02',
          chapterName: 'Estructura',
          code: '02.01',
          name: 'Pilares',
          baseAmountCents: 1,
        })
      ).status,
    ).toBe(201);
    expect((await approve(projectId, cookie)).status).toBe(200);
  });
});
