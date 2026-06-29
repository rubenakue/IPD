// Estructura de módulos del proyecto (§6.1 del concepto). Compartida entre el menú
// lateral (SideNav) y la definición de rutas (App). `ready: true` = pantalla con
// contenido en S11; el resto son marcadores de posición "Próximamente".
export interface ProjectSection {
  key: string;
  label: string;
  ready?: boolean;
}

export const PROJECT_SECTIONS: ProjectSection[] = [
  { key: 'dashboard', label: 'Panel de control', ready: true },
  { key: 'budget', label: 'Presupuesto', ready: true },
  { key: 'real-costs', label: 'Costes' },
  { key: 'frc', label: 'FRC' },
  { key: 'changes', label: 'Cambios' },
  { key: 'risks', label: 'Riesgos' },
  { key: 'incidents', label: 'Incidencias' },
  { key: 'decisions', label: 'Decisiones' },
  { key: 'agents', label: 'Agentes' },
  { key: 'settings', label: 'Configuración' },
];
