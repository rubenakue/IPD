---
version: alpha
name: IPD-control-room-design
description: A dense, role-aware economic control room for Integrated Project Delivery projects. The visual direction combines Autodesk's technical confidence, Apple's quiet product discipline, and Nike's mechanical restraint, adapted to a Spanish B2B construction dashboard built with Mantine.

colors:
  ink: "#101113"
  graphite: "#2B2F33"
  slate: "#5F6670"
  muted: "#8A929D"
  canvas: "#FFFFFF"
  surface: "#F6F7F8"
  surface-warm: "#F4F1E8"
  panel: "#FFFFFF"
  hairline: "#D8DDE3"
  hairline-soft: "#E8EBEF"
  action: "#005EB8"
  action-soft: "#DDEBFA"
  warning: "#F5C400"
  warning-soft: "#FFF6C7"
  success: "#0B7A4B"
  success-soft: "#DFF3EA"
  danger: "#C7362E"
  danger-soft: "#FBE4E2"
  info: "#2563EB"
  role-promoter: "#111111"
  role-project-manager: "#005EB8"
  role-constructor: "#6E4B18"
  role-designer: "#5B5FC7"
  role-observer: "#6B7280"

typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 48px
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: 0
  page-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: 0
  section-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 22px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: 0
  card-title:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: 0
  table:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 12px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: 0
  numeric:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: 0
  numeric-table:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: 13px
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px

components:
  app-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  top-bar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-soft}"
    height: 64px
  side-nav:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    width: 264px
  dashboard-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: 20px
  kpi-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: 16px
  kpi-card-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.warning}"
    rounded: "{rounded.md}"
    padding: 16px
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  status-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  primary-button:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  secondary-button:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  action-button:
    backgroundColor: "{colors.action}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: 10px 18px
  data-table:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.table}"
    rounded: "{rounded.md}"
  filter-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.graphite}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.pill}"
    padding: 8px 12px
  filter-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: 8px 12px
  role-badge-promoter:
    backgroundColor: "{colors.role-promoter}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  role-badge-project-manager:
    backgroundColor: "{colors.action-soft}"
    textColor: "{colors.role-project-manager}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  role-badge-constructor:
    backgroundColor: "#F2E6D4"
    textColor: "{colors.role-constructor}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  timeline-item:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-soft}"
    rounded: "{rounded.sm}"
    padding: 12px
---

# IPD Platform Design Direction

## Decision

Use a single IPD-specific `DESIGN.md` for Stitch. Do not pass the three brand files together as final design input.

The best solution is a controlled fusion:

- **Autodesk is the base** because IPD is technical, industrial, economic, and construction-oriented.
- **Apple contributes discipline**: quiet surfaces, minimal chrome, clear hierarchy, and a single restrained action color.
- **Nike contributes operational restraint**: flat surfaces, strong alignment, compact rhythm, and decisive pill controls.

Do not copy any brand literally. IPD is not a retail catalog, a product launch page, or a marketing landing. It is a working control room for construction economics and traceability.

## Product Character

IPD Platform should feel like:

- a command center for project economics;
- a shared truth layer for budget, real costs, FRC, EVM, changes, risks, incidents, and decisions;
- a serious B2B tool used repeatedly during project meetings;
- a role-aware interface where the same URL can show different data to Promoter, Constructor, Designer, Project Manager, or Observer.

The product should not feel like:

- a SaaS landing page;
- a generic task tracker;
- a colorful startup dashboard;
- a finance app detached from construction context;
- a decorative portfolio site.

## Reference Blend

### Keep From Autodesk

- Industrial-modern confidence.
- Black, white, neutral surfaces, and one high-visibility warning accent.
- Technical credibility through alignment, whitespace, and strong typography.
- Visual language suitable for engineering, construction, BIM, cost control, and project delivery.

### Keep From Apple

- Quiet UI chrome.
- Clear section rhythm.
- Primary actions using one consistent accent.
- Light/dark contrast used as hierarchy, not decoration.
- Product-like polish without visual noise.

### Keep From Nike

- Flat components with minimal depth.
- Strong grid discipline.
- Compact cards and filters.
- Pill buttons and chips.
- No decorative gradients or ornamental backgrounds.

