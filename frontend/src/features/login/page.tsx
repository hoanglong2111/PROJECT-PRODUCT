import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';
import { getPreferredModulePath } from '@shared/navigation/workspaceModules';

type LoginForm = {
  email: string;
  password: string;
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, user } = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<LoginForm>({
    initialValues: {
      email: 'admin@kbfe.local',
      password: 'admin123',
    },
    validate: {
      email: (value) => (value.trim().length === 0 ? t('login.emailRequired') : null),
      password: (value) => (value.trim().length === 0 ? t('login.passwordRequired') : null),
    },
  });

  if (isAuthenticated) {
    return <Navigate to={user ? getPreferredModulePath(user) : '/'} replace />;
  }

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  return (
    <Stack className="login-page-shell" align="center" justify="center" p="md">
      <Paper className="login-card" p="xl" w="100%" maw={440}>
        <Stack>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <img src="/brand/fds_logo.png" alt="FDS" style={{ height: '3.5rem', width: 'auto', objectFit: 'contain', marginBottom: '0.5rem' }} />
            <Title order={2} ta="center" style={{ width: '100%' }}>{t('login.title')}</Title>
            <Text c="dimmed" size="sm" ta="center">
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
                const authenticatedUser = await login(values);
                navigate(fromPath === '/' ? getPreferredModulePath(authenticatedUser) : fromPath, { replace: true });
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
