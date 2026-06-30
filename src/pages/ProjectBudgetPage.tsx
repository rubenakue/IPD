import {
  Alert,
  Badge,
  Button,
  Divider,
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
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/StatePanels.tsx';
import { useAddBudgetLine } from '../hooks/useAddBudgetLine.ts';
import { useAddRealCost } from '../hooks/useAddRealCost.ts';
import { useApproveBudget } from '../hooks/useApproveBudget.ts';
import { useBudgetLineDetail } from '../hooks/useBudgetLineDetail.ts';
import { useDeleteBudgetLine } from '../hooks/useDeleteBudgetLine.ts';
import { useProjectBudget } from '../hooks/useProjectBudget.ts';
import { useReverseRealCost } from '../hooks/useReverseRealCost.ts';
import { useUpdateBudgetLine } from '../hooks/useUpdateBudgetLine.ts';
import { useUpdateProgress } from '../hooks/useUpdateProgress.ts';
import { ApiError } from '../lib/api/client.ts';
import type { BudgetLineInput, BudgetLineView, BudgetView, RealCostView } from '../types/api.ts';

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  onOpenDetail,
  deletingLineId,
}: {
  budget: BudgetView;
  canEdit: boolean;
  onEdit: (line: BudgetLineView) => void;
  onDelete: (lineId: string) => void;
  onOpenDetail: (lineId: string) => void;
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
            <Table.Th ta="right">Acciones</Table.Th>
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
              <Table.Td />
            </Table.Tr>
            {chapter.lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>{line.code}</Table.Td>
                <Table.Td>{line.name}</Table.Td>
                <Table.Td ta="right">{formatEuros(line.baseAmountCents)}</Table.Td>
                <Table.Td>
                  <Group justify="flex-end" gap="xs">
                    <Button size="xs" variant="light" onClick={() => onOpenDetail(line.id)}>
                      Detalle
                    </Button>
                    {canEdit && (
                      <>
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
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        ))}
        <Table.Tfoot>
          <Table.Tr>
            <Table.Th colSpan={2}>Total presupuesto base</Table.Th>
            <Table.Th ta="right">{formatEuros(budget.totalBaseAmountCents)}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Paper>
  );
}

interface CostFormValues {
  amountEuros: number | string;
  incurredOn: string;
  description: string;
}

