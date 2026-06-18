# Quickstart: API skeleton (S08)

Cómo arrancar la API y verificar el contrato HTTP base (SC-001 y SC-002 de la spec). Requiere Node 22 y un `.env` con `PORT` (ver `.env.example`; por defecto `3000`).

## Arrancar el servidor

```bash
pnpm dev:server
# Equivale a: node --env-file=.env --experimental-strip-types --watch src/server/index.ts
# Log esperado: "API escuchando en http://localhost:3000"
```

## Verificar (en otra terminal)

### 1. Salud — `GET /api/health` (SC-001)

```bash
curl -s http://localhost:3000/api/health
# → {"status":"ok"}        (200, sin envoltorio)
```

### 2. Ruta inexistente → `NOT_FOUND` (SC-002)

```bash
curl -s -i http://localhost:3000/api/no-existe
# → HTTP/1.1 404 ...
# → {"error":{"code":"NOT_FOUND","message":"...","details":{}}}
```

### 3. Entrada inválida → `VALIDATION_ERROR` (SC-002)

> En S08 no hay endpoints con entrada en producción (solo `/health`). Este caso se
> cubre con el **test de integración** (`tests/server/`), que monta el middleware
> `validate()` en una app de prueba y envía un body que no cumple el esquema Zod.
> A partir de S09 (`POST /api/login`) se podrá reproducir con `curl`.

```bash
# Desde S09, ejemplo:
# curl -s -i -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{}'
# → HTTP/1.1 400 ...
# → {"error":{"code":"VALIDATION_ERROR","message":"...","details":{ ... campos ... }}}
```

### 4. Forma del error (SC-002)

Todo error de la API tiene exactamente esta forma (la garantiza el middleware de errores):

```json
{ "error": { "code": "<UNO DE §14.3>", "message": "<texto>", "details": { } } }
```

Códigos posibles (§14.3): `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404),
`VALIDATION_ERROR` (400), `DOMAIN_ERROR` (422), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## Verificación automatizada

```bash
pnpm test        # incluye tests/server/: health, NOT_FOUND y VALIDATION_ERROR + forma del error
pnpm typecheck   # cubre ahora también prisma/seed.ts
pnpm lint
```
