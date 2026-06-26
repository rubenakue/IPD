import { createTheme } from '@mantine/core';

// Tema base de Mantine. Los mockups de docs/diseño son referencia visual orientativa
// (research D5): fuente Inter y un primario sobrio. Se afinará en pantallas posteriores.
export const theme = createTheme({
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
  primaryColor: 'dark',
  defaultRadius: 'md',
});
