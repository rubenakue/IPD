import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useParams } from 'react-router';
import { RoleBadge } from '../components/domain/RoleBadge.tsx';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanels.tsx';
import { useAddAgent } from '../hooks/useAddAgent.ts';
import { useProjectAgents } from '../hooks/useProjectAgents.ts';
import { useUpdateAgent } from '../hooks/useUpdateAgent.ts';
import { ApiError } from '../lib/api/client.ts';
import { roleLabel } from '../lib/roles.ts';
import type { AgentView, ProjectRoleCode } from '../types/api.ts';

const ROLES: ProjectRoleCode[] = [
  'PROMOTER',
  'PROJECT_MANAGER',
  'CONSTRUCTOR',
  'DESIGNER',
  'OBSERVER',
];
const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: roleLabel(role) }));

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/** Campo editable del % de reparto de un agente; persiste al perder el foco si cambió. */
function EditableShare({ projectId, agent }: { projectId: string; agent: AgentView }) {
  const updateAgent = useUpdateAgent(projectId);
  const [value, setValue] = useState<number | string>(agent.sharePercent);

  return (
    <NumberInput
      aria-label={`Reparto de ${agent.email}`}
      value={value}
      min={0}
      max={100}
      w={90}
      onChange={setValue}
      onBlur={() => {
        const next = typeof value === 'number' ? value : Number(value);
        // Campo vacío o no numérico: revertimos al valor actual en vez de persistir un
        // 0 accidental al perder el foco.
        if (value === '' || !Number.isFinite(next)) {
          setValue(agent.sharePercent);
          return;
        }
        if (next !== agent.sharePercent) {
          updateAgent.mutate({ agentId: agent.id, input: { sharePercent: next } });
        }
      }}
    />
  );
}

export function ProjectAgentsPage() {
  const { projectId } = useParams();
  const id = projectId ?? '';
  const { data, isPending, isError, refetch, isRefetching } = useProjectAgents(id);
  const addAgent = useAddAgent(id);

  const addForm = useForm({
    initialValues: {
      email: '',
      role: 'CONSTRUCTOR' as ProjectRoleCode,
      sharePercent: 0,
      guaranteedFeeEuros: 0,
      feeAtRiskEuros: 0,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Introduce un email válido.'),
    },
  });

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const { agents, shareSum, isComplete } = data;

  const handleAdd = addForm.onSubmit((values) => {
    // Los NumberInput pueden quedar vacíos ('') al borrarlos; coercemos a número para
    // no enviar cadenas vacías al contrato (que espera números) ni un NaN.
    const toCents = (euros: number | string) => Math.round((Number(euros) || 0) * 100);
    addAgent.mutate(
      {
        email: values.email.trim(),
        role: values.role,
        sharePercent: Number(values.sharePercent) || 0,
        guaranteedFeeCents: toCents(values.guaranteedFeeEuros),
        feeAtRiskCents: toCents(values.feeAtRiskEuros),
      },
      { onSuccess: () => addForm.reset() },
    );
  });

  const addError = addAgent.error instanceof ApiError ? addAgent.error.message : null;

  return (
    <Stack>
      <Title order={2}>Agentes del proyecto</Title>

      {agents.length === 0 ? (
        <EmptyState title="Aún no hay agentes" description="Añade los participantes del proyecto." />
      ) : (
        <Paper withBorder radius="md">
          <Table verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Agente</Table.Th>
                <Table.Th>Rol</Table.Th>
                <Table.Th>Reparto FRC (%)</Table.Th>
                <Table.Th>Honorarios base</Table.Th>
                <Table.Th>Honorarios en riesgo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {agents.map((agent) => (
                <Table.Tr key={agent.id}>
                  <Table.Td>{agent.email}</Table.Td>
                  <Table.Td>
                    <RoleBadge role={agent.role} />
                  </Table.Td>
                  <Table.Td>
                    <EditableShare key={`${agent.id}:${agent.sharePercent}`} projectId={id} agent={agent} />
                  </Table.Td>
                  <Table.Td>{formatEuros(agent.guaranteedFeeCents)}</Table.Td>
                  <Table.Td>{formatEuros(agent.feeAtRiskCents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Group justify="space-between" align="center">
        <Text fw={600}>Suma de reparto FRC: {shareSum}%</Text>
        {!isComplete && (
          <Alert color="yellow" variant="light">
            La suma debe ser 100% para completar la configuración (actual: {shareSum}%).
          </Alert>
        )}
      </Group>

      <Paper withBorder p="md" radius="md">
        <form onSubmit={handleAdd}>
          <Stack>
            <Title order={4}>Añadir agente</Title>
            <Group grow>
              <TextInput
                label="Email del usuario"
                placeholder="nombre@empresa.com"
                {...addForm.getInputProps('email')}
              />
              <Select label="Rol" data={ROLE_OPTIONS} allowDeselect={false} {...addForm.getInputProps('role')} />
            </Group>
            <Group grow>
              <NumberInput label="Reparto FRC (%)" min={0} max={100} {...addForm.getInputProps('sharePercent')} />
              <NumberInput
                label="Honorarios base (€)"
                min={0}
                decimalScale={2}
                {...addForm.getInputProps('guaranteedFeeEuros')}
              />
              <NumberInput
                label="Honorarios en riesgo (€)"
                min={0}
                decimalScale={2}
                {...addForm.getInputProps('feeAtRiskEuros')}
              />
            </Group>
            {addError && (
              <Alert color="red" variant="light">
                {addError}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button type="submit" loading={addAgent.isPending}>
                Añadir agente
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Group justify="flex-end">
        <Button
          disabled={!isComplete}
          loading={isRefetching}
          onClick={async () => {
            // Revalidamos contra el servidor: otra sesión pudo cambiar el reparto desde
            // que se cargó la página, así que no declaramos "completo" con datos obsoletos.
            const fresh = await refetch();
            if (fresh.data?.isComplete) {
              notifications.show({ color: 'green', message: 'Configuración de agentes completa.' });
            } else {
              notifications.show({
                color: 'yellow',
                message: `La suma de reparto ya no es 100% (actual: ${fresh.data?.shareSum ?? '—'}%). Revisa los agentes.`,
              });
            }
          }}
        >
          Confirmar configuración
        </Button>
      </Group>
    </Stack>
  );
}
