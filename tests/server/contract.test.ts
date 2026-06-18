// Test de integración del contrato HTTP base (US4 de specs/003-auth-api-skeleton).
// Red de regresión de SC-001 y SC-002: salud, NOT_FOUND, VALIDATION_ERROR y la
// forma del error §14.3. Usa `fetch` nativo (Node 22) contra un listener en puerto
// efímero (app.listen(0)); sin `supertest` (el proyecto evita deps con alternativa nativa).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { z } from 'zod';
import { createApp } from '../../src/server/app';
import { validate } from '../../src/server/middlewares/validate';
import { errorHandler } from '../../src/server/middlewares/error-handler';
import { createTestPrisma, listen, testConfig } from './helpers';

describe('contrato HTTP base (§14.3)', () => {
  let real: { url: string; server: Server };
  let probe: { url: string; server: Server };
  const prisma = createTestPrisma();

  beforeAll(async () => {
    // App real del servidor: health + not-found + error handler.
    real = await listen(createApp({ config: testConfig, prisma }));

    // App de prueba SOLO para ejercitar validate() (en S08 no hay endpoints con
    // entrada en producción). Reusa el mismo middleware de errores.
    const app = express();
    app.use(express.json());
    app.post('/echo', validate({ body: z.object({ name: z.string() }) }), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
    probe = await listen(app);
  });

  afterAll(() => {
    real.server.close();
    probe.server.close();
    void prisma.$disconnect();
  });

  it('GET /api/health responde 200 { status: "ok" } sin envoltorio', async () => {
    const res = await fetch(`${real.url}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('una ruta inexistente responde 404 NOT_FOUND con el formato estándar', async () => {
    const res = await fetch(`${real.url}/api/no-existe`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(typeof body.error.message).toBe('string');
    expect(body.error.details).toEqual({});
  });

  it('una entrada inválida responde 400 VALIDATION_ERROR con detalle', async () => {
    const res = await fetch(`${probe.url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // falta `name`
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details.issues)).toBe(true);
  });

  it('un cuerpo JSON mal formado responde 400 VALIDATION_ERROR (no 500)', async () => {
    const res = await fetch(`${probe.url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ "name": ', // JSON sintácticamente inválido → error de body-parser
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('toda respuesta de error tiene la forma { error: { code, message, details } }', async () => {
    const res = await fetch(`${real.url}/algo/que/no/existe`);
    const body = await res.json();
    expect(body).toHaveProperty('error.code');
    expect(body).toHaveProperty('error.message');
    expect(body).toHaveProperty('error.details');
  });
});