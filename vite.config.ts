import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El frontend se sirve en el mismo origen que la API gracias al proxy: el navegador
// llama a `/api/...` y Vite lo reenvía al backend Express (puerto 3000). Así la cookie
// de sesión httpOnly (sameSite=lax) viaja sin CORS (research D1).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
