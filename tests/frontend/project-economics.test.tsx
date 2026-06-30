// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectBudgetPage } from '../../src/pages/ProjectBudgetPage.tsx';
import type {
  BudgetLineDetailView,
  ProjectBudgetResponse,
  ProjectEconomicsResponse,
} from '../../src/types/api.ts';

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

const economicsAfterCostResponse: ProjectEconomicsResponse = {
  ...economicsResponse,
  chapters: [
    {
      ...economicsResponse.chapters[0],
      accumulatedCostCents: 2_000_00,
      forecastCents: 2_500_00,
      varianceCents: -500_00,
      variancePercent: -25,
      lines: [
        {
          ...economicsResponse.chapters[0].lines[0],
          accumulatedCostCents: 800_00,
        },
        economicsResponse.chapters[0].lines[1],
      ],
    },
  ],
  totals: {
    currentBudgetCents: 2_000_00,
    accumulatedCostCents: 2_000_00,
    forecastCents: 2_500_00,
    varianceCents: -500_00,
    variancePercent: -25,
    alertLevel: 'alert',
  },
};

const detail: BudgetLineDetailView = {
  id: 'l1',
  chapterCode: '01',
  chapterName: 'Cimentacion',
  code: '01.01',
  name: 'A',
  baseAmountCents: 1_000_00,
  progressPercent: 40,
  progressUpdatedAt: null,
  accumulatedCostCents: 500_00,
  costs: [],
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage() {
  let economicsFetchCount = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    if (urlStr.includes('/budget/economics')) {
      economicsFetchCount += 1;
      return jsonResponse(economicsFetchCount === 1 ? economicsResponse : economicsAfterCostResponse);
    }
    if (urlStr.includes('/budget/lines/l1/costs') && method === 'POST') {
      return jsonResponse({ ...detail, accumulatedCostCents: 800_00 });
    }
    if (urlStr.includes('/budget/lines/l1')) return jsonResponse(detail);
    return jsonResponse(budgetResponse);
  });
  vi.stubGlobal(
    'fetch',
    fetchMock,
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
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
  return { ...result, fetchMock };
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

  it('refresca la tabla económica al imputar un coste desde el detalle', async () => {
    const { fetchMock } = renderPage();
    const user = userEvent.setup();

    await user.click((await screen.findAllByRole('button', { name: 'Detalle' }))[0]);
    await screen.findByText(/Coste real acumulado/);
    await user.type(screen.getByLabelText('Importe (EUR)'), '300');
    await user.type(screen.getByLabelText('Descripcion'), 'Coste adicional');
    await user.click(screen.getByRole('button', { name: 'Imputar coste' }));

    await waitFor(() => {
      const economicsCalls = fetchMock.mock.calls.filter(([input]) =>
        input.toString().includes('/budget/economics'),
      );
      expect(economicsCalls.length).toBeGreaterThanOrEqual(2);
    });
    expect((await screen.findAllByText('-25.0%')).length).toBeGreaterThan(0);
  });
});