### Reject For IPD

- Full-screen marketing heroes.
- Oversized editorial headlines inside the app.
- Product photography-led layouts.
- One-card-per-concept storytelling.
- Excessive empty space that reduces dashboard density.
- Nested cards and decorative shadows.
- Monochrome-only dashboards where status and risk are hard to scan.

## Core Screens For Stitch

Generate mockups for these screens first:

1. **Login**
   - Spanish UI.
   - Professional, quiet, no public signup.
   - Include demo role access conceptually, but do not show passwords.

2. **Project Selector**
   - List projects available to the authenticated user.
   - Show project name, code, client, active phase, user role, and status.
   - It should make clear that roles are per project, not global.

3. **Project Dashboard**
   - Route context: `/projects/:projectId/dashboard`.
   - Header: project name, phase, active role, last update.
   - KPI cards: presupuesto vigente, coste real, previsión a cierre, desviación, contingencia consumida, FRC status, CV/CPI.
   - Role-aware area: Promoter sees private development costs and total investment; Constructor sees only shared costs and own FRC result.
   - Include charts sparingly: one FRC distribution / status block, one EVM trend or metric block.

4. **Economic Control**
   - Budget by chapter and budget line.
   - Real costs, physical progress, forecast, deviation, and linked evidence.
   - Dense table-first layout with filters and row status.

5. **FRC**
   - Show aggregate FRC status.
   - Promoter and Project Manager can see the full agent table.
   - Constructor and Designer only see their own projected result.
   - Observer only sees aggregate status, not individual results.

6. **Changes**
   - List approved/pending/rejected changes.
   - Show type, status, economic impact, affected budget lines, FRC impact, linked decisions.
   - Detail drawer should show the effect trail, not just a text description.

7. **Risks, Incidents, And Decisions**
   - Combined traceability pattern.
   - Searchable lists with status, owner, impact, date, linked entity, and decision trail.
   - Prioritize evidence and accountability.

## Layout System

Use a real application shell:

- dark left navigation rail at desktop;
- top bar with project context, role badge, user menu, and sync/update state;
- main content area in a constrained but dense grid;
- no marketing hero on authenticated screens;
- mobile collapses the side navigation into a drawer;
- desktop dashboard uses 12-column grid;
- tables occupy full-width bands, not tiny decorative cards.

Recommended desktop structure:

```text
Top bar: project, phase, role, last update, user
Side nav + dashboard/page content
KPI row
FRC + EVM + alerts
table / traceability list
```

## Visual Density

The dashboard should be dense but legible.

- KPI cards are compact and comparable.
- Tables are first-class UI, not secondary details.
- Use 8px spacing rhythm.
- Use 16px to 24px internal panel padding.
- Avoid large empty hero blocks once the user is inside a project.
- Prefer full-width sections and panels over nested cards.

## Color Rules

Base palette:

- white and near-white for content surfaces;
- near-black for navigation, primary text, and the strongest actions;
- graphite/slate for secondary hierarchy;
- blue for interaction and selected states;
- yellow only for attention, pending states, warnings, or construction-style caution;
- green for favorable economic status;
- red for unfavorable economic status.

Do not overuse yellow. It should work like a warning signal, not like a theme background.

## Typography Rules

Use Inter or system fonts. Keep letter spacing at 0.

- Page titles: 32px, strong, concise.
- Section titles: 22px.
- Card titles and table headers: 12px to 16px.
- Body: 15px.
- Tables: 13px.
- Numeric KPIs: tabular-feeling, 24px to 32px depending on space.

The app is for scanning, comparison, and repeated use. Avoid huge editorial type except on unauthenticated entry screens.

## Component Rules

### Buttons

- Primary destructive or decisive actions use near-black.
- Standard server actions use blue.
- Secondary actions are white/outlined.
- Buttons use pill radius, but panels and cards stay at 8px radius.
- Use icon buttons for compact toolbar actions.

### Cards And Panels

- Use panels for grouped dashboard data.
- Radius 8px.
- 1px border.
- No heavy shadows.
- No cards inside cards.
- No decorative card grids that replace tables.

### Tables

