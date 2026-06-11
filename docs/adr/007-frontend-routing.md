# ADR-007: Routing del frontend

**Fecha:** 2026-06-11
**Estado:** Aceptado

## Contexto

La SPA React (Vite, ADR-001) necesita un sistema de rutas URL → pantalla. Importa especialmente porque un criterio de evaluación literal del briefing es comprobar qué ven dos roles distintos *en la misma URL*, y la demo exige navegar con soltura entre vistas.

## Opciones consideradas

- **React Router v7 en modo librería (elegida):** el estándar de facto, con una década de documentación, tutoriales y respuestas. Inconvenientes: las rutas no están tipadas (un enlace a una URL inexistente no lo detecta TypeScript).
- **TanStack Router:** rutas type-safe de extremo a extremo, técnicamente superior. Inconvenientes: más conceptos nuevos y mucho menos material de apoyo para resolver atascos; choca con el criterio de aprender donde hay más ayuda.

## Decisión

React Router v7 usado como librería dentro de la SPA Vite (sin framework mode), coherente con el criterio transversal de estas decisiones: aprender con la máxima documentación disponible.

## Consecuencias

- **Positivas:** curva baja, patrones de rutas anidadas y layouts bien documentados; rutas protegidas por sesión/rol fáciles de montar como componentes envolventes.
- **Negativas:** sin tipado de rutas; disciplina manual en los enlaces.
- **Pendiente:** mapa de rutas concreto (se define con las specs de cada módulo).

## TODO (comandos exactos, los ejecuta Rubén o el rol que implemente)

```bash
pnpm add react-router
```
