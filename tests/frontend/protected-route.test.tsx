// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from '../../src/components/ui/ProtectedRoute.tsx';

function renderAt(initialPath: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/projects" element={<div>Contenido privado</div>} />
            </Route>
            <Route path="/login" element={<div>Pantalla de login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay sesión (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ error: { code: 'UNAUTHENTICATED', message: 'No autenticado.', details: {} } }, 401),
      ),
    );
    renderAt('/projects');
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });

  it('muestra el contenido protegido cuando hay sesión', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({ user: { id: 'u1', email: 'a@b.com', displayName: 'A' }, projects: [] }, 200),
      ),
    );
    renderAt('/projects');
    expect(await screen.findByText('Contenido privado')).toBeInTheDocument();
  });
});