Tables should support:

- filters;
- search;
- status badges;
- right-aligned money;
- percentage progress;
- linked evidence;
- empty states that explain what is missing;
- row detail drawer for budget lines, changes, risks, incidents, and decisions.

Money must be easy to compare. Align currency values right and keep signs visible.

### Badges

Use badges for:

- role;
- phase;
- status;
- FRC bonus / neutral / malus;
- change status;
- risk status;
- visibility scope.

Badge copy is Spanish.

### Charts

Charts are supporting evidence, not decoration.

Use charts only when they answer a question:

- Is the project trending toward bonus or malus?
- Is cost performance improving or worsening?
- Which agents are exposed to FRC impact?
- Which chapters drive deviation?

## Role-Aware UX

The same route can show different information. Make this visible in the mockups.

Promoter:

- sees shared indicators;
- sees private promoter development costs;
- sees total investment;
- sees full FRC table.

Project Manager:

- sees the broadest coordination view;
- sees private promoter costs in the MVP;
- can operate changes, decisions, and project setup.

Constructor:

- sees shared costs;
- sees own FRC result only;
- can register costs, progress, risks, incidents, and change proposals;
- does not see private promoter costs.

Designer:

- sees shared project information;
- sees own FRC result only;
- can participate in risks, incidents, decisions, and changes.

Observer:

- sees read-only shared dashboards and records;
- sees aggregate FRC status only;
- does not see individual FRC results.

## Spanish Content Guidance

Use Spanish UI labels:

- Dashboard
- Control económico
- Presupuesto
- Costes reales
- Avance físico
- Previsión a cierre
- Desviación
- Fondo de Riesgo Compartido
- Cambios
- Riesgos
- Incidencias
- Decisiones
- Trazabilidad
- Rol
- Fase
- Sin datos de avance
- Sin datos de planificación
- No tienes permiso para ver esta información

Use realistic project content:

- Proyecto: Hotel Azahar
- Cliente: Vivare
- Promotor: Promotora Levante
- Constructor: Construcciones Turia
- Proyectista: Estudio Albor
- PM: Vivare

## Domain Rules To Preserve

- FRC is derived, not manually edited.
- EVM uses physical progress, not spending as a proxy for progress.
- "Sin datos" is an explicit dashboard state, not a zero.
- Real costs are immutable and corrected with reversal entries.
- Private promoter costs must not appear in Constructor, Designer, or Observer mockups.
- The UI can show role filtering, but security belongs to the server and database.

## Responsive Behavior

Desktop:

- persistent side navigation;
- 12-column dashboard grid;
- KPI row at top;
- wide tables.

Tablet:

- side navigation collapses;
- KPI grid becomes 2 columns;
- tables keep horizontal scroll with sticky first column where possible.

Mobile:

- navigation drawer;
- KPI cards stack;
- tables become summary rows with drill-in detail;
- primary actions remain reachable but not sticky unless tied to an active workflow.

## Do

- Make the first screen after login useful immediately.
- Show project, phase, role, and permissions context at all times.
- Use dense economic data with strong visual hierarchy.
- Show role differences explicitly.
- Use Spanish business copy.
- Keep visuals serious, technical, and construction-adjacent.
- Make empty states useful and domain-aware.

## Don't

- Do not generate a landing page as the main output.
- Do not use a hero marketing section for authenticated screens.
- Do not use generic SaaS purple/blue gradients.
- Do not use decorative orbs, bokeh, or abstract backgrounds.
- Do not hide critical economic tables behind charts.
- Do not show private promoter costs to non-promoter/non-PM roles.
- Do not invent manual editing for FRC.
- Do not make the interface look like ecommerce, product launch, or fashion retail.

## Stitch Prompt Summary

Design a Spanish B2B web application for IPD construction project control. The app is a dense, role-aware economic and traceability control room, not a landing page. Use Autodesk-like technical confidence as the base, Apple-like restraint in chrome and hierarchy, and Nike-like flat grid discipline. Build mockups for login, project selector, project dashboard, economic control, FRC, changes, risks/incidents/decisions. Use Mantine-compatible components, tables, KPI panels, filters, badges, and clear permission states.
