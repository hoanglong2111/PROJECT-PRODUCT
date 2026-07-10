import { Alert, Badge, Paper, SimpleGrid, Stack, Tabs } from '@mantine/core';
import { IconShieldLock, IconUserCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '@shared/auth/useAuth';
import { PageHeader } from '@shared/components/PageHeader';
import { PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import { EmailForm } from './components/EmailForm';
import { PasswordForm } from './components/PasswordForm';
import { ProfileForm } from './components/ProfileForm';

export function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { roleLabel, t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeTab = searchParams.get('tab') === 'security' ? 'security' : 'info';

  const handleMessage = (nextMessage: string) => {
    setError(null);
    setMessage(nextMessage);
  };
  const handleError = (nextError: string) => {
    setMessage(null);
    setError(nextError);
  };

  if (!user) {
    return (
      <PageLoading
        title={t('profile.title')}
        description={t('profile.loadingDescription')}
        metricCount={3}
        tableColumns={[t('common.field'), t('common.currentValue'), t('common.status')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<IconUserCircle size={20} />}
        title={t('profile.title')}
        subtitle={t('profile.description')}
        actions={
          <Badge leftSection={<IconUserCircle size={14} />} size="lg" variant="light">
            {roleLabel(user.role)}
          </Badge>
        }
      />

      {error ? <Alert color="red">{error}</Alert> : null}
      {message ? <Alert color="teal">{message}</Alert> : null}

      <Tabs
        value={activeTab}
        onChange={(value) => {
          const nextParams = new URLSearchParams(searchParams);
          const nextTab = value === 'security' ? 'security' : 'info';
          if (nextTab === 'security') {
            nextParams.set('tab', nextTab);
          } else {
            nextParams.delete('tab');
          }
          setSearchParams(nextParams);
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="info" leftSection={<IconUserCircle size={16} />}>
            {t('profile.identity')}
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShieldLock size={16} />}>
            {t('profile.security')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info" pt="lg">
          <Paper withBorder p="lg" className="dl-data-panel">
            <ProfileForm onError={handleError} onMessage={handleMessage} user={user} />
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper withBorder p="lg" className="dl-data-panel">
              <EmailForm onError={handleError} onMessage={handleMessage} user={user} />
            </Paper>

            <Paper withBorder p="lg" className="dl-data-panel">
              <PasswordForm onError={handleError} onMessage={handleMessage} />
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
