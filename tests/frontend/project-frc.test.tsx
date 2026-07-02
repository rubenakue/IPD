// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectFrcPage } from '../../src/pages/ProjectFrcPage.tsx';
import type { FrcAgentRow, ProjectFrcResponse } from '../../src/types/api.ts';

const promoterRow: FrcAgentRow = {
  agentId: 'a-prom', displayName: 'Promotora Levante', role: 'PROMOTER',
  bonusMalusCents: -80_00, guaranteedFeeCents: 0, totalCents: -80_00,
};
const constructorRow: FrcAgentRow = {
  agentId: 'a-con', displayName: 'Construcciones Turia', role: 'CONSTRUCTOR',
  bonusMalusCents: -120_00, guaranteedFeeCents: 10_000_00, totalCents: 9_880_00,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWith(response: ProjectFrcResponse) {
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(response)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/projects/p1/frc']}>
          <Routes>
            <Route path="/projects/:projectId/frc" element={<ProjectFrcPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectFrcPage — vista por rol (S16)', () => {
  it('global: muestra la tabla con todos los agentes y el estado del fondo', async () => {
    renderWith({
      visibility: 'global', budgetStatus: 'APPROVED', fundStatus: 'malus',
      deviationCents: -200_00, agents: [promoterRow, constructorRow],
    });

    expect(await screen.findByText('Promotora Levante')).toBeInTheDocument();
    expect(screen.getByText('Construcciones Turia')).toBeInTheDocument();
    expect(screen.getByText('Malus (sobrecoste)')).toBeInTheDocument();
    expect(screen.getByText(/Desviación total/)).toBeInTheDocument();
  });

  it('own: muestra solo la fila propia, sin la de otros agentes', async () => {
    renderWith({
      visibility: 'own', budgetStatus: 'APPROVED', fundStatus: 'malus',
      deviationCents: -200_00, own: constructorRow,
    });

    expect(await screen.findByText('Construcciones Turia')).toBeInTheDocument();
    expect(screen.queryByText('Promotora Levante')).not.toBeInTheDocument();
    expect(screen.getByText('Malus (sobrecoste)')).toBeInTheDocument();
  });

  it('aggregate: muestra solo el estado del fondo, sin importes', async () => {
    renderWith({ visibility: 'aggregate', budgetStatus: 'APPROVED', fundStatus: 'bonus' });

    expect(await screen.findByText('Bonus (ahorro)')).toBeInTheDocument();
    expect(screen.getByText(/solo tiene acceso al estado agregado/)).toBeInTheDocument();
    expect(screen.queryByText(/Desviación total/)).not.toBeInTheDocument();
  });
});
