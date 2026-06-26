// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '../../src/pages/LoginPage.tsx';

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LoginPage />
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

describe('LoginPage', () => {
  it('envía las credenciales a /api/auth/login con la cookie incluida', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> =>
        jsonResponse(
          { user: { id: 'u1', email: 'demo@ipd.com', displayName: 'Demo' }, projects: [] },
          200,
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Usuario corporativo'), 'demo@ipd.com');
    await user.type(screen.getByLabelText('Contraseña'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('/api/auth/login');
    expect(call[1]?.credentials).toBe('include');
    expect(JSON.parse(call[1]?.body as string)).toEqual({ email: 'demo@ipd.com', password: 'secret' });
  });

  it('muestra el mensaje de error de la API cuando las credenciales son inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(
          { error: { code: 'UNAUTHENTICATED', message: 'Email o contraseña incorrectos.', details: {} } },
          401,
        ),
      ),
    );

    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Usuario corporativo'), 'demo@ipd.com');
    await user.type(screen.getByLabelText('Contraseña'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Email o contraseña incorrectos.')).toBeInTheDocument();
  });
});