/** Detalle de una partida: historial de asientos, acumulado, avance e imputación. */
function LineDetailModal({
  projectId,
  lineId,
  canRecordRealCost,
  canReverse,
  onClose,
}: {
  projectId: string;
  lineId: string | null;
  canRecordRealCost: boolean;
  canReverse: boolean;
  onClose: () => void;
}) {
  const detail = useBudgetLineDetail(projectId, lineId);
  const addCost = useAddRealCost(projectId, lineId ?? '');
  const updateProgress = useUpdateProgress(projectId, lineId ?? '');
  const reverseCost = useReverseRealCost(projectId, lineId ?? '');

  const [progressValue, setProgressValue] = useState<number | string>(0);
  const [reverseTarget, setReverseTarget] = useState<RealCostView | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const costForm = useForm<CostFormValues>({
    initialValues: { amountEuros: '', incurredOn: todayIso(), description: '' },
    validate: {
      amountEuros: (value) => {
        const amount = Number(value);
        if (value === '' || !Number.isFinite(amount) || amount <= 0)
          return 'Indica un importe mayor que 0.';
        return null;
      },
      incurredOn: (value) => (value ? null : 'Indica la fecha.'),
      description: (value) => (value.trim() ? null : 'Indica una descripcion.'),
    },
  });

  // Sincroniza el control de avance con el valor actual de la partida al cargar/cambiar.
  useEffect(() => {
    setProgressValue(detail.data?.progressPercent ?? 0);
  }, [detail.data?.progressPercent, lineId]);

  const data = detail.data;
  const costError = errorMessage(addCost.error) ?? errorMessage(reverseCost.error);
  const progressError = errorMessage(updateProgress.error);

  const submitCost = costForm.onSubmit((values) => {
    addCost.mutate(
      {
        amountCents: toCents(values.amountEuros),
        incurredOn: values.incurredOn,
        description: values.description.trim(),
      },
      { onSuccess: () => costForm.setValues({ amountEuros: '', incurredOn: todayIso(), description: '' }) },
    );
  });

  const submitProgress = () => {
    const percent = Number(progressValue);
    if (!Number.isFinite(percent)) return;
    updateProgress.mutate({ progressPercent: percent });
  };

  const confirmReverse = () => {
    if (!reverseTarget || !reverseReason.trim()) return;
    reverseCost.mutate(
      { costId: reverseTarget.id, reason: reverseReason.trim() },
      {
        onSuccess: () => {
          setReverseTarget(null);
          setReverseReason('');
        },
      },
    );
  };

  return (
    <Modal opened={lineId !== null} onClose={onClose} size="lg" title="Detalle de partida">
      {detail.isPending && <LoadingState />}
      {detail.isError && <ErrorState onRetry={() => void detail.refetch()} />}
      {data && (
        <Stack>
          <Stack gap={2}>
            <Title order={4}>
              {data.code} · {data.name}
            </Title>
            <Text c="dimmed" size="sm">
              {data.chapterCode} · {data.chapterName} · base {formatEuros(data.baseAmountCents)}
            </Text>
          </Stack>

          <Group justify="space-between">
            <Text fw={700}>Coste real acumulado: {formatEuros(data.accumulatedCostCents)}</Text>
            <Text c="dimmed" size="sm">
              Avance: {data.progressPercent === null ? 'sin registrar' : `${data.progressPercent}%`}
            </Text>
          </Group>

          {canRecordRealCost && (
            <Group align="flex-end" gap="sm">
              <NumberInput
                label="Avance fisico (%)"
                min={0}
                max={100}
                w={160}
                value={progressValue}
                onChange={setProgressValue}
              />
              <Button variant="default" loading={updateProgress.isPending} onClick={submitProgress}>
                Actualizar avance
              </Button>
            </Group>
          )}
          {progressError && (
            <Alert color="red" variant="light">
              {progressError}
            </Alert>
          )}

          <Divider label="Asientos" />
          {data.costs.length === 0 ? (
            <Text c="dimmed" size="sm">
              Sin costes imputados todavia.
            </Text>
          ) : (
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Concepto</Table.Th>
                  <Table.Th ta="right">Importe</Table.Th>
                  <Table.Th>Autor</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.costs.map((cost) => (
                  <Table.Tr key={cost.id} c={cost.voided ? 'dimmed' : undefined}>
                    <Table.Td>{cost.incurredOn}</Table.Td>
                    <Table.Td>
                      <Text td={cost.voided ? 'line-through' : undefined} size="sm">
                        {cost.type === 'REVERSAL' ? `Anulacion: ${cost.reason ?? ''}` : cost.description}
                      </Text>
                      {cost.voided && (
                        <Badge size="xs" color="gray" variant="light">
                          anulado
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">{formatEuros(cost.amountCents)}</Table.Td>
                    <Table.Td>{cost.recordedByName}</Table.Td>
                    <Table.Td>
                      {canReverse && cost.type === 'NORMAL' && !cost.voided && (
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() => {
                            setReverseTarget(cost);
                            setReverseReason('');
                          }}
                        >
                          Anular
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {canRecordRealCost && (
            <>
              <Divider label="Imputar coste" />
              <form onSubmit={submitCost}>
                <Stack>
                  <Group grow align="flex-start">
                    <NumberInput
                      label="Importe (EUR)"
                      min={0}
                      decimalScale={2}
                      {...costForm.getInputProps('amountEuros')}
                    />
                    <TextInput
                      type="date"
                      label="Fecha"
                      {...costForm.getInputProps('incurredOn')}
                    />
                  </Group>
                  <TextInput label="Descripcion" {...costForm.getInputProps('description')} />
                  {costError && (
                    <Alert color="red" variant="light">
                      {costError}
                    </Alert>
                  )}
                  <Group justify="flex-end">
                    <Button type="submit" loading={addCost.isPending}>
                      Imputar coste
                    </Button>
                  </Group>
                </Stack>
              </form>
            </>
          )}
        </Stack>
      )}

      <Modal
        opened={reverseTarget !== null}
        onClose={() => setReverseTarget(null)}
        title="Anular coste"
      >
        <Stack>
          <Text size="sm">
            Se creara un contra-asiento por {reverseTarget && formatEuros(-reverseTarget.amountCents)}.
            Indica el motivo (obligatorio).
          </Text>
          <TextInput
            label="Motivo"
            value={reverseReason}
            onChange={(event) => setReverseReason(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReverseTarget(null)}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={reverseCost.isPending}
              disabled={!reverseReason.trim()}
              onClick={confirmReverse}
            >
              Anular
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
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
  const [detailLineId, setDetailLineId] = useState<string | null>(null);

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
          onOpenDetail={setDetailLineId}
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

      <LineDetailModal
        projectId={id}
        lineId={detailLineId}
        canRecordRealCost={data.canRecordRealCost}
        canReverse={data.canManageBudget}
        onClose={() => setDetailLineId(null)}
      />
    </Stack>
  );
}
