# ADR-003: Arquitectura de estado en el frontend

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

Había que decidir cómo gestiona el frontend sus dos tipos de estado: los datos del servidor (proyectos, presupuestos, costes, FRC — la fuente de verdad es PostgreSQL) y el estado de interfaz (modales, filtros, selección). El dashboard exige que tras imputar un coste el estado del FRC se refresque "en tiempo real". El briefing desaconseja Redux explícitamente.

## Opciones consideradas

- **TanStack Query + estado nativo de React (elegida):** TanStack Query gestiona la copia local de los datos del servidor (caché, refresco, reintentos, invalidación tras mutaciones); el estado de interfaz se cubre con `useState`/`useContext`. Inconvenientes: una librería más que aprender; conceptos propios (query keys, invalidación).
- **Añadir Zustand desde el inicio:** almacén global minimalista para estado de UI. Innecesario hasta que exista una necesidad real compartida entre pantallas; puede añadirse después sin coste de migración.
- **Fetch a mano con `useEffect`:** sin dependencias, formativo una vez, pero reimplementa mal (caché, carreras, reintentos) lo que TanStack Query resuelve bien.
- **Redux Toolkit:** descartado por recomendación explícita del briefing; complejidad sin retorno en un prototipo.

## Decisión

TanStack Query para todo dato que venga de la API REST; estado nativo de React (`useState`, contexto) para la interfaz. Zustand queda en reserva: solo se añadirá (con su propuesta de dependencia) si aparece estado global de UI real.

## Consecuencias

- **Positivas:** el refresco del dashboard sale del patrón estándar de TanStack Query (imputar coste → invalidar consultas de presupuesto y FRC → la UI se actualiza sola); separación limpia entre datos del servidor y estado de UI; sin almacén global que mantener.
- **Negativas:** curva propia de TanStack Query (query keys, invalidación, estados de carga); los tipos compartidos con la API se mantienen a mano vía `src/types/domain.ts` (decisión REST del ADR-004).
- **Pendiente:** convenciones de query keys y colocación de hooks (`src/hooks/`) cuando se haga la primera spec de pantalla.

## TODO (comandos exactos, los ejecuta Rubén o el rol que implemente)

```bash
pnpm add @tanstack/react-query
```
