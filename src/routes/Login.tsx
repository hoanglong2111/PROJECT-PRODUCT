import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { useI18n } from '../i18n';

type LoginForm = {
  email: string;
  password: string;
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginForm>({
    initialValues: {
      email: 'manager@kbfe.local',
      password: 'manager123',
    },
    validate: {
      email: (value) => (value.trim().length === 0 ? t('login.emailRequired') : null),
      password: (value) => (value.trim().length === 0 ? t('login.passwordRequired') : null),
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  return (
    <Stack h="100vh" align="center" justify="center" p="md">
      <Paper withBorder p="xl" w="100%" maw={440}>
        <Stack>
          <div>
            <Title order={2}>{t('login.title')}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {t('login.description')}
            </Text>
          </div>

          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            {t('login.sampleAccount')} <strong>manager@kbfe.local / manager123</strong>
          </Alert>

          {error ? (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          ) : null}

          <form
            onSubmit={form.onSubmit(async (values) => {
              setError(null);
              setIsSubmitting(true);
              try {
                await login(values);
                navigate(fromPath, { replace: true });
              } catch {
                setError(t('login.invalidCredentials'));
              } finally {
                setIsSubmitting(false);
              }
            })}
          >
            <Stack>
              <TextInput label="Email" placeholder="manager@kbfe.local" {...form.getInputProps('email')} />
              <PasswordInput label={t('common.password')} placeholder="••••••••" {...form.getInputProps('password')} />
              <Button type="submit" loading={isSubmitting}>
                {t('login.submit')}
              </Button>
            </Stack>
          </form>

          <Text size="sm" c="dimmed">
            {t('login.alternativeAccount')} <Anchor component="span">admin@kbfe.local / admin123</Anchor>
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
}
