// Matchers de @testing-library/jest-dom para los tests de UI (p. ej. toBeInTheDocument).
// Es inocuo para los tests de backend/cálculo: solo extiende `expect`.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// jsdom no implementa matchMedia ni ResizeObserver, que Mantine usa al montar. Los
// añadimos solo cuando hay `window` (tests de UI con entorno jsdom); en los tests de
// backend (entorno node) no existe `window` y este bloque se omite.
if (typeof window !== 'undefined') {
  // Sin `globals: true`, Testing Library no registra su auto-cleanup: lo hacemos aquí
  // para desmontar el DOM entre tests (evita elementos duplicados). El import dinámico
  // mantiene Testing Library fuera de los tests de backend.
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => {
    cleanup();
  });

  // Referencia laxa: en los tipos del DOM, Window SIEMPRE declara estas APIs, así que
  // comprobarlas sobre `window` directamente colapsaría el tipo a `never`. jsdom, en
  // cambio, no las trae en runtime, por eso las añadimos.
  const win = window as unknown as {
    matchMedia?: Window['matchMedia'];
    ResizeObserver?: typeof ResizeObserver;
  };

  if (!win.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }

  if (!win.ResizeObserver) {
    class ResizeObserverMock {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  }
}
