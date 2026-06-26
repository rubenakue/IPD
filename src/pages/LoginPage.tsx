import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router';
import { useLogin } from '../hooks/useLogin.ts';
import { ApiError } from '../lib/api/client.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Introduce un email válido.'),
      password: (value) => (value.length > 0 ? null : 'Introduce tu contraseña.'),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate('/projects', { replace: true }),
    });
  });

  // El servidor devuelve un mensaje genérico en español que no distingue qué campo
  // falló (FR-005); lo mostramos tal cual.
  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.isError
        ? 'No se pudo iniciar sesión.'
        : null;

  return (
    <Container size="xs" py="xl">
      <Title order={1} mb="xs">
        Acceso a Control Económico
      </Title>
      <Text c="dimmed" mb="lg">
        Introduce tus credenciales de acceso seguro.
      </Text>
      <Paper withBorder p="lg" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Usuario corporativo"
              placeholder="nombre@empresa.com"
              {...form.getInputProps('email')}
            />
            <PasswordInput label="Contraseña" {...form.getInputProps('password')} />
            {errorMessage && (
              <Alert color="red" variant="light">
                {errorMessage}
              </Alert>
            )}
            <Button type="submit" loading={login.isPending} fullWidth>
              Iniciar sesión
            </Button>
          </Stack>
        </form>
      </Paper>
      <Text c="dimmed" size="sm" mt="md">
        Entorno restringido. No existe registro público: solicita credenciales al administrador del
        proyecto.
      </Text>
    </Container>
  );
}
