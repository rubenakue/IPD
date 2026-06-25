# Pantallas generadas con Stitch — REFERENCIA VISUAL

> **Qué es esto:** mockups generados con [Stitch](https://stitch.withgoogle.com) a partir
> de `docs/diseño/DESIGN.md` y el bloque de instrucciones de `docs/diseño/STITCH-INSTRUCTIONS.md`.
>
> **Para qué sirve:** *decidir cómo se ven* las pantallas antes de construir el frontend shell (H5/S11).
>
> **Para qué NO sirve:** no es fuente de verdad de specs ni de código. El stack real es
> **React + Mantine + TanStack Query + React Router** (ADR-002/003/007), no Tailwind.
> Los `code.html` están hechos con Tailwind por CDN y se usan solo como referencia de estructura.

## Pantallas

| Carpeta | Pantalla | Sesión del roadmap |
|---|---|---|
| `login_ipd_platform` | Login (sin registro público) | S11 |
| `selector_de_proyectos_ipd_platform` | Selector de proyectos con rol por proyecto | S11 |
| `dashboard_hotel_azahar` | Dashboard (KPIs + FRC + alertas) | S17 |
| `control_econ_mico_hotel_azahar` | Control económico (tabla por capítulos) | S13–S15 |
| `frc_hotel_azahar` | FRC role-aware (bonus/malus) | S16 |
| `cambios_hotel_azahar` | Registro de cambios | S19–S20 |
| `trazabilidad_hotel_azahar` | Riesgos / incidencias / decisiones | S21–S22 |

## Aprovechable (alto valor)

- **Design tokens** del `tailwind.config` de cada `code.html`: paleta con colores por rol
  (`role-promoter`, `role-constructor`…), spacing y escala tipográfica. Se traducen a un
  `createTheme` de Mantine en S11.
- **Arquitectura del shell**: AppShell con sidebar fijo (264px) + topbar (64px) con contexto
  proyecto/fase/rol. Coincide con §6.2 del concepto.
- **Textos en español** ya redactados con tildes correctas.

## Incoherencias conocidas (NO copiar tal cual)

- Mezcla "Proyecto Torre Norte" (topbar) con "Hotel Azahar" (título). El proyecto canónico es **Hotel Azahar**.
- Nombres de agentes inventados ("Construcciones Ibéricas", "Estudio Arquitectura V") en vez de
  los del brief (**Construcciones Turia, Estudio Albor, Vivare**).
- El menú lateral incluye módulos fuera de P1–P2 (Contratos, Cronograma) y omite Cambios/Incidencias/Decisiones.
  El menú real sale de §6.2.
- Login con foto industrial a pantalla y títulos en serif: contradicen "no marketing hero" e Inter del `DESIGN.md`.
- Gráficos son placeholders; falta decidir librería de charts.
