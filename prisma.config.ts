// Config de Prisma (v7). Carga el .env con la API nativa de Node 20.12+/22,
// sin depender de `dotenv`. Si no existe .env (p. ej. CI), se usan las
// variables ya presentes en el entorno.
import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env");
} catch {
  // .env ausente: DATABASE_URL debe venir del entorno (CI/despliegue).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
