import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router';
import { useCreateProject } from '../hooks/useCreateProject.ts';
import { ApiError } from '../lib/api/client.ts';

export function NewProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const form = useForm({
    initialValues: { name: '', code: '', clientName: '', description: '' },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Introduce un nombre.'),
      code: (value) => (value.trim().length > 0 ? null : 'Introduce un código.'),
      clientName: (value) => (value.trim().length > 0 ? null : 'Introduce el cliente.'),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    createProject.mutate(
      {
        name: values.name.trim(),
        code: values.code.trim(),
        clientName: values.clientName.trim(),
        description: values.description.trim() || undefined,
      },
      {
        // Tras crear, el flujo A continúa configurando los agentes del proyecto.
        onSuccess: (project) => navigate(`/projects/${project.id}/agents`),
      },
    );
  });

  const errorMessage =
    createProject.error instanceof ApiError
      ? createProject.error.message
      : createProject.isError
        ? 'No se pudo crear el proyecto.'
        : null;

  return (
    <Container size="sm" py="xl">
      <Title order={1} mb="lg">
        Nuevo proyecto
      </Title>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput label="Nombre del proyecto" {...form.getInputProps('name')} />
            <TextInput label="Código" placeholder="PRJ-2026-001" {...form.getInputProps('code')} />
            <TextInput label="Cliente" {...form.getInputProps('clientName')} />
            <Textarea label="Descripción (opcional)" rows={3} {...form.getInputProps('description')} />
            {errorMessage && (
              <Alert color="red" variant="light">
                {errorMessage}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={() => navigate('/projects')}>
                Cancelar
              </Button>
              <Button type="submit" loading={createProject.isPending}>
                Crear proyecto
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
