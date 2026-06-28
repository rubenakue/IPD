import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AgentRole } from '../../src/generated/prisma/client.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import type { AgentView, ProjectAgentsResponse } from '../../src/types/api.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's12-agents-password';
const runId = Date.now();
const projectCode = `S12-AGENTS-${runId}`;
const pmEmail = `s12-pm-${runId}@ipd.test`;
const constructorAEmail = `s12-ca-${runId}@ipd.test`;
const constructorBEmail = `s12-cb-${runId}@ipd.test`;
const designerEmail = `s12-de-${runId}@ipd.test`;

describe('configurar agentes (S12 / US2)', () => {
  const prisma: DbClient = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let projectId: string;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: projectCode } });
    await prisma.user.deleteMany({
      where: { email: { in: [pmEmail, constructorAEmail, constructorBEmail, designerEmail] } },
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

  function postAgent(cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  function getAgents(cookie: string): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/agents`, { headers: { Cookie: cookie } });
  }

  function patchAgent(cookie: string, agentId: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects/${projectId}/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const [pm, constructorA] = await Promise.all([
      prisma.user.create({ data: { email: pmEmail, displayName: 'S12 PM', passwordHash } }),
      prisma.user.create({ data: { email: constructorAEmail, displayName: 'S12 ConsA', passwordHash } }),
      prisma.user.create({ data: { email: constructorBEmail, displayName: 'S12 ConsB', passwordHash } }),
      prisma.user.create({ data: { email: designerEmail, displayName: 'S12 Designer', passwordHash } }),
    ]);

    const project = await prisma.project.create({
      data: { code: projectCode, name: 'S12 Agents', clientName: 'IPD Test Client' },
    });
    projectId = project.id;

    await prisma.agent.createMany({
      data: [
        { userId: pm.id, projectId, role: AgentRole.PROJECT_MANAGER, sharePercent: 0 },
        { userId: constructorA.id, projectId, role: AgentRole.CONSTRUCTOR, sharePercent: 58 },
      ],
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
    await cleanup();
    sessionStore.close();
    await prisma.$disconnect();
  });

  it('el PM añade un agente por email existente (con audit agent.added)', async () => {
    const cookie = await login(pmEmail);
    const res = await postAgent(cookie, {
      email: designerEmail,
      role: 'DESIGNER',
      sharePercent: 9,
      guaranteedFeeCents: 1_800_000,
      feeAtRiskCents: 1_000_000,
    });
    expect(res.status).toBe(201);
    const agent = (await res.json()) as AgentView;
    expect(agent).toMatchObject({ email: designerEmail, role: 'DESIGNER', sharePercent: 9 });

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'agent.added', entityId: agent.id },
    });
    expect(audit).not.toBeNull();
  });

  it('rechaza un email que no corresponde a ningún usuario (VALIDATION_ERROR)', async () => {
    const cookie = await login(pmEmail);
    const res = await postAgent(cookie, {
      email: `noexiste-${runId}@ipd.test`,
      role: 'OBSERVER',
      sharePercent: 0,
      guaranteedFeeCents: 0,
      feeAtRiskCents: 0,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('un agente que no es PM no puede añadir agentes (FORBIDDEN, verificado en servidor)', async () => {
    const cookie = await login(constructorAEmail);
    const res = await postAgent(cookie, {
      email: constructorBEmail,
      role: 'CONSTRUCTOR',
      sharePercent: 0,
      guaranteedFeeCents: 0,
      feeAtRiskCents: 0,
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('FORBIDDEN');
  });

  it('impide duplicar el mismo usuario como agente (CONFLICT)', async () => {
    const cookie = await login(pmEmail);
    const res = await postAgent(cookie, {
      email: constructorAEmail, // ya es agente
      role: 'CONSTRUCTOR',
      sharePercent: 0,
      guaranteedFeeCents: 0,
      feeAtRiskCents: 0,
    });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('CONFLICT');
  });

  it('permite varios agentes con el mismo rol', async () => {
    const cookie = await login(pmEmail);
    const res = await postAgent(cookie, {
      email: constructorBEmail, // segundo CONSTRUCTOR
      role: 'CONSTRUCTOR',
      sharePercent: 0,
      guaranteedFeeCents: 0,
      feeAtRiskCents: 0,
    });
    expect(res.status).toBe(201);
  });

  it('rechaza un porcentaje fuera de rango (VALIDATION_ERROR)', async () => {
    const cookie = await login(pmEmail);
    const res = await postAgent(cookie, {
      email: designerEmail,
      role: 'DESIGNER',
      sharePercent: 150,
      guaranteedFeeCents: 0,
      feeAtRiskCents: 0,
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('lista los agentes con la suma de reparto', async () => {
    const cookie = await login(pmEmail);
    const res = await getAgents(cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ProjectAgentsResponse;
    expect(body.agents.length).toBeGreaterThanOrEqual(2);
    expect(typeof body.shareSum).toBe('number');
    expect(body.isComplete).toBe(body.shareSum === 100);
  });

  it('rechaza degradar al único Project Manager (DOMAIN_ERROR)', async () => {
    const cookie = await login(pmEmail);
    const list = (await (await getAgents(cookie)).json()) as ProjectAgentsResponse;
    const pmAgent = list.agents.find((a) => a.role === 'PROJECT_MANAGER');
    if (!pmAgent) throw new Error('No se encontró el agente PM en el proyecto de prueba.');

    const res = await patchAgent(cookie, pmAgent.id, { role: 'OBSERVER' });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('DOMAIN_ERROR');
  });

  it('rechaza un PATCH de agente sin ningún campo (VALIDATION_ERROR)', async () => {
    const cookie = await login(pmEmail);
    const list = (await (await getAgents(cookie)).json()) as ProjectAgentsResponse;
    const someAgent = list.agents[0];

    const res = await patchAgent(cookie, someAgent.id, {});
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
