import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
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
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanels.tsx';
import { useAddBudgetLine } from '../hooks/useAddBudgetLine.ts';
import { useApproveBudget } from '../hooks/useApproveBudget.ts';
import { useDeleteBudgetLine } from '../hooks/useDeleteBudgetLine.ts';
import { useProjectBudget } from '../hooks/useProjectBudget.ts';
import { useUpdateBudgetLine } from '../hooks/useUpdateBudgetLine.ts';
import { ApiError } from '../lib/api/client.ts';
import type { BudgetLineInput, BudgetLineView, BudgetView } from '../types/api.ts';

interface LineFormValues {
  chapterCode: string;
  chapterName: string;
  code: string;
  name: string;
  baseAmountEuros: number | string;
}

const emptyLineForm: LineFormValues = {
  chapterCode: '',
  chapterName: '',
  code: '',
  name: '',
  baseAmountEuros: 0,
};

// Validación compartida por el formulario de alta y el de edición: así el modal de edición
// valida igual que el alta (antes no validaba) y un importe vacío no se envía como 0 silencioso.
const lineValidation = {
  chapterCode: (value: string) => (value.trim() ? null : 'Indica el codigo de capitulo.'),
  chapterName: (value: string) => (value.trim() ? null : 'Indica el nombre de capitulo.'),
  code: (value: string) => (value.trim() ? null : 'Indica el codigo de partida.'),
  name: (value: string) => (value.trim() ? null : 'Indica el nombre de partida.'),
  baseAmountEuros: (value: number | string) => {
    const amount = Number(value);
    if (value === '' || !Number.isFinite(amount)) return 'Indica un importe valido.';
    if (amount < 0) return 'El importe no puede ser negativo.';
    return null;
  },
};

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function toCents(value: number | string): number {
  return Math.round((Number(value) || 0) * 100);
}

function toInput(values: LineFormValues): BudgetLineInput {
  return {
    chapterCode: values.chapterCode.trim(),
    chapterName: values.chapterName.trim(),
    code: values.code.trim(),
    name: values.name.trim(),
    baseAmountCents: toCents(values.baseAmountEuros),
  };
}

function errorMessage(error: unknown): string | null {
  return error instanceof ApiError ? error.message : null;
}

