import { z } from 'zod';

// Configuración del servidor leída del entorno y validada con Zod. Si una variable
// es inválida (p. ej. PORT no numérico), el servidor NO arranca y lo dice claro,
// en vez de fallar a medias. Es también el primer uso de Zod (mini-ADR-009).

const envSchema = z.object({
  /** Puerto HTTP. Por defecto 3000 (decisión de clarify). */
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Config = z.infer<typeof envSchema>;

/**
 * Lee y valida las variables de entorno. Lanza un Error con un mensaje legible
 * (sin exponer valores) si la configuración no es válida.
 */
export function loadConfig(): Config {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${detail}`);
  }
  return parsed.data;
}
