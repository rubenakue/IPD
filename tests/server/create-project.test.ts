import type { Server } from 'node:http';
import argon2 from 'argon2';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PhaseName } from '../../src/generated/prisma/client.ts';
import type { CreateProjectResponse } from '../../src/types/api.ts';
import type { DbClient } from '../../src/lib/db/client.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const TEST_PASSWORD = 's12-create-project-password';
const runId = Date.now();
const creatorEmail = `s12-creator-${runId}@ipd.test`;
const projectCode = `S12-CREATE-${runId}`;

describe('crear proyecto (S12 / US1)', () => {
  const prisma: DbClient = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let creatorUserId: string;

  async function cleanup(): Promise<void> {
    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: { startsWith: `S12-CREATE-${runId}` } } });
    await prisma.user.deleteMany({ where: { email: creatorEmail } });
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

  function createProjectReq(cookie: string, body: unknown): Promise<Response> {
    return fetch(`${url}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  }

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await argon2.hash(TEST_PASSWORD);
    const creator = await prisma.user.create({
      data: { email: creatorEmail, displayName: 'S12 Creator', passwordHash },
    });
    creatorUserId = creator.id;

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

  it('crea el proyecto, deja al creador como PM y genera las 4 fases (Validación activa)', async () => {
    const cookie = await login(creatorEmail);
    const res = await createProjectReq(cookie, {
      name: 'Hotel Azahar 2',
      code: projectCode,
      clientName: 'Promotora Levante',
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as CreateProjectResponse;
    expect(body.role).toBe('PROJECT_MANAGER');
    expect(body.code).toBe(projectCode);

    // Verificación directa en BD (sin RLS): 4 fases, Validación activa, Agent PM, audit.
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: body.id },
      include: { phases: true, agents: true, activePhase: true },
    });
    expect(project.phases).toHaveLength(4);
    expect(project.activePhase?.name).toBe(PhaseName.VALIDATION);
    expect(project.agents).toHaveLength(1);
    expect(project.agents[0]).toMatchObject({ userId: creatorUserId, role: 'PROJECT_MANAGER' });

    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'project.created', entityId: body.id },
    });
    expect(audit).not.toBeNull();
  });

  it('rechaza un código de proyecto duplicado con CONFLICT', async () => {
    const cookie = await login(creatorEmail);
    const res = await createProjectReq(cookie, {
      name: 'Otro',
      code: projectCode, // ya creado en el test anterior
      clientName: 'Cliente',
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('CONFLICT');
  });

  it('rechaza datos inválidos (nombre vacío) con VALIDATION_ERROR', async () => {
    const cookie = await login(creatorEmail);
    const res = await createProjectReq(cookie, {
      name: '',
      code: `${projectCode}-X`,
      clientName: 'Cliente',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige sesión: sin cookie responde 401', async () => {
    const res = await createProjectReq('', {
      name: 'Sin sesión',
      code: `${projectCode}-Y`,
      clientName: 'Cliente',
    });
    expect(res.status).toBe(401);
  });
});
