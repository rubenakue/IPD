import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import argon2 from 'argon2';
import { AgentRole } from '../../src/generated/prisma/client.ts';
import type { CurrentUserResponse } from '../../src/types/api.ts';
import type { SessionStore } from '../../src/server/middlewares/session.ts';
import { createTestApp, createTestPrisma, getSessionCookie, listen } from './helpers.ts';

const AUTH_TEST_PASSWORD = 's09-auth-test-password';
const runId = Date.now();
const testEmail = `s09-auth-${runId}@ipd.test`;
const testProjectCode = `S09-${runId}`;

describe('auth sessions (S09)', () => {
  const prisma = createTestPrisma();
  let server: Server;
  let sessionStore: SessionStore;
  let url: string;
  let testUserId: string;
  let testProjectId: string;
  let testAgentId: string;

  async function cleanupTestData(): Promise<void> {
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.auditEvent.deleteMany({
        where: {
          OR: [{ actorUserId: existingUser.id }, { entityId: existingUser.id }],
        },
      });
    }

    await prisma.session.deleteMany();
    await prisma.project.deleteMany({ where: { code: testProjectCode } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  }

  async function login(email: string, password: string): Promise<Response> {
    return fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }

  beforeAll(async () => {
    await cleanupTestData();

    const passwordHash = await argon2.hash(AUTH_TEST_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        displayName: 'S09 Auth Test User',
        passwordHash,
      },
    });
    const project = await prisma.project.create({
      data: {
        code: testProjectCode,
        name: 'S09 Auth Test Project',
        clientName: 'IPD Test Client',
      },
    });
    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        projectId: project.id,
        role: AgentRole.PROJECT_MANAGER,
        sharePercent: 0,
      },
    });

    testUserId = user.id;
    testProjectId = project.id;
    testAgentId = agent.id;

    const { app, store } = createTestApp(prisma);
    sessionStore = store;
    const listener = await listen(app);
    url = listener.url;
    server = listener.server;
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.auditEvent.deleteMany({
      where: {
        actorUserId: testUserId,
        action: { in: ['auth.login', 'auth.logout'] },
      },
    });
  });

  afterAll(async () => {
    server.close();
    await cleanupTestData();
    sessionStore.close();
    await prisma.$disconnect();
  });

  it('login correcto crea cookie httpOnly y permite /api/me sin reenviar contraseña', async () => {
    const loginRes = await login(testEmail.toUpperCase(), AUTH_TEST_PASSWORD);

    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get('set-cookie');
    expect(setCookie).toContain('ipd.sid=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');

    const cookie = getSessionCookie(loginRes);
    const meRes = await fetch(`${url}/api/me`, { headers: { Cookie: cookie } });

    expect(meRes.status).toBe(200);
    const body = (await meRes.json()) as CurrentUserResponse;
    expect(body.user).toEqual({
      id: testUserId,
      email: testEmail,
      displayName: 'S09 Auth Test User',
    });
    expect(body.projects).toEqual([
      {
        id: testProjectId,
        code: testProjectCode,
        name: 'S09 Auth Test Project',
        agentId: testAgentId,
        role: 'PROJECT_MANAGER',
      },
    ]);
  });

  it('/api/me no expone passwordHash ni datos económicos de Agent', async () => {
    const loginRes = await login(testEmail, AUTH_TEST_PASSWORD);
    const cookie = getSessionCookie(loginRes);

    const meRes = await fetch(`${url}/api/me`, { headers: { Cookie: cookie } });
    const serialized = JSON.stringify(await meRes.json());

    expect(meRes.status).toBe(200);
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('sharePercent');
    expect(serialized).not.toContain('guaranteedFee');
    expect(serialized).not.toContain('feeAtRisk');
  });

  it('contraseña incorrecta y email inexistente devuelven el mismo UNAUTHENTICATED', async () => {
    const wrongPasswordRes = await login(testEmail, 'wrong-password');
    const missingUserRes = await login(`missing-${testEmail}`, 'wrong-password');

    expect(wrongPasswordRes.status).toBe(401);
    expect(missingUserRes.status).toBe(401);
    expect(await wrongPasswordRes.json()).toEqual(await missingUserRes.json());
  });

  it('/api/me sin cookie devuelve UNAUTHENTICATED', async () => {
    const res = await fetch(`${url}/api/me`);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('logout destruye la sesión y la cookie deja de autenticar', async () => {
    const loginRes = await login(testEmail, AUTH_TEST_PASSWORD);
    const cookie = getSessionCookie(loginRes);

    const logoutRes = await fetch(`${url}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(200);
    expect(await logoutRes.json()).toEqual({ ok: true });

    const meRes = await fetch(`${url}/api/me`, { headers: { Cookie: cookie } });
    expect(meRes.status).toBe(401);
    const body = await meRes.json();
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('body inválido en login devuelve VALIDATION_ERROR', async () => {
    const res = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('registra auth.login y auth.logout sin datos sensibles', async () => {
    const loginRes = await login(testEmail, AUTH_TEST_PASSWORD);
    const cookie = getSessionCookie(loginRes);
    await fetch(`${url}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });

    const events = await prisma.auditEvent.findMany({
      where: {
        actorUserId: testUserId,
        action: { in: ['auth.login', 'auth.logout'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    const serialized = JSON.stringify(events);

    expect(events.map((event) => event.action)).toEqual(['auth.login', 'auth.logout']);
    expect(serialized).not.toContain(AUTH_TEST_PASSWORD);
    expect(serialized).not.toContain('passwordHash');
  });

  it('un email inexistente igualmente ejecuta argon2.verify (anti-enumeración por timing)', async () => {
    const verifySpy = vi.spyOn(argon2, 'verify');
    try {
      const res = await login(`missing-${testEmail}`, 'cualquier-password');

      expect(res.status).toBe(401);
      // Si la guarda volviera a cortocircuitar con `||`, argon2.verify NO se llamaría
      // para un email inexistente y este test fallaría.
      expect(verifySpy).toHaveBeenCalled();
    } finally {
      verifySpy.mockRestore();
    }
  });

  it('login regenera el sid (defensa anti session-fixation)', async () => {
    const first = await login(testEmail, AUTH_TEST_PASSWORD);
    const sid1 = getSessionCookie(first);

    // Reenviar la cookie anterior NO debe conservar el sid: regenerate lo rota.
    const second = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sid1 },
      body: JSON.stringify({ email: testEmail, password: AUTH_TEST_PASSWORD }),
    });
    const sid2 = getSessionCookie(second);

    expect(second.status).toBe(200);
    expect(sid2).not.toEqual(sid1);
  });

  it('logout sin sesión activa es idempotente y no audita', async () => {
    const res = await fetch(`${url}/api/auth/logout`, { method: 'POST' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const events = await prisma.auditEvent.findMany({
      where: { actorUserId: testUserId, action: 'auth.logout' },
    });
    expect(events).toEqual([]);
  });
});
