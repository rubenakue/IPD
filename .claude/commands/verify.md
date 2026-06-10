---
description: Verificación completa del repo (tipos, lint, tests, secretos, dependencias) con informe final
allowed-tools: Bash, Read, Grep, Glob
---

Ejecuta la verificación completa, fase a fase. NO arregles nada todavía: primero el informe.

1. `pnpm typecheck`
2. `pnpm lint` — si el script no existe aún en package.json, marca la fase como N/A.
3. `pnpm test` — si el script no existe aún, marca N/A.
4. Secretos: busca con Grep patrones de API keys/tokens/passwords en el diff actual y archivos nuevos.
5. `pnpm audit --prod` — reporta solo HIGH/CRITICAL.

Informe final: tabla fase → PASA/FALLA/N-A → detalle (1 línea). Después pregúntame
si quiero que arregles los fallos, en qué orden propones, y procede solo tras mi OK.

$ARGUMENTS
