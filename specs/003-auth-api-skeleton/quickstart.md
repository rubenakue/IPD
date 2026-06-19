# Quickstart: API auth + sessions (S08-S09)

Cómo arrancar la API y verificar el contrato HTTP base (S08) y el login real con sesión en PostgreSQL (S09). Requiere Node 22, PostgreSQL levantado y `.env` creado desde `.env.example`.

## Preparar entorno

```bash
pnpm install
npx prisma migrate deploy
pnpm db:seed
```

El `.env` local debe tener:

```bash
DATABASE_URL="postgresql://postgres:...@localhost:5432/ipd?schema=public"
PORT=3000
NODE_ENV=development
SESSION_SECRET="un-secreto-local-de-al-menos-32-caracteres"
```

## Arrancar el servidor

```bash
pnpm dev:server
# Equivale a: node --env-file=.env --experimental-strip-types --watch src/server/index.ts
# Log esperado: "[api] escuchando en http://localhost:3000"
```

## Verificar API base

```bash
curl -s http://localhost:3000/api/health
# -> {"status":"ok"}
```

```bash
curl -s -i http://localhost:3000/api/no-existe
# -> HTTP/1.1 404 ...
# -> {"error":{"code":"NOT_FOUND","message":"...","details":{}}}
```

## Verificar login, sesión y logout

### 1. Login correcto crea cookie

```bash
curl -s -i -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"pm@ipd.demo\",\"password\":\"ipd-demo-2026\"}"
```

Resultado esperado:

- HTTP 200.
- Cabecera `Set-Cookie` con `ipd.sid` y `HttpOnly`.
- JSON con `user` y `projects`.

### 2. La cookie autentica `/api/me`

```bash
curl -s -b cookies.txt http://localhost:3000/api/me
# -> {"user":{"id":"...","email":"pm@ipd.demo","displayName":"..."},"projects":[...]}
```

### 3. Credenciales inválidas no filtran si el email existe

```bash
curl -s -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"pm@ipd.demo\",\"password\":\"mal\"}"
# -> HTTP/1.1 401 ...
# -> {"error":{"code":"UNAUTHENTICATED","message":"Email o contraseña incorrectos.","details":{}}}
```

### 4. Logout invalida la sesión

```bash
curl -s -i -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout
# -> HTTP/1.1 200 ...
# -> {"ok":true}
```

```bash
curl -s -i -b cookies.txt http://localhost:3000/api/me
# -> HTTP/1.1 401 ...
# -> {"error":{"code":"UNAUTHENTICATED","message":"No has iniciado sesión.","details":{}}}
```

## Verificación automatizada

```bash
npx prisma migrate status
pnpm typecheck
pnpm lint
pnpm test
```