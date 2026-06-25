# Stitch — cómo subir el diseño de IPD

> **Este archivo es una guía PARA TI (Rubén), no para Stitch.** No lo pegues entero
> en ningún sitio. Mapea cada campo del formulario "Empezar con tu diseño":
>
> | Campo de Stitch | Qué poner |
> |---|---|
> | **Pegar/Subir un archivo DESIGN.md** | `docs/diseño/DESIGN.md` (la ÚNICA fuente de diseño). |
> | **Instrucciones adicionales** | **SOLO** el bloque marcado `📋 PEGAR AQUÍ` de más abajo. |
> | **Repositorio público de GitHub** (opcional) | `https://github.com/rubenakue/IPD` — aporta poco ahora (aún no hay frontend; el repo es backend) y hasta puede despistar a Stitch. **Puedes dejarlo vacío.** |
> | **Añadir sitio web** | Vacío (no hay). |
> | Imagen de logo (adjunto del ejemplo) | No aplica (no hay logo todavía). |

## Archivos de referencia (NO subir a Stitch)

Son la inspiración con la que se construyó `DESIGN.md`; quédatelos como material de consulta:

- `DESIGN.autodesk.md`: base de confianza técnica e industrial.
- `DESIGN.apple.md`: contención, jerarquía tranquila y un único color de acción disciplinado.
- `DESIGN.nike.md`: disciplina de rejilla plana, ritmo compacto y controles tipo pill.

No los pases juntos como `DESIGN.md` rivales: describen productos distintos y darían un resultado incoherente. La fusión ya está hecha en `DESIGN.md`.

## 📋 PEGAR AQUÍ — contenido para "Instrucciones adicionales"

Copia **solo** lo que hay entre las marcas, sin el ```text:

```text
Create mockups for IPD Platform, a Spanish B2B web application for Integrated Project Delivery construction projects.

This is not a landing page. The first authenticated experience must be a working control room for project economics and traceability.

Screens to generate:
1. Login without public signup.
2. Project selector with per-project role.
3. Project dashboard for /projects/:projectId/dashboard.
4. Economic control table for budget, real costs, physical progress, forecast, and deviation.
5. FRC screen with role-aware visibility.
6. Changes screen with status, economic impact, FRC impact, and linked decisions.
7. Risks, incidents, and decisions traceability screen.

Use Spanish UI copy with correct accents (e.g. "Control económico", "Avance físico", "Previsión a cierre", "Desviación"). Code/domain names may stay in English only when they are entity names.

Show the same project, "Hotel Azahar", with realistic roles:
- Promotor: Promotora Levante
- Constructor: Construcciones Turia
- Proyectista: Estudio Albor
- PM: Vivare
- Observador

Important role behavior:
- Promoter sees private development costs, total investment, and full FRC.
- Project Manager sees the coordination view and full FRC.
- Constructor sees shared costs and only its own FRC result.
- Designer sees shared information and only its own FRC result.
- Observer sees read-only shared information and aggregate FRC status only.

The visual direction should feel like an engineering/economic control room:
- Autodesk-like technical confidence.
- Apple-like restraint and clean hierarchy.
- Nike-like flat grid discipline.
- No marketing hero, no decorative gradients, no abstract background orbs.
- Use dense tables, KPI cards, filters, badges, and charts only where they answer a business question.

Use a Mantine-compatible React app mental model: AppShell, side nav, top bar, panels, tables, charts, drawers, notifications, and forms.
```

## Recomendación de uso (para ti)

Haz dos pasadas en Stitch, las dos con el mismo `DESIGN.md` y el mismo bloque de arriba:

1. **Run A — Dashboard primero:** pide a Stitch que se centre en Login, Project Selector y Dashboard.
2. **Run B — Pantallas de flujo:** pide Control económico, FRC, Cambios y Riesgos/Incidencias/Decisiones.

Tras elegir la dirección más fuerte, usa ese mockup como referencia visual para el frontend shell (S11). Los mockups son para *decidir cómo se ven* las pantallas; nunca son fuente de verdad de specs ni de código.
