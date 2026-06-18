# IPD

Prototipo de plataforma de gestión de proyectos de construcción con metodología IPD (Integrated Project Delivery).

> Proyecto en desarrollo. Las decisiones de stack y arquitectura se documentan en `docs/adr/`.

## Requisitos

- Node.js 22+ (el seed usa el runner nativo de TypeScript, `--experimental-strip-types`, disponible desde Node 22)
- pnpm
- Docker (para PostgreSQL en desarrollo)

## Scripts

- `pnpm install` — instala dependencias
- `pnpm typecheck` — comprueba los tipos con TypeScript
- `pnpm lint` — ESLint
- `pnpm test` — tests (Vitest)
- `pnpm db:seed` — siembra datos de demo (ver más abajo)

## Base de datos (desarrollo)

1. **Arranca PostgreSQL en Docker** (ver ADR-001):

   ```bash
   docker run --name ipd-postgres -e POSTGRES_PASSWORD=<tu-password> -e POSTGRES_DB=ipd -p 5432:5432 -d postgres:17
   ```

2. **Configura la conexión**: copia `.env.example` a `.env` y ajusta `DATABASE_URL` con tu contraseña. El `.env` no se versiona.

3. **Aplica el esquema y siembra los datos de demo**:

   ```bash
   npx prisma migrate dev   # crea/aplica las migraciones
   pnpm db:seed             # crea los usuarios y el proyecto de demo
   npx prisma studio        # (opcional) inspeccionar la base de datos
   ```

### Cuentas de demo

El seed crea un usuario por cada rol del dominio, todos con la misma contraseña de **demo** (no es un secreto: solo para desarrollo local):

| Email | Rol | Contraseña |
|---|---|---|
| `promotor@ipd.demo` | Promotor | `ipd-demo-2026` |
| `constructor@ipd.demo` | Constructor | `ipd-demo-2026` |
| `proyectista@ipd.demo` | Proyectista | `ipd-demo-2026` |
| `pm@ipd.demo` | Project Manager | `ipd-demo-2026` |
| `observador@ipd.demo` | Observador | `ipd-demo-2026` |

Además del proyecto de demo `DEMO-001` con sus 4 fases y un agente por rol.

## Documentación

- `Doc inicial/` — briefing y documentación de dominio (solo local, no está en git)
- `docs/` — ADRs, diario de desarrollo y retrospectivas
- `docs/plan-sdd-tdd.md` — cómo se trabaja aquí: SDD (Spec Kit) + TDD + roles especializados
- `specs/` — especificaciones por feature (Spec Kit)
- `AGENTS.md` — contexto canónico para agentes de IA (Claude Code lo carga vía `CLAUDE.md`)
