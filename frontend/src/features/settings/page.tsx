import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBulb,
  IconDeviceMobile,
  IconPalette,
  IconSettings,
  IconShieldLock,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { fetchUsers } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { useAuth } from '@shared/auth/useAuth';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import {
  useWorkspacePreferences,
} from '@shared/preferences/WorkspacePreferencesContext';
import {
  AppearanceModeCard,
  ColorPresetGrid,
  DensityCard,
  ExperienceProfilesCard,
  FineTuneCard,
  LanguageCard,
  VisualThemeCard,
} from './components';
import { CreateUserModal } from './components/CreateUserModal';
import { UserManagementPanel } from './components/UserManagementPanel';

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    appearanceMode,
    colorPreset,
    density,
    experienceProfile,
    colorIntensityLevel,
    contrastLevel,
    dimLevel,
    fineTunePresets,
    isProfileCustomized,
    language,
    mobileQuickActionsVisible,
    resetFineTune,
    surfaceTransparency,
    setAppearanceMode,
    setExperienceProfile,
    setSurfaceTransparency,
    setColorPreset,
    setDensity,
    setColorIntensityLevel,
    setContrastLevel,
    setDimLevel,
    saveFineTunePreset,
    applyFineTunePreset,
    renameFineTunePreset,
    deleteFineTunePreset,
    setLanguage,
    setMobileQuickActionsVisible,
    setVisualTheme,
    visualTheme,
  } = useWorkspacePreferences();
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const canManageUsers = true;
  const requestedSection = searchParams.get('section');
  const activeSection = requestedSection === 'accounts' && canManageUsers ? 'accounts' : 'preferences';
  const highlightedAccount = canManageUsers ? searchParams.get('account') : null;

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });
  const users = usersQuery.data ?? [];

  const [createModalOpened, createModalHandlers] = useDisclosure(false);

  useEffect(() => {
    if (!user || canManageUsers || requestedSection !== 'accounts') {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', 'preferences');
    nextParams.delete('account');
    setSearchParams(nextParams, { replace: true });
  }, [canManageUsers, requestedSection, searchParams, setSearchParams, user]);

  if (!user) {
    return (
      <PageLoading
        title={t('settings.title')}
        description={t('settings.loadingDescription')}
        metricCount={3}
        tableColumns={[t('settings.title'), t('common.currentValue'), t('common.scope')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<IconSettings size={20} />}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <Badge leftSection={<IconSettings size={14} />} size="lg" variant="light">
            {t('settings.preferences')}
          </Badge>
        }
      />

      <Tabs
        value={activeSection}
        onChange={(value) => {
          const nextSection = value === 'accounts' && canManageUsers ? 'accounts' : 'preferences';
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('section', nextSection);
          if (nextSection !== 'accounts') {
            nextParams.delete('account');
          }
          setSearchParams(nextParams);
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="preferences" leftSection={<IconPalette size={16} />}>
            {t('settings.preferences')}
          </Tabs.Tab>
          {canManageUsers ? (
            <Tabs.Tab value="accounts" leftSection={<IconUsers size={16} />}>
              {t('settings.accounts')}
            </Tabs.Tab>
          ) : null}
        </Tabs.List>

        <Tabs.Panel value="preferences" pt="lg">
          <Stack gap="xl" className="settings-preferences-layout">
            <ExperienceProfilesCard
              experienceProfile={experienceProfile}
              isCustomized={isProfileCustomized}
              onChange={setExperienceProfile}
            />

            <SimpleGrid cols={{ base: 1, md: 2 }} className="settings-appearance-cards-grid">
              <AppearanceModeCard
                appearanceMode={appearanceMode}
                onChange={setAppearanceMode}
              />
              <VisualThemeCard
                visualTheme={visualTheme}
                onChange={setVisualTheme}
              />
            </SimpleGrid>

            <div>
              <Text fw={700}>{t('settings.advanced')}</Text>
              <Text c="dimmed" size="sm">
                {t('settings.advancedDescription')}
              </Text>
            </div>

            <div className="settings-advanced-grid">
              <ColorPresetGrid colorPreset={colorPreset} onChange={setColorPreset} presets={fineTunePresets}
                onApplyPreset={applyFineTunePreset} onDeletePreset={deleteFineTunePreset}
                onRenamePreset={renameFineTunePreset} onSavePreset={saveFineTunePreset} />
              <FineTuneCard
                colorIntensityLevel={colorIntensityLevel}
                contrastLevel={contrastLevel}
                dimLevel={dimLevel}
                onColorIntensityChange={setColorIntensityLevel}
                onContrastChange={setContrastLevel}
                onDimChange={setDimLevel}
                onReset={resetFineTune}
                onTransparencyChange={setSurfaceTransparency}
                transparencyLevel={surfaceTransparency}
                visualTheme={visualTheme}
              />
            </div>

            <div className="settings-workspace-preferences">
              <DensityCard
                density={density}
                onChange={setDensity}
              />
              <LanguageCard
                language={language}
                onChange={setLanguage}
              />

              <Paper withBorder p="lg" className="dl-data-panel settings-mobile-shell-card">
                <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
                  <Group gap="sm" align="flex-start" wrap="nowrap">
                    <IconDeviceMobile size={22} />
                    <div>
                      <Text fw={700}>{t('settings.mobileShell')}</Text>
                      <Text c="dimmed" size="sm">
                        {t('settings.mobileShellDescription')}
                      </Text>
                    </div>
                  </Group>
                  <Badge color={mobileQuickActionsVisible ? 'teal' : 'gray'} variant="light">
                    {mobileQuickActionsVisible
                      ? t('settings.mobileQuickActionsVisible')
                      : t('settings.mobileQuickActionsHidden')}
                  </Badge>
                </Group>
                <Button
                  disabled={mobileQuickActionsVisible}
                  mt="md"
                  onClick={() => setMobileQuickActionsVisible(true)}
                  variant={mobileQuickActionsVisible ? 'default' : 'filled'}
                >
                  {t('settings.mobileQuickActionsRestore')}
                </Button>
              </Paper>
            </div>

            <Paper withBorder p="lg" className="dl-data-panel">
              <Group gap="sm" mb="md">
                <IconBulb size={18} />
                <Text fw={700}>{t('settings.recommendations')}</Text>
              </Group>
              <SimpleGrid cols={{ base: 1, md: canManageUsers ? 3 : 2 }}>
                <Recommendation
                  description={t('settings.recommendationProfileDescription')}
                  icon={<IconUserCircle size={16} />}
                  label={t('settings.recommendationProfile')}
                  to="/profile"
                />
                <Recommendation
                  description={t('settings.recommendationSecurityDescription')}
                  icon={<IconShieldLock size={16} />}
                  label={t('settings.recommendationSecurity')}
                  to="/profile"
                />
                {canManageUsers ? (
                  <Recommendation
                    description={t('settings.recommendationAccountsDescription')}
                    icon={<IconUsers size={16} />}
                    label={t('settings.recommendationAccounts')}
                    to="/settings?section=accounts"
                  />
                ) : null}
              </SimpleGrid>
            </Paper>
          </Stack>
        </Tabs.Panel>

        {canManageUsers ? (
          <Tabs.Panel value="accounts" pt="lg">
            {usersQuery.isLoading ? (
              <PageLoading
                title={t('settings.accounts')}
                description={t('settings.loadingAccounts')}
                metricCount={3}
                tableColumns={[t('common.account'), t('common.role'), t('common.department'), t('common.email')]}
              />
            ) : usersQuery.isError ? (
              <PageError
                title={t('settings.loadUsersTitle')}
                description={t('settings.loadUsersDescription')}
                error={usersQuery.error}
                onRetry={() => void usersQuery.refetch()}
              />
            ) : (
              <Stack gap="md">
                {message ? <Alert color="teal">{message}</Alert> : null}

                <CreateUserModal
                  onClose={createModalHandlers.close}
                  onCreated={(email) => setMessage(t('settings.createdAccount', { email }))}
                  onSubmitStart={() => setMessage(null)}
                  opened={createModalOpened}
                />

                <UserManagementPanel
                  highlightedAccount={highlightedAccount}
                  onCreateClick={createModalHandlers.open}
                  users={users}
                />
              </Stack>
            )}
          </Tabs.Panel>
        ) : null}
      </Tabs>
    </Stack>
  );
}

function Recommendation({
  description,
  icon,
  label,
  to,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Stack gap="xs">
      <Button component={Link} to={to} leftSection={icon} variant="light" justify="flex-start">
        {label}
      </Button>
      <Text c="dimmed" size="sm">
        {description}
      </Text>
    </Stack>
  );
}
