# ADR-008: Framework de tests

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

El proyecto sigue TDD estricto en los tres cálculos críticos (`calculateEVM`, `calculateFRC`, `applyChange`), cuyos tests son innegociables según el briefing. Había que elegir el framework que ejecuta esos tests, decisión que desbloquea el rol `tdd-harness` y define el comando `pnpm test`.

## Opciones consideradas

- **Vitest (elegido):** nativo del ecosistema Vite ya presente en el proyecto (ADR-001): comparte configuración, arranca casi instantáneo y su modo watch re-ejecuta al guardar, ideal para el ciclo rojo-verde-refactor. API deliberadamente compatible con Jest, así que el material de aprendizaje de Jest sirve igual.
- **Jest:** el veterano con más documentación histórica, pero su configuración con TypeScript moderno y módulos ES es un dolor recurrente que consumiría horas sin aportar aprendizaje de dominio.

## Decisión

Vitest, por integración natural con Vite y velocidad de ciclo TDD.

## Consecuencias

- **Positivas:** una sola configuración de build/test; feedback inmediato en watch mode; transferencia directa de conocimiento Jest↔Vitest.
- **Negativas:** ninguna relevante a esta escala.
- **Pendiente:** estrategia detallada de tests (unitarios de cálculos primero; integración de API después) — la define el rol `tdd-harness`; decidir si se añade `@testing-library/react` para tests de componentes cuando exista UI que lo justifique.

## TODO (comandos exactos, los ejecuta Rubén o el rol tdd-harness)

```bash
pnpm add -D vitest
# Script en package.json: "test": "vitest"
```
