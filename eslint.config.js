// Flat config (ESLint 9+). El proyecto es ESM ("type": "module").
// Refuerza la regla innegociable del proyecto: TypeScript strict, cero `any`.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // ESLint solo vigila el código del producto. Lo demás es infraestructura:
    // hooks de agentes (.cjs de Node), artefactos de Spec Kit, builds y dependencias.
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '.specify/**',
      '.claude/**',
      '.codex/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Cero `any` (AGENTS.md): si un tipo no sale, se modela, no se silencia.
      '@typescript-eslint/no-explicit-any': 'error',
      // Permite parámetros/variables intencionadamente sin usar con prefijo `_`
      // (p. ej. los esqueletos `throw new Error('Not implemented')`).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
