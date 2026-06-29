// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectBudgetPage } from '../../src/pages/ProjectBudgetPage.tsx';
import type { BudgetView, ProjectBudgetResponse } from '../../src/types/api.ts';

function renderWith(response: ProjectBudgetResponse) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/p1/budget']}>
          <Routes>
            <Route path="/projects/:projectId/budget" element={<ProjectBudgetPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

const budget: BudgetView = {
  id: 'b1',
  projectId: 'p1',
  status: 'DRAFT',
  approvedAt: null,
  createdAt: new Date('2026-06-29T10:00:00Z').toISOString(),
  totalBaseAmountCents: 150_00,
  chapters: [
    {
      chapterCode: '01',
      chapterName: 'Cimentacion',
      subtotalBaseAmountCents: 150_00,
      lines: [
        {
          id: 'l1',
          chapterCode: '01',
          chapterName: 'Cimentacion',
          code: '01.01',
          name: 'Excavacion',
          baseAmountCents: 150_00,
        },
      ],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectBudgetPage', () => {
  it('muestra estado vacio y formulario al PM', async () => {
    renderWith({ budget: null, canManageBudget: true });

    expect(await screen.findByText('Sin presupuesto cargado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anadir partida' })).toBeInTheDocument();
  });

  it('muestra tabla agrupada sin acciones a un agente no PM', async () => {
    renderWith({ budget, canManageBudget: false });

    expect(await screen.findByText('01 · Cimentacion')).toBeInTheDocument();
    expect(screen.getAllByText('150,00 €')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument();
  });

  it('convierte euros del formulario a centimos en el POST', async () => {
    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') {
          capturedBodies.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify(budget), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ budget: null, canManageBudget: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );

    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/p1/budget']}>
            <Routes>
              <Route path="/projects/:projectId/budget" element={<ProjectBudgetPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </MantineProvider>,
    );

    await user.type(await screen.findByLabelText('Codigo capitulo'), '01');
    await user.type(screen.getByLabelText('Capitulo'), 'Cimentacion');
    await user.type(screen.getByLabelText('Codigo partida'), '01.01');
    await user.type(screen.getByLabelText('Partida'), 'Excavacion');
    const amount = screen.getByLabelText('Importe base (EUR)');
    await user.clear(amount);
    await user.type(amount, '500000.5');
    await user.click(screen.getByRole('button', { name: 'Anadir partida' }));

    expect(capturedBodies).toContainEqual({
      chapterCode: '01',
      chapterName: 'Cimentacion',
      code: '01.01',
      name: 'Excavacion',
      baseAmountCents: 50_000_050,
    });
  });
});
