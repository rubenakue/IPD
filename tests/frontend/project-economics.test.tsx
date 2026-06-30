// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectBudgetPage } from '../../src/pages/ProjectBudgetPage.tsx';
import type { ProjectBudgetResponse, ProjectEconomicsResponse } from '../../src/types/api.ts';

const budgetResponse: ProjectBudgetResponse = {
  canManageBudget: true,
  canRecordRealCost: true,
  budget: {
    id: 'b1',
    projectId: 'p1',
    status: 'APPROVED',
    approvedAt: new Date('2026-06-29T10:00:00Z').toISOString(),
    createdAt: new Date('2026-06-28T10:00:00Z').toISOString(),
    totalBaseAmountCents: 2_000_00,
    chapters: [],
  },
};

const economicsResponse: ProjectEconomicsResponse = {
  budgetStatus: 'APPROVED',
  canUpdateForecast: true,
  chapters: [
    {
      chapterCode: '01',
      chapterName: 'Cimentacion',
      currentBudgetCents: 2_000_00,
      accumulatedCostCents: 1_700_00,
      forecastCents: 2_200_00,
      varianceCents: -200_00,
      variancePercent: -10,
      alertLevel: 'alert',
      lines: [
        {
          id: 'l1', code: '01.01', name: 'A', baseAmountCents: 1_000_00, adjustmentsCents: 0,
          progressPercent: 40, manualForecastCents: null,
          currentBudgetCents: 1_000_00, accumulatedCostCents: 500_00, forecastCents: 1_000_00,
          varianceCents: 0, variancePercent: 0, alertLevel: 'normal',
        },
        {
          id: 'l2', code: '01.02', name: 'B', baseAmountCents: 1_000_00, adjustmentsCents: 0,
          progressPercent: null, manualForecastCents: null,
          currentBudgetCents: 1_000_00, accumulatedCostCents: 1_200_00, forecastCents: 1_200_00,
          varianceCents: -200_00, variancePercent: -20, alertLevel: 'alert',
        },
      ],
    },
  ],
  totals: {
    currentBudgetCents: 2_000_00, accumulatedCostCents: 1_700_00, forecastCents: 2_200_00,
    varianceCents: -200_00, variancePercent: -10, alertLevel: 'alert',
  },
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.includes('/budget/economics')) return jsonResponse(economicsResponse);
      return jsonResponse(budgetResponse);
    }),
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectBudgetPage — tabla económica (S15)', () => {
  it('muestra los derivados, el total y la desviación de la partida en alerta', async () => {
    renderPage();

    expect(await screen.findByText('01.02')).toBeInTheDocument();
    expect(screen.getByText('Total proyecto')).toBeInTheDocument();
    // Desviación % de la partida en sobrecoste y del total.
    expect(screen.getAllByText('-20.0%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-10.0%').length).toBeGreaterThan(0);
    // El control de previsión manual aparece para quien puede actualizarla.
    expect(screen.getAllByRole('button', { name: 'Prevision' }).length).toBe(2);
  });
});
