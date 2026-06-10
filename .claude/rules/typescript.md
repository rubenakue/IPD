---
paths:
  - "src/**/*.{ts,tsx}"
  - "tests/**/*.ts"
---
# Reglas TypeScript

- Strict mode siempre. Ni `any` ni `as unknown as X` ni `@ts-ignore`; si un tipo
  no sale, modela el tipo, no lo silencies.
- Inmutabilidad por defecto: `const`, spread para actualizar, nada de mutar
  parámetros de entrada.
- Funciones pequeñas y puras donde sea posible; archivos de 200-400 líneas,
  máximo 800 — si lo superas, divide.
- La lógica de `src/lib/calculations/` es SIEMPRE pura: sin I/O, sin fechas del
  sistema, sin aleatoriedad, sin acceso a red o BD. Entradas → salidas, testeable.
- Errores: nunca tragar excepciones (`catch {}`); o se maneja con lógica real
  o se propaga. Mensajes de error con contexto accionable.
- Imports: sin ciclos; ordena externo → interno → relativo.
- Tests: cada bug arreglado deja un test que lo habría pillado.
- Prohibido `console.log` en código de producción; usa el logger del proyecto.
- Dinero: nunca aritmética flotante ingenua en cálculos económicos acumulativos;
  decide y documenta la estrategia (céntimos enteros o librería decimal) en su ADR.
