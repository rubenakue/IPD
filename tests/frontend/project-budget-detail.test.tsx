// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
    totalBaseAmountCents: 1_000_00,
    chapters: [
      {
        chapterCode: '01',
        chapterName: 'Cimentacion',
        subtotalBaseAmountCents: 1_000_00,
        lines: [
          {
            id: 'l1',
            chapterCode: '01',
            chapterName: 'Cimentacion',
            code: '01.01',
            name: 'Excavacion',
            baseAmountCents: 1_000_00,
          },
        ],
      },
    ],
  },
};

const detail: BudgetLineDetailView = {
  id: 'l1',
  chapterCode: '01',
  chapterName: 'Cimentacion',
  code: '01.01',
  name: 'Excavacion',
  baseAmountCents: 1_000_00,
  progressPercent: 40,
  progressUpdatedAt: new Date('2026-06-29T11:00:00Z').toISOString(),
  accumulatedCostCents: 150_00,
  costs: [
    {
      id: 'c1',
      amountCents: 150_00,
      type: 'NORMAL',
      description: 'Factura hormigon',
      reason: null,
      incurredOn: '2026-06-20',
      recordedByName: 'Ana',
      createdAt: new Date('2026-06-20T09:00:00Z').toISOString(),
      voided: false,
      reversalOfId: null,
    },
  ],
};

// Con el presupuesto APROBADO, la página muestra la tabla económica (S15), que se nutre de
// GET /budget/economics. El botón "Detalle" de la fila l1 abre el modal de detalle.
const economicsResponse: ProjectEconomicsResponse = {
  budgetStatus: 'APPROVED',
  canUpdateForecast: false,
  chapters: [
    {
      chapterCode: '01',
      chapterName: 'Cimentacion',
      currentBudgetCents: 1_000_00,
      accumulatedCostCents: 150_00,
      forecastCents: 1_000_00,
      varianceCents: 0,
      variancePercent: 0,
      alertLevel: 'normal',
      lines: [
        {
          id: 'l1', code: '01.01', name: 'Excavacion', baseAmountCents: 1_000_00, adjustmentsCents: 0,
          progressPercent: 40, manualForecastCents: null,
          currentBudgetCents: 1_000_00, accumulatedCostCents: 150_00, forecastCents: 1_000_00,
          varianceCents: 0, variancePercent: 0, alertLevel: 'normal',
        },
      ],
    },
  ],
  totals: {
    currentBudgetCents: 1_000_00, accumulatedCostCents: 150_00, forecastCents: 1_000_00,
    varianceCents: 0, variancePercent: 0, alertLevel: 'normal',
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
      if (urlStr.includes('/budget/lines/l1')) return jsonResponse(detail);
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

describe('ProjectBudgetPage — detalle de partida', () => {
  it('abre el detalle y muestra el historial de costes y el acumulado', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Detalle' }));

    expect(await screen.findByText('Factura hormigon')).toBeInTheDocument();
    expect(screen.getByText(/Coste real acumulado/)).toBeInTheDocument();
    expect(screen.getByText(/Avance: 40%/)).toBeInTheDocument();
  });
});
