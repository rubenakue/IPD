// @vitest-environment jsdom
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectAgentsPage } from '../../src/pages/ProjectAgentsPage.tsx';
import type { ProjectAgentsResponse } from '../../src/types/api.ts';

function renderWith(response: ProjectAgentsResponse) {
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
        <MemoryRouter initialEntries={['/projects/p1/agents']}>
          <Routes>
            <Route path="/projects/:projectId/agents" element={<ProjectAgentsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

const agent = {
  id: 'a1',
  userId: 'u1',
  email: 'constructor@ipd.demo',
  displayName: 'Constructor',
  role: 'CONSTRUCTOR' as const,
  sharePercent: 100,
  guaranteedFeeCents: 0,
  feeAtRiskCents: 0,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProjectAgentsPage', () => {
  it('habilita "Confirmar configuración" cuando la suma de reparto es 100%', async () => {
    renderWith({ agents: [agent], shareSum: 100, isComplete: true });
    const button = await screen.findByRole('button', { name: 'Confirmar configuración' });
    expect(button).toBeEnabled();
  });

  it('deshabilita "Confirmar configuración" y avisa cuando la suma no es 100%', async () => {
    renderWith({ agents: [{ ...agent, sharePercent: 90 }], shareSum: 90, isComplete: false });
    const button = await screen.findByRole('button', { name: 'Confirmar configuración' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/La suma debe ser 100%/)).toBeInTheDocument();
  });
});
