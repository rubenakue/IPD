import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests de integración comparten una ÚNICA base de datos PostgreSQL y limpian
    // estado global (p. ej. `prisma.session.deleteMany()`). Si los archivos corren en
    // paralelo, uno borra la sesión que otro acaba de crear → 401 intermitentes. Los
    // serializamos: la suite es pequeña y así el verde es determinista.
    fileParallelism: false,
    // Matchers de @testing-library/jest-dom para los tests de UI. El entorno por defecto
    // es Node (cálculo y API); los tests de UI declaran `// @vitest-environment jsdom`.
    setupFiles: ['tests/frontend/setup.ts'],
  },
});
