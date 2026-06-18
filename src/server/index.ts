import { createApp } from './app.ts';
import { loadConfig, type Config } from './config.ts';

/** Punto de entrada del servidor: valida la config, construye la app y escucha. */
function main(): void {
  let config: Config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`[api] ${err instanceof Error ? err.message : 'configuración inválida'}`);
    process.exit(1);
  }

  const app = createApp();
  app.listen(config.PORT, () => {
    console.log(`[api] escuchando en http://localhost:${config.PORT}`);
  });
}

main();
