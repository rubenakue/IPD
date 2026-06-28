// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewProjectPage } from '../../src/pages/NewProjectPage.tsx';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NewProjectPage />
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

describe('NewProjectPage', () => {
  it('envía el proyecto a POST /api/projects con el cuerpo correcto', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> =>
        jsonResponse(
          { id: 'p1', code: 'PRJ-1', name: 'Hotel', agentId: 'a1', role: 'PROJECT_MANAGER' },
          201,
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Nombre del proyecto'), 'Hotel');
    await user.type(screen.getByLabelText('Código'), 'PRJ-1');
    await user.type(screen.getByLabelText('Cliente'), 'Promotora Levante');
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('/api/projects');
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.credentials).toBe('include');
    expect(JSON.parse(call[1]?.body as string)).toMatchObject({
      name: 'Hotel',
      code: 'PRJ-1',
      clientName: 'Promotora Levante',
    });
  });

  it('no envía y avisa cuando faltan campos obligatorios', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit): Promise<Response> =>
        jsonResponse({}, 201),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }));

    expect(await screen.findByText('Introduce un nombre.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
