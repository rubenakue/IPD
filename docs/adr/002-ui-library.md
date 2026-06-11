# ADR-002: Librería de componentes UI

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

Había que elegir la librería de componentes del frontend React. Lo que más pesa en este proyecto: tablas de datos potentes (presupuesto por capítulos y partidas), formularios largos (cambios, riesgos) y un dashboard de KPIs con gráficas (EVM y FRC). Perfil del desarrollador: aprendiendo desarrollo web, prioriza documentación abundante y poca fontanería.

## Opciones consideradas

- **Mantine (elegida):** librería completa con componentes, sistema de formularios (`useForm`), gráficas propias (Mantine Charts, sobre Recharts), fechas y notificaciones. Documentación excelente con ejemplos copiables; no requiere Tailwind. Inconvenientes: estética menos personalizable; la tabla con agrupación avanzada viene de un paquete complementario.
- **shadcn/ui:** componentes copiados al repo sobre Tailwind + Radix, estética moderna y control total (con MCP disponible para Claude Code). Inconvenientes: es un kit de piezas — tabla (TanStack Table), formularios (react-hook-form) y gráficas (Recharts) se ensamblan a mano, y exige aprender Tailwind.
- **Ant Design:** la tabla más potente de serie (agrupación, filas resumen, edición en línea). Inconvenientes: estética corporativa rígida, personalización difícil, bundle pesado.
- **Hero UI:** mencionada en el kickoff como opción del equipo. Moderna y atractiva, pero floja en tablas de datos pesadas, justo donde este proyecto más exige.
- **Tremor:** orientada solo a dashboards; demasiado estrecha para cubrir formularios y tablas de gestión.

## Decisión

Mantine, por ser la opción todo-en-uno con una sola documentación que aprender: formularios, gráficas y componentes resueltos por la misma librería, lo que minimiza la fontanería y maximiza las horas disponibles para los módulos de negocio.

## Consecuencias

- **Positivas:** dashboard EVM/FRC construible con Mantine Charts sin decidir librería de gráficos aparte (queda resuelto por defecto); formularios largos con validación integrada; curva de aprendizaje baja.
- **Negativas:** estética reconocible "de Mantine"; dependencia de una librería externa grande.
- **Pendiente:** elegir el componente de tabla para el presupuesto cuando se haga la spec de esa pantalla (`mantine-datatable` vs TanStack Table + componentes Mantine); si las gráficas EVM exigieran algo que Mantine Charts no cubre, evaluar Recharts directo o ECharts en un ADR nuevo.

## TODO (comandos exactos, los ejecuta Rubén o el rol que implemente)

```bash
pnpm add @mantine/core @mantine/hooks @mantine/form @mantine/dates @mantine/charts @mantine/notifications
pnpm add -D postcss postcss-preset-mantine postcss-simple-vars
```
