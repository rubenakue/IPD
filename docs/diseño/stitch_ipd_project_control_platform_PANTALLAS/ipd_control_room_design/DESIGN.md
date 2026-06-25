---
version: alpha
name: IPD-control-room-design
description: A dense, role-aware economic control room for Integrated Project Delivery
  projects. The visual direction combines Autodesk's technical confidence, Apple's
  quiet product discipline, and Nike's mechanical restraint, adapted to a Spanish
  B2B construction dashboard built with Mantine.
colors:
  ink: '#101113'
  graphite: '#2B2F33'
  slate: '#5F6670'
  muted: '#8A929D'
  canvas: '#FFFFFF'
  surface: '#F6F7F8'
  surface-warm: '#F4F1E8'
  panel: '#FFFFFF'
  hairline: '#D8DDE3'
  hairline-soft: '#E8EBEF'
  action: '#005EB8'
  action-soft: '#DDEBFA'
  warning: '#F5C400'
  warning-soft: '#FFF6C7'
  success: '#0B7A4B'
  success-soft: '#DFF3EA'
  danger: '#C7362E'
  danger-soft: '#FBE4E2'
  info: '#2563EB'
  role-promoter: '#111111'
  role-project-manager: '#005EB8'
  role-constructor: '#6E4B18'
  role-designer: '#5B5FC7'
  role-observer: '#6B7280'
  surface-dim: '#ddd9d9'
  surface-bright: '#fcf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#45474a'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#76777b'
  outline-variant: '#c6c6ca'
  surface-tint: '#5e5e61'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1c1e'
  on-primary-container: '#848386'
  inverse-primary: '#c7c6c9'
  secondary: '#005db6'
  on-secondary: '#ffffff'
  secondary-container: '#63a1ff'
  on-secondary-container: '#00376f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e1b17'
  on-tertiary-container: '#88837d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3e2e4'
  primary-fixed-dim: '#c7c6c9'
  on-primary-fixed: '#1b1c1e'
  on-primary-fixed-variant: '#464749'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a9c7ff'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#00468c'
  tertiary-fixed: '#e8e1da'
  tertiary-fixed-dim: '#cbc6bf'
  on-tertiary-fixed: '#1e1b17'
  on-tertiary-fixed-variant: '#4a4641'
  background: '#fcf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 48px
    fontWeight: 650
    lineHeight: 1.05
    letterSpacing: 0
  page-title:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 32px
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: 0
  section-title:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 22px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: 0
  card-title:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 16px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: 0
  body:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-strong:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: 0
  table:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  label:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 12px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: 0
  numeric:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: 0
  numeric-table:
    fontFamily: Inter, system-ui, -apple-system, Segoe UI, sans-serif
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
  DEFAULT: 0.5rem
  xl: 1.5rem
  full: 9999px
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
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
  top-bar:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline-soft}'
    height: 64px
  side-nav:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.canvas}'
    width: 264px
  dashboard-panel:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    rounded: '{rounded.md}'
    padding: 20px
  kpi-card:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    rounded: '{rounded.md}'
    padding: 16px
  kpi-card-warning:
    backgroundColor: '{colors.warning-soft}'
    textColor: '{colors.ink}'
    borderColor: '{colors.warning}'
    rounded: '{rounded.md}'
    padding: 16px
  status-success:
    backgroundColor: '{colors.success-soft}'
    textColor: '{colors.success}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  status-warning:
    backgroundColor: '{colors.warning-soft}'
    textColor: '{colors.graphite}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  status-danger:
    backgroundColor: '{colors.danger-soft}'
    textColor: '{colors.danger}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  primary-button:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.canvas}'
    rounded: '{rounded.pill}'
    padding: 10px 18px
  secondary-button:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    rounded: '{rounded.pill}'
    padding: 10px 18px
  action-button:
    backgroundColor: '{colors.action}'
    textColor: '{colors.canvas}'
    rounded: '{rounded.pill}'
    padding: 10px 18px
  data-table:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline}'
    typography: '{typography.table}'
    rounded: '{rounded.md}'
  filter-chip:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.graphite}'
    borderColor: '{colors.hairline}'
    rounded: '{rounded.pill}'
    padding: 8px 12px
  filter-chip-active:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.canvas}'
    rounded: '{rounded.pill}'
    padding: 8px 12px
  role-badge-promoter:
    backgroundColor: '{colors.role-promoter}'
    textColor: '{colors.canvas}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  role-badge-project-manager:
    backgroundColor: '{colors.action-soft}'
    textColor: '{colors.role-project-manager}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  role-badge-constructor:
    backgroundColor: '#F2E6D4'
    textColor: '{colors.role-constructor}'
    rounded: '{rounded.pill}'
    padding: 4px 10px
  timeline-item:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    borderColor: '{colors.hairline-soft}'
    rounded: '{rounded.sm}'
    padding: 12px
---

"