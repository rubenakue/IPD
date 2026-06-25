import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import argon2 from 'argon2';
import { AgentRole } from '../../src/generated/prisma/client.ts';
import type { PromoterPrivateCostsResponse } from '../../src/types/api.ts';
import { withRlsContext } from '../../src/server/db/rls.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import { getPromoterPrivateCosts } from '../../src/server/projects/promoter-private-costs.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's10-permissions-test-password';
const runId = Date.now();
const projectCodeA = `S10-A-${runId}`;
const projectCodeB = `S10-B-${runId}`;
const pmEmail = `s10-pm-${runId}@ipd.test`;
const constructorEmail = `s10-constructor-${runId}@ipd.test`;
const multiRoleEmail = `s10-multirole-${runId}@ipd.test`;
const outsiderEmail = `s10-outsider-${runId}@ipd.test`;

describe('project permissions and RLS (S10)', () => {
  const prisma = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let projectAId: string;
  let projectBId: string;
  let constructorUserId: string;
  let pmUserId: string;
  let outsiderUserId: string;

  async function cleanupTestData(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({
      where: { code: { in: [projectCodeA, projectCodeB] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [pmEmail, constructorEmail, multiRoleEmail, outsiderEmail] } },
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

  async function getPrivateCosts(projectId: string, cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/promoter-private-costs`, {
      headers: { Cookie: cookie },
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [pm, constructor, multiRole, outsider] = await Promise.all([
      prisma.user.create({
        data: { email: pmEmail, displayName: 'S10 PM', passwordHash },
      }),
      prisma.user.create({
        data: { email: constructorEmail, displayName: 'S10 Constructor', passwordHash },
      }),
      prisma.user.create({
        data: { email: multiRoleEmail, displayName: 'S10 Multi Role', passwordHash },
      }),
      prisma.user.create({
        data: { email: outsiderEmail, displayName: 'S10 Outsider', passwordHash },
      }),
    ]);

    constructorUserId = constructor.id;
    pmUserId = pm.id;
    outsiderUserId = outsider.id;

    const [projectA, projectB] = await Promise.all([
      prisma.project.create({
        data: { code: projectCodeA, name: 'S10 Project A', clientName: 'IPD Test Client' },
      }),
      prisma.project.create({
        data: { code: projectCodeB, name: 'S10 Project B', clientName: 'IPD Test Client' },
      }),
    ]);

    projectAId = projectA.id;
    projectBId = projectB.id;

    await prisma.agent.createMany({
      data: [
        {
          userId: pm.id,
          projectId: projectA.id,
          role: AgentRole.PROJECT_MANAGER,
          sharePercent: 0,
        },
        {
          userId: constructor.id,
          projectId: projectA.id,
          role: AgentRole.CONSTRUCTOR,
          sharePercent: 58,
        },
        {
          userId: multiRole.id,
          projectId: projectA.id,
          role: AgentRole.PROJECT_MANAGER,
          sharePercent: 0,
        },
        {
          userId: pm.id,
          projectId: projectB.id,
          role: AgentRole.PROJECT_MANAGER,
          sharePercent: 0,
        },
        {
          userId: multiRole.id,
          projectId: projectB.id,
          role: AgentRole.OBSERVER,
          sharePercent: 0,
        },
      ],
    });

    await withRlsContext(prisma, { userId: pm.id, projectId: projectA.id }, async (tx) => {
      await tx.promoterPrivateCost.create({
        data: {
          projectId: projectA.id,
          label: 'Suelo privado promocion',
          amount: 125_000_00n,
        },
      });
    });
    await withRlsContext(prisma, { userId: pm.id, projectId: projectB.id }, async (tx) => {
      await tx.promoterPrivateCost.create({
        data: {
          projectId: projectB.id,
          label: 'Financiacion privada promocion',
          amount: 50_000_00n,
        },
      });
    });

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
    await cleanupTestData();
    sessionStore.close();
    await prisma.$disconnect();
  });

  it('la API devuelve FORBIDDEN al Constructor y no incluye costes privados del promotor', async () => {
    const constructorCookie = await login(constructorEmail);

    const res = await getPrivateCosts(projectAId, constructorCookie);

    expect(res.status).toBe(403);
    const serialized = JSON.stringify(await res.json());
    expect(serialized).toContain('FORBIDDEN');
    expect(serialized).not.toContain('Suelo privado promocion');
    expect(serialized).not.toContain('12500000');
  });

  it('la API devuelve costes privados al PM del proyecto', async () => {
    const pmCookie = await login(pmEmail);

    const res = await getPrivateCosts(projectAId, pmCookie);

    expect(res.status).toBe(200);
    const body = (await res.json()) as PromoterPrivateCostsResponse;
    expect(body.costs).toEqual([
      expect.objectContaining({
        projectId: projectAId,
        label: 'Suelo privado promocion',
        amountCents: 125_000_00,
      }),
    ]);
  });

  it('RLS bloquea la lectura directa de costes privados bajo contexto Constructor', async () => {
    const body = await withRlsContext(
      prisma,
      { userId: constructorUserId, projectId: projectAId },
      (tx) => getPromoterPrivateCosts(tx, projectAId),
    );

    expect(body.costs).toEqual([]);
  });

  it('la RLS aísla por proyecto en el resto de tablas: un extraño no ve filas vía contexto', async () => {
    // Un usuario sin Agent en ningún proyecto no debe ver ninguna fila de `Agent`.
    const outsiderAgents = await withRlsContext(
      prisma,
      { userId: outsiderUserId, projectId: projectAId },
      (tx) => tx.agent.findMany(),
    );
    expect(outsiderAgents).toEqual([]);

    // Un participante solo ve filas de SUS proyectos (A y B), nunca de otros.
    const pmAgents = await withRlsContext(
      prisma,
      { userId: pmUserId, projectId: projectAId },
      (tx) => tx.agent.findMany(),
    );
    expect(pmAgents.length).toBeGreaterThan(0);
    expect(pmAgents.every((agent) => agent.projectId === projectAId || agent.projectId === projectBId)).toBe(true);
  });

  it('un usuario con roles distintos recibe permisos por proyecto, no globales', async () => {
    const multiRoleCookie = await login(multiRoleEmail);

    const projectARes = await getPrivateCosts(projectAId, multiRoleCookie);
    expect(projectARes.status).toBe(200);

    const projectBRes = await getPrivateCosts(projectBId, multiRoleCookie);
    expect(projectBRes.status).toBe(403);
  });

  it('un usuario autenticado sin Agent en el proyecto recibe NOT_FOUND', async () => {
    const outsiderCookie = await login(outsiderEmail);

    const res = await getPrivateCosts(projectAId, outsiderCookie);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
