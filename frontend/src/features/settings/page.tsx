import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconBulb, IconPalette, IconPlus, IconSearch, IconSettings, IconShieldLock, IconUserCircle, IconUserPlus, IconUsers } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { createUser, fetchUsers, type CreateUserPayload } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { APP_ROLES, type AppRole } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { ModalTitle } from '@shared/components/ModalTitle';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import {
  type AppearanceMode,
  type ColorPresetId,
  type DensityPreference,
  type VisualTheme,
  type WorkspaceLanguage,
  useWorkspacePreferences,
} from '@shared/preferences/WorkspacePreferencesContext';
import {
  AppearanceModeCard,
  ColorPresetGrid,
  DensityCard,
  FineTuneCard,
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
    colorIntensity,
    colorPreset,
    contrastLevel,
    density,
    dimLevel,
    language,
    resetFineTune,
    resolvedColorScheme,
    setAppearanceMode,
    setColorIntensity,
    setColorPreset,
    setContrastLevel,
    setDensity,
    setDimLevel,
    setLanguage,
    setVisualTheme,
    visualTheme,
  } = useWorkspacePreferences();
  const { appearanceModeLabel, densityLabel, departmentLabel, languageLabel, roleLabel, t, visualThemeLabel } = useI18n();
  const queryClient = useQueryClient();
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

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);
  const [createModalOpened, createModalHandlers] = useDisclosure(false);

  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return users.filter((account) => {
      const matchesQuery =
        query.length === 0 ||
        account.fullName.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.position.toLowerCase().includes(query);
      const matchesRole = !roleFilter || account.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [debouncedSearch, roleFilter, users]);

  const hasActiveFilters = debouncedSearch.trim().length > 0 || roleFilter !== null;

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleUsers,
  } = useListPagination(filteredUsers, [debouncedSearch, roleFilter]);

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
      createModalHandlers.close();
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
          <Stack gap="lg">
            <ThemePreview />

            <FineTuneCard
              colorIntensity={colorIntensity}
              contrastLevel={contrastLevel}
              dimLevel={dimLevel}
              onChangeColorIntensity={setColorIntensity}
              onChangeContrastLevel={setContrastLevel}
              onChangeDimLevel={setDimLevel}
              onReset={resetFineTune}
              visualTheme={visualTheme}
            />

            <ColorPresetGrid
              colorPreset={colorPreset}
              onChange={setColorPreset}
            />

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
                <Info
                  label={t('settings.colorPreset')}
                  value={t(`settings.colorPresets.${colorPreset}`)}
                />
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

                <Modal
                  opened={createModalOpened}
                  onClose={createModalHandlers.close}
                  title={
                    <ModalTitle
                      feature="settings"
                      icon={<IconUserPlus size={18} stroke={1.8} />}
                      title={t('settings.createAccount')}
                    />
                  }
                  size="lg"
                >
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
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
                </Modal>

                <Paper withBorder p="md" className="dl-data-panel settings-accounts-table-panel">
                  <Group justify="space-between" mb="sm" className="dl-data-panel-header" wrap="wrap">
                    <Group gap="sm">
                      <Text fw={700}>{t('settings.accounts')}</Text>
                      <Badge variant="light">
                        {hasActiveFilters
                          ? `${filteredUsers.length}/${users.length}`
                          : t('common.users', { count: users.length })}
                      </Badge>
                    </Group>
                    <Button leftSection={<IconPlus size={16} />} onClick={createModalHandlers.open}>
                      {t('settings.createAccount')}
                    </Button>
                  </Group>

                  <Group gap="sm" mb="md" wrap="wrap" className="dl-filter-panel">
                    <TextInput
                      className="kbfe-search-input"
                      leftSection={<IconSearch size={16} />}
                      placeholder={t('settings.searchAccounts')}
                      value={search}
                      onChange={(event) => setSearch(event.currentTarget.value)}
                      style={{ flex: '1 1 16rem' }}
                    />
                    <Select
                      placeholder={t('settings.filterByRole')}
                      data={roleOptions}
                      value={roleFilter}
                      onChange={(value) => setRoleFilter(value as AppRole | null)}
                      clearable
                      style={{ flex: '0 1 14rem' }}
                    />
                  </Group>

                  {users.length === 0 ? (
                    <EmptyState
                      title={t('settings.noAccountsYet')}
                      description={t('settings.noAccountsYetDescription')}
                      action={{ label: t('settings.createAccount'), onClick: createModalHandlers.open }}
                    />
                  ) : filteredUsers.length === 0 ? (
                    <EmptyState
                      title={t('settings.noAccountsFound')}
                      description={t('settings.noAccountsFoundDescription')}
                      action={{
                        label: t('settings.clearFilters'),
                        onClick: () => {
                          setSearch('');
                          setRoleFilter(null);
                        },
                      }}
                    />
                  ) : (
                    <>
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
                        total={filteredUsers.length}
                      />
                    </>
                  )}
                </Paper>
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
