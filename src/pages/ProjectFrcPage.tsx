import { Badge, Card, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useParams } from 'react-router';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanels.tsx';
import { useProjectFrc } from '../hooks/useProjectFrc.ts';
import type {
  FrcAgentRow,
  FrcFundStatus,
  ProjectFrcResponse,
  ProjectRoleCode,
} from '../types/api.ts';

const ROLE_LABEL: Record<ProjectRoleCode, string> = {
  PROMOTER: 'Promotor',
  DESIGNER: 'Proyectista',
  CONSTRUCTOR: 'Constructor',
  PROJECT_MANAGER: 'Project Manager',
  OBSERVER: 'Observador',
};

const FUND_STATUS: Record<FrcFundStatus, { label: string; color: string }> = {
  bonus: { label: 'Bonus (ahorro)', color: 'teal' },
  malus: { label: 'Malus (sobrecoste)', color: 'red' },
  neutral: { label: 'Neutro (equilibrio)', color: 'gray' },
};

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function FundStatusBadge({ status }: { status: FrcFundStatus }) {
  const s = FUND_STATUS[status];
  return (
    <Badge color={s.color} variant="light" size="lg">
      {s.label}
    </Badge>
  );
}

function DeviationText({ deviationCents }: { deviationCents: number }) {
  const kind = deviationCents > 0 ? 'ahorro' : deviationCents < 0 ? 'sobrecoste' : 'equilibrio';
  return (
    <Text>
      Desviación total: <Text span fw={700}>{formatEuros(deviationCents)}</Text>{' '}
      <Text span c="dimmed">({kind})</Text>
    </Text>
  );
}

function AgentRowCells({ row }: { row: FrcAgentRow }) {
  return (
    <>
      <Table.Td>{row.displayName}</Table.Td>
      <Table.Td>{ROLE_LABEL[row.role]}</Table.Td>
      <Table.Td ta="right" c={row.bonusMalusCents < 0 ? 'red' : row.bonusMalusCents > 0 ? 'teal' : undefined}>
        {formatEuros(row.bonusMalusCents)}
      </Table.Td>
      <Table.Td ta="right">{formatEuros(row.guaranteedFeeCents)}</Table.Td>
      <Table.Td ta="right" fw={600}>{formatEuros(row.totalCents)}</Table.Td>
    </>
  );
}

function GlobalView({ agents }: { agents: FrcAgentRow[] }) {
  if (agents.length === 0) {
    return <EmptyState title="Sin reparto" description="No hay agentes que participen en el fondo." />;
  }
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Agente</Table.Th>
          <Table.Th>Rol</Table.Th>
          <Table.Th ta="right">Bonus/Malus</Table.Th>
          <Table.Th ta="right">Honorarios garantizados</Table.Th>
          <Table.Th ta="right">Total proyectado</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {agents.map((row) => (
          <Table.Tr key={row.agentId}>
            <AgentRowCells row={row} />
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function OwnView({ own }: { own: FrcAgentRow | null }) {
  if (!own) {
    return (
      <EmptyState
        title="Sin resultado propio"
        description="Aún no hay datos de reparto para tu resultado en el fondo."
      />
    );
  }
  return (
    <Card withBorder padding="lg" maw={480}>
      <Stack gap="xs">
        <Text fw={700}>{own.displayName}</Text>
        <Text c="dimmed" size="sm">{ROLE_LABEL[own.role]}</Text>
        <Group justify="space-between">
          <Text>Bonus/Malus</Text>
          <Text fw={600} c={own.bonusMalusCents < 0 ? 'red' : own.bonusMalusCents > 0 ? 'teal' : undefined}>
            {formatEuros(own.bonusMalusCents)}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text>Honorarios garantizados</Text>
          <Text>{formatEuros(own.guaranteedFeeCents)}</Text>
        </Group>
        <Group justify="space-between">
          <Text fw={600}>Total proyectado</Text>
          <Text fw={700}>{formatEuros(own.totalCents)}</Text>
        </Group>
      </Stack>
    </Card>
  );
}

function FrcContent({ data }: { data: ProjectFrcResponse }) {
  if (data.budgetStatus !== 'APPROVED') {
    return (
      <Stack gap="md">
        <Group>
          <Text>Estado del fondo:</Text>
          <FundStatusBadge status={data.fundStatus} />
        </Group>
        <EmptyState
          title="Sin presupuesto aprobado"
          description="El FRC necesita un presupuesto aprobado con previsión a cierre para calcular el reparto."
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <Text>Estado del fondo:</Text>
        <FundStatusBadge status={data.fundStatus} />
      </Group>

      {data.visibility === 'global' && (
        <>
          <DeviationText deviationCents={data.deviationCents} />
          <GlobalView agents={data.agents} />
        </>
      )}

      {data.visibility === 'own' && (
        <>
          <DeviationText deviationCents={data.deviationCents} />
          <OwnView own={data.own} />
        </>
      )}

      {data.visibility === 'aggregate' && (
        <Text c="dimmed">Tu rol solo tiene acceso al estado agregado del fondo.</Text>
      )}
    </Stack>
  );
}

export function ProjectFrcPage() {
  const { projectId } = useParams();
  const { data, isPending, isError, refetch } = useProjectFrc(projectId ?? '');

  return (
    <Stack gap="lg">
      <Title order={2}>Fondo de Riesgo Compartido (FRC)</Title>
      <Paper withBorder p="lg">
        {isPending && <LoadingState />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {data && <FrcContent data={data} />}
      </Paper>
    </Stack>
  );
}
