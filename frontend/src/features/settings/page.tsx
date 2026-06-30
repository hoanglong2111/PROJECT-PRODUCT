import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconBulb, IconPalette, IconPlus, IconSettings, IconShieldLock, IconUserCircle, IconUsers } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { createUser, fetchUsers, type CreateUserPayload } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { APP_ROLES } from '@shared/auth/types';
import { useCan } from '@shared/auth/useCan';
import { useAuth } from '@shared/auth/useAuth';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import {
  type AppearanceMode,
  type ColorPresetId,
  type DensityPreference,
  type EventThemeId,
  type VisualTheme,
  type WorkspaceLanguage,
  useWorkspacePreferences,
} from '@shared/preferences/WorkspacePreferencesContext';
import { eventThemes } from '@shared/theme/eventThemes';
import { getEffectivePresetId } from '@shared/theme/theme';
import {
  AppearanceModeCard,
  ColorPresetGrid,
  DensityCard,
  EventThemeCard,
  LanguageCard,
  ThemePreview,
  VisualThemeCard,
} from './components';

type CreateUserForm = Omit<CreateUserPayload, 'avatarUrl'> & {
  avatarUrl: string;
};

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    appearanceMode,
    colorPreset,
    density,
    eventTheme,
    language,
    resolvedColorScheme,
    setAppearanceMode,
    setColorPreset,
    setDensity,
    setEventTheme,
    setLanguage,
    setVisualTheme,
    visualTheme,
  } = useWorkspacePreferences();
  const { appearanceModeLabel, densityLabel, departmentLabel, languageLabel, roleLabel, t, visualThemeLabel } = useI18n();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const canManageUsers = useCan('settings.manageUsers');
  const requestedSection = searchParams.get('section');
  const activeSection = requestedSection === 'accounts' && canManageUsers ? 'accounts' : 'preferences';
  const highlightedAccount = canManageUsers ? searchParams.get('account') : null;

  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });
  const users = usersQuery.data ?? [];
  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleUsers,
  } = useListPagination(users);

  const form = useForm<CreateUserForm>({
    initialValues: {
      avatarUrl: '',
      department: '',
      email: '',
      fullName: '',
      password: '',
      position: '',
      role: 'SALE_STAFF',
    },
    validate: {
      department: (value) => (value.trim().length === 0 ? t('settings.departmentRequired') : null),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : t('settings.emailInvalid')),
      fullName: (value) => (value.trim().length === 0 ? t('settings.fullNameRequired') : null),
      password: (value) => (value.length >= 6 ? null : t('settings.passwordMin')),
      position: (value) => (value.trim().length === 0 ? t('settings.positionRequired') : null),
      role: (value) => (APP_ROLES.includes(value) ? null : t('settings.roleInvalid')),
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (createdUser) => {
      setMessage(t('settings.createdAccount', { email: createdUser.email }));
      form.reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });

  const roleOptions = useMemo(
    () => APP_ROLES.map((role) => ({ label: roleLabel(role), value: role })),
    [roleLabel],
  );
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
      <Group justify="space-between" align="flex-start" className="dl-page-header">
        <div className="dl-page-title-block">
          <Title order={1}>{t('settings.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('settings.subtitle')}
          </Text>
        </div>
        <Badge leftSection={<IconSettings size={14} />} size="lg" variant="light" className="dl-page-actions">
          {t('settings.preferences')}
        </Badge>
      </Group>

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
          <Stack gap="lg">
            <ThemePreview />

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
              <ColorPresetGrid
                colorPreset={colorPreset}
                eventTheme={eventTheme}
                onChange={setColorPreset}
                onEventReset={() => setEventTheme('none')}
              />
              <EventThemeCard
                eventTheme={eventTheme}
                onChange={setEventTheme}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
              <AppearanceModeCard
                appearanceMode={appearanceMode}
                onChange={setAppearanceMode}
              />
              <VisualThemeCard
                visualTheme={visualTheme}
                onChange={setVisualTheme}
              />
              <DensityCard
                density={density}
                onChange={setDensity}
              />
              <LanguageCard
                language={language}
                onChange={setLanguage}
              />
            </SimpleGrid>

            <Paper withBorder p="lg" className="dl-data-panel">
              <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }}>
                <Info label={t('settings.currentAppearance')} value={appearanceModeLabel(appearanceMode)} />
                <Info label={t('settings.currentResolvedMode')} value={appearanceModeLabel(resolvedColorScheme)} />
                {(() => {
                  const effective = getEffectivePresetId(colorPreset, eventTheme);
                  const isOverridden = effective !== colorPreset;
                  const displayValue = isOverridden
                    ? `${t(`settings.colorPresets.${colorPreset}`)} -> ${t(`settings.colorPresets.${effective}`)} (${t('settings.eventTheme')})`
                    : t(`settings.colorPresets.${colorPreset}`);
                  return (
                    <Info
                      label={t('settings.colorPreset')}
                      value={displayValue}
                    />
                  );
                })()}
                {(() => {
                  const ev = eventThemes[eventTheme] ?? eventThemes.none;
                  return (
                    <Info
                      label={t('settings.eventTheme')}
                      value={t(`settings.eventThemes.${ev.id}`)}
                    />
                  );
                })()}
                <Info label={t('settings.currentVisualTheme')} value={visualThemeLabel(visualTheme)} />
                <Info label={t('settings.currentDensity')} value={densityLabel(density)} />
                <Info label={t('settings.currentLanguage')} value={languageLabel(language)} />
              </SimpleGrid>
            </Paper>

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
                {createUserMutation.isError ? (
                  <Alert color="red">{t('settings.createAccountError')}</Alert>
                ) : null}

                <div className="settings-accounts-layout">
                  <Paper withBorder p="md" className="dl-data-panel settings-account-create-panel">
                    <form
                      onSubmit={form.onSubmit((values) => {
                        setMessage(null);
                        createUserMutation.mutate({
                          avatarUrl: values.avatarUrl.trim() || null,
                          department: values.department.trim(),
                          email: values.email.trim().toLowerCase(),
                          fullName: values.fullName.trim(),
                          password: values.password,
                          position: values.position.trim(),
                          role: values.role,
                        });
                      })}
                    >
                      <Stack gap="sm">
                        <Group gap="sm" className="settings-account-create-title">
                          <IconPlus size={18} />
                          <Text fw={700}>{t('settings.createAccount')}</Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 1 }} spacing="sm">
                          <TextInput label={t('settings.fullName')} placeholder="Nguyen Van A" {...form.getInputProps('fullName')} />
                          <TextInput label="Email" placeholder="user@kbfe.local" {...form.getInputProps('email')} />
                          <PasswordInput label={t('common.password')} placeholder={t('settings.passwordMin')} {...form.getInputProps('password')} />
                          <Select label={t('common.role')} data={roleOptions} {...form.getInputProps('role')} />
                          <TextInput label={t('common.position')} placeholder="PIC Manager" {...form.getInputProps('position')} />
                          <TextInput label={t('common.department')} placeholder="Purchasing" {...form.getInputProps('department')} />
                        </SimpleGrid>
                        <TextInput label={t('settings.avatarUrl')} placeholder="https://example.com/avatar.png" {...form.getInputProps('avatarUrl')} />
                        <Button type="submit" loading={createUserMutation.isPending} fullWidth>
                          {t('settings.createAccount')}
                        </Button>
                      </Stack>
                    </form>
                  </Paper>

                  <Paper withBorder p="md" className="dl-data-panel settings-accounts-table-panel">
                    <Group justify="space-between" mb="sm" className="dl-data-panel-header">
                      <Text fw={700}>{t('settings.accounts')}</Text>
                      <Badge variant="light">{t('common.users', { count: users.length })}</Badge>
                    </Group>
                    <Table.ScrollContainer minWidth={780}>
                      <Table highlightOnHover verticalSpacing="sm">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('common.account')}</Table.Th>
                            <Table.Th>{t('common.role')}</Table.Th>
                            <Table.Th>{t('common.department')}</Table.Th>
                            <Table.Th>{t('common.position')}</Table.Th>
                            <Table.Th>{t('common.email')}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {visibleUsers.map((account) => (
                            <Table.Tr
                              className={highlightedAccount === account.id ? 'settings-account-row-highlight' : undefined}
                              key={account.id}
                            >
                              <Table.Td>
                                <Group gap="sm" wrap="nowrap">
                                  <Avatar src={account.avatarUrl} radius="xl" size={32}>
                                    {account.fullName
                                      .split(' ')
                                      .filter(Boolean)
                                      .slice(0, 2)
                                      .map((word) => word[0])
                                      .join('')
                                      .toUpperCase()}
                                  </Avatar>
                                  <Text fw={600}>{account.fullName}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light">{roleLabel(account.role)}</Badge>
                              </Table.Td>
                              <Table.Td>{departmentLabel(account.department)}</Table.Td>
                              <Table.Td>{account.position}</Table.Td>
                              <Table.Td>{account.email}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                    <ListPagination
                      page={page}
                      pageCount={pageCount}
                      pageEnd={pageEnd}
                      pageStart={pageStart}
                      setPage={setPage}
                      total={users.length}
                    />
                  </Paper>
                </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Stack className="settings-info-tile" gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Stack>
  );
}