function BudgetTable({
  budget,
  canEdit,
  onEdit,
  onDelete,
  deletingLineId,
}: {
  budget: BudgetView;
  canEdit: boolean;
  onEdit: (line: BudgetLineView) => void;
  onDelete: (lineId: string) => void;
  deletingLineId: string | null;
}) {
  return (
    <Paper withBorder radius="md">
      <Table verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Codigo</Table.Th>
            <Table.Th>Partida</Table.Th>
            <Table.Th ta="right">Importe base</Table.Th>
            {canEdit && <Table.Th ta="right">Acciones</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        {budget.chapters.map((chapter) => (
          <Table.Tbody key={chapter.chapterCode}>
            <Table.Tr bg="gray.0">
              <Table.Td colSpan={2}>
                <Text fw={700}>
                  {chapter.chapterCode} · {chapter.chapterName}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Text fw={700}>{formatEuros(chapter.subtotalBaseAmountCents)}</Text>
              </Table.Td>
              {canEdit && <Table.Td />}
            </Table.Tr>
            {chapter.lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>{line.code}</Table.Td>
                <Table.Td>{line.name}</Table.Td>
                <Table.Td ta="right">{formatEuros(line.baseAmountCents)}</Table.Td>
                {canEdit && (
                  <Table.Td>
                    <Group justify="flex-end" gap="xs">
                      <Button size="xs" variant="default" onClick={() => onEdit(line)}>
                        Editar
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        loading={deletingLineId === line.id}
                        onClick={() => onDelete(line.id)}
                      >
                        Borrar
                      </Button>
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        ))}
        <Table.Tfoot>
          <Table.Tr>
            <Table.Th colSpan={2}>Total presupuesto base</Table.Th>
            <Table.Th ta="right">{formatEuros(budget.totalBaseAmountCents)}</Table.Th>
            {canEdit && <Table.Th />}
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Paper>
  );
}

export function ProjectBudgetPage() {
  const { projectId } = useParams();
  const id = projectId ?? '';
  const { data, isPending, isError, refetch } = useProjectBudget(id);
  const addLine = useAddBudgetLine(id);
  const updateLine = useUpdateBudgetLine(id);
  const deleteLine = useDeleteBudgetLine(id);
  const approveBudget = useApproveBudget(id);
  const [editingLine, setEditingLine] = useState<BudgetLineView | null>(null);
  const [deletingLineId, setDeletingLineId] = useState<string | null>(null);

  const addForm = useForm<LineFormValues>({ initialValues: emptyLineForm, validate: lineValidation });
  const editForm = useForm<LineFormValues>({ initialValues: emptyLineForm, validate: lineValidation });

  if (isPending) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const budget = data.budget;
  const canEdit = data.canManageBudget && budget?.status !== 'APPROVED';
  const addError = errorMessage(addLine.error);
  const editError = errorMessage(updateLine.error);
  const deleteError = errorMessage(deleteLine.error);
  const approveError = errorMessage(approveBudget.error);

  const openEdit = (line: BudgetLineView) => {
    setEditingLine(line);
    editForm.setValues({
      chapterCode: line.chapterCode,
      chapterName: line.chapterName,
      code: line.code,
      name: line.name,
      baseAmountEuros: line.baseAmountCents / 100,
    });
  };

  const submitAdd = addForm.onSubmit((values) => {
    addLine.mutate(toInput(values), { onSuccess: () => addForm.setValues(emptyLineForm) });
  });

  const submitEdit = editForm.onSubmit((values) => {
    if (!editingLine) return;
    updateLine.mutate(
      { lineId: editingLine.id, input: toInput(values) },
      {
        onSuccess: () => {
          setEditingLine(null);
          editForm.setValues(emptyLineForm);
        },
      },
    );
  });

  const handleDelete = (lineId: string) => {
    setDeletingLineId(lineId);
    deleteLine.mutate(lineId, {
      onSettled: () => setDeletingLineId(null),
    });
  };

  const handleApprove = () => {
    approveBudget.mutate(undefined, {
      onSuccess: () => notifications.show({ color: 'green', message: 'Presupuesto aprobado.' }),
    });
  };

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Presupuesto objetivo</Title>
          <Text c="dimmed" size="sm">
            Linea base economica del proyecto, agrupada por capitulos.
          </Text>
        </Stack>
        {budget && (
          <Badge color={budget.status === 'APPROVED' ? 'green' : 'yellow'} variant="light">
            {budget.status === 'APPROVED' ? 'Aprobado' : 'Borrador'}
          </Badge>
        )}
      </Group>

      {!budget && (
        <EmptyState
          title="Sin presupuesto cargado"
          description={
            data.canManageBudget
              ? 'Anade la primera partida para crear el borrador.'
              : 'El Project Manager todavia no ha cargado el presupuesto.'
          }
        />
      )}

      {budget && (
        <BudgetTable
          budget={budget}
          canEdit={canEdit}
          onEdit={openEdit}
          onDelete={handleDelete}
          deletingLineId={deletingLineId}
        />
      )}

      {deleteError && (
        <Alert color="red" variant="light">
          {deleteError}
        </Alert>
      )}

      {canEdit && (
        <Paper withBorder p="md" radius="md">
          <form onSubmit={submitAdd}>
            <Stack>
              <Title order={4}>Anadir partida</Title>
              <Group grow align="flex-start">
                <TextInput label="Codigo capitulo" {...addForm.getInputProps('chapterCode')} />
                <TextInput label="Capitulo" {...addForm.getInputProps('chapterName')} />
              </Group>
              <Group grow align="flex-start">
                <TextInput label="Codigo partida" {...addForm.getInputProps('code')} />
                <TextInput label="Partida" {...addForm.getInputProps('name')} />
                <NumberInput
                  label="Importe base (EUR)"
                  min={0}
                  decimalScale={2}
                  {...addForm.getInputProps('baseAmountEuros')}
                />
              </Group>
              {addError && (
                <Alert color="red" variant="light">
                  {addError}
                </Alert>
              )}
              <Group justify="flex-end">
                <Button type="submit" loading={addLine.isPending}>
                  Anadir partida
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      {budget && data.canManageBudget && (
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text fw={700}>Aprobacion de linea base</Text>
              <Text c="dimmed" size="sm">
                Al aprobar, las partidas y sus importes base quedan inmutables.
              </Text>
            </Stack>
            <Button
              disabled={budget.status === 'APPROVED'}
              loading={approveBudget.isPending}
              onClick={handleApprove}
            >
              Aprobar presupuesto
            </Button>
          </Group>
          {approveError && (
            <Alert color="red" variant="light" mt="md">
              {approveError}
            </Alert>
          )}
        </Paper>
      )}

      <Modal
        opened={editingLine !== null}
        onClose={() => setEditingLine(null)}
        title="Editar partida"
      >
        <form onSubmit={submitEdit}>
          <Stack>
            <TextInput label="Codigo capitulo" {...editForm.getInputProps('chapterCode')} />
            <TextInput label="Capitulo" {...editForm.getInputProps('chapterName')} />
            <TextInput label="Codigo partida" {...editForm.getInputProps('code')} />
            <TextInput label="Partida" {...editForm.getInputProps('name')} />
            <NumberInput
              label="Importe base (EUR)"
              min={0}
              decimalScale={2}
              {...editForm.getInputProps('baseAmountEuros')}
            />
            {editError && (
              <Alert color="red" variant="light">
                {editError}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditingLine(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={updateLine.isPending}>
                Guardar
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
