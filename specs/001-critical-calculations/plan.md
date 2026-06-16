# Implementation Plan: Cálculos económicos críticos (FRC, EVM, motor de cambios)

**Branch**: `001-critical-calculations` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-critical-calculations/spec.md`

## Summary

Implementar las tres funciones puras de cálculo del dominio económico —`calculateFRC`, `calculateEVM`, `applyChange`— en `src/lib/calculations/`, con sus tipos en `src/types/domain.ts`, siguiendo TDD estricto (tests primero, en rojo, luego verde). Sin I/O, sin base de datos, sin red: reciben datos y devuelven resultados deterministas. Esta feature es el cimiento testeable sobre el que se montarán después la persistencia (Prisma) y la API (Express).

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), Node 20+, ESM.

**Primary Dependencies**: ninguna en runtime — son funciones puras. Solo dependencia de desarrollo: Vitest (ADR-008), que la monta la sesión S2 (`/tdd-harness`).

**Storage**: N/A. Estos cálculos no leen ni escriben. Los importes son céntimos enteros (`number`); la persistencia como `BIGINT` es de otra feature (S7).

**Testing**: Vitest. Tests unitarios en `tests/` cubriendo todos los escenarios de aceptación de la spec.

**Target Platform**: motor compartido por backend (Node) y, si hace falta, frontend (navegador). Por eso no puede acoplarse a ninguno.

**Project Type**: librería de dominio dentro del monorepo (single project).

**Performance Goals**: irrelevante a esta escala (operan sobre decenas/cientos de partidas y un puñado de agentes); la prioridad es exactitud al céntimo, no velocidad.

**Constraints**: deterministas (sin `Date`, sin azar, sin estado externo); céntimos enteros sin pérdida de precisión; las métricas no calculables se expresan como "sin datos" (`null`), nunca como 0.

**Scale/Scope**: 3 funciones puras, sus tipos de entrada/salida y su batería de tests. Rango numérico de un proyecto real (cientos de millones de €) → ~10^10 céntimos, muy por debajo de `Number.MAX_SAFE_INTEGER` (~9·10^15): `number` entero es seguro y no se necesita `BigInt` para el cálculo.

## Constitution Check

*GATE: debe pasar antes de implementar.*

| Principio | Cumplimiento |
|---|---|
| I. SDD primero | ✓ Esta spec existe y está aprobada antes del código. |
| II. TDD en los 3 cálculos | ✓ El núcleo de esta feature; tests en rojo (S2) antes de implementar (S3–S5). |
| III. TS strict, cero `any` | ✓ Tipos explícitos de entrada/salida; sin `any` ni `@ts-ignore`. |
| IV. Fidelidad al dominio | ✓ Nombres de entidad en inglés, céntimos enteros, funciones puras en `src/lib/calculations/`, nada derivado se persiste (no hay persistencia aquí). |
| V. Seguridad en servidor | N/A — funciones puras sin datos sensibles; no la violan (el filtrado por rol del FRC vive en la API, S16). |
| VI. Trazabilidad | N/A directo — estos cálculos no generan `AuditEvent`; lo hace la capa que los invoca. |
| VII. ADR + lenguaje simple | ✓ Stack ya en ADRs 001–008; sin decisiones técnicas nuevas que requieran ADR. |

**Resultado: PASA.** Sin violaciones → *Complexity Tracking* vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-critical-calculations/
├── spec.md       # QUÉ y POR QUÉ (aprobada)
├── plan.md       # Este archivo: el CÓMO
└── tasks.md      # Tareas accionables (/speckit-tasks)
```

No se generan `research.md` ni `data-model.md` ni `contracts/`: no hay incógnitas tecnológicas (stack cerrado) ni modelo de datos persistido en esta feature.

### Source Code (repository root)

```text
src/
├── types/
│   └── domain.ts            # Tipos de entrada/salida de los 3 cálculos (+ entidades base)
└── lib/
    └── calculations/
        ├── frc.ts           # calculateFRC
        ├── evm.ts           # calculateEVM
        └── change.ts        # applyChange

tests/
├── frc.test.ts              # escenarios US1
├── evm.test.ts              # escenarios US2
└── change.test.ts           # escenarios US3
```

**Structure Decision**: se respeta el layout obligatorio del briefing (§7): la lógica de cálculo pura en `src/lib/calculations/`, los tipos compartidos en `src/types/domain.ts`, los tests en `tests/`. Un archivo por cálculo; un archivo de test por cálculo.

## Decisiones de diseño (CÓMO, dentro del stack ya decidido)

1. **Céntimos como `number` entero.** Todas las entradas y salidas monetarias son enteros de céntimos. Seguro hasta ~9·10^15. La conversión a euros es de presentación (otra feature).
2. **"Sin datos" = `null`.** Las métricas EVM no calculables se devuelven como `null`, no como 0. El tipo de retorno de `calculateEVM` declara cada métrica como `number | null`, de modo que el consumidor distingue "0 real" de "no calculable".
3. **Redondeo determinista del FRC.** Los repartos se calculan en céntimos; el residuo de redondeo se asigna al agente de mayor porcentaje para que la suma cuadre exactamente con la desviación total.
4. **EAC sin acumular error.** Se calcula como `round(BAC × AC / EV)` (equivalente a `BAC / CPI`) en una sola operación entera, evitando arrastrar el redondeo de CPI. CPI y SPI se devuelven como ratios (`number`) sin redondear; el formateo es de presentación.
5. **`applyChange` devuelve efectos, no los aplica.** Su salida es una estructura de efectos (ajustes por partida, deltas de honorarios, reponderación); la transacción que los persiste es de la API (S20, ADR-006).
6. **Pureza verificable.** Ningún `import` de red, fs, `Date.now()` ni Prisma en estos archivos. Esto se vigila en revisión.

## Complexity Tracking

> Sin violaciones de la constitución. Tabla intencionadamente vacía.
