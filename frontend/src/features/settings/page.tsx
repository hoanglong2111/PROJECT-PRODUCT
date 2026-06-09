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
import { APP_ROLES } from '@shared/auth/types';
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
  const isAdmin = user?.role === 'ADMIN';
  const requestedSection = searchParams.get('section');
  const activeSection = requestedSection === 'accounts' && isAdmin ? 'accounts' : 'preferences';
  const highlightedAccount = isAdmin ? searchParams.get('account') : null;

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
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
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const roleOptions = useMemo(
    () => APP_ROLES.map((role) => ({ label: roleLabel(role), value: role })),
    [roleLabel],
  );
  useEffect(() => {
    if (!user || isAdmin || requestedSection !== 'accounts') {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', 'preferences');
    nextParams.delete('account');
    setSearchParams(nextParams, { replace: true });
  }, [isAdmin, requestedSection, searchParams, setSearchParams, user]);

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
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{t('settings.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('settings.subtitle')}
          </Text>
        </div>
        <Badge leftSection={<IconSettings size={14} />} size="lg" variant="light">
          {t('settings.preferences')}
        </Badge>
      </Group>

      <Tabs
        value={activeSection}
        onChange={(value) => {
          const nextSection = value === 'accounts' && isAdmin ? 'accounts' : 'preferences';
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
          {isAdmin ? (
            <Tabs.Tab value="accounts" leftSection={<IconUsers size={16} />}>
              {t('settings.accounts')}
            </Tabs.Tab>
          ) : null}
        </Tabs.List>

        <Tabs.Panel value="preferences" pt="lg">
          <Stack gap="lg">
            <ThemePreview />

            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }}>
              <AppearanceModeCard
                appearanceMode={appearanceMode}
                onChange={setAppearanceMode}
              />
              <ColorPresetGrid
                colorPreset={colorPreset}
                onChange={setColorPreset}
              />
              <VisualThemeCard
                visualTheme={visualTheme}
                onChange={setVisualTheme}
              />
              <EventThemeCard
                eventTheme={eventTheme}
                onChange={setEventTheme}
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

            <Paper withBorder p="lg">
              <SimpleGrid cols={{ base: 1, md: 2, xl: 5 }}>
                <Info label={t('settings.currentAppearance')} value={appearanceModeLabel(appearanceMode)} />
                <Info label={t('settings.currentResolvedMode')} value={appearanceModeLabel(resolvedColorScheme)} />
                <Info label={t('settings.colorPreset')} value={t(`settings.colorPresets.${colorPreset}`)} />
                {(() => {
                  const ev = eventThemes[eventTheme] ?? eventThemes.none;
                  return (
                    <Info
                      label={t('settings.eventTheme')}
                      value={`${ev.emoji} ${t(`settings.eventThemes.${ev.id}`)}`}
                    />
                  );
                })()}
                <Info label={t('settings.currentVisualTheme')} value={visualThemeLabel(visualTheme)} />
                <Info label={t('settings.currentDensity')} value={densityLabel(density)} />
                <Info label={t('settings.currentLanguage')} value={languageLabel(language)} />
              </SimpleGrid>
            </Paper>

            <Paper withBorder p="lg">
              <Group gap="sm" mb="md">
                <IconBulb size={18} />
                <Text fw={700}>{t('settings.recommendations')}</Text>
              </Group>
              <SimpleGrid cols={{ base: 1, md: isAdmin ? 3 : 2 }}>
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
                {isAdmin ? (
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

        {isAdmin ? (
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
              <Stack gap="lg">
                {message ? <Alert color="teal">{message}</Alert> : null}
                {createUserMutation.isError ? (
                  <Alert color="red">{t('settings.createAccountError')}</Alert>
                ) : null}

                <Paper withBorder p="lg">
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
                    <Stack>
                      <Group gap="sm">
                        <IconPlus size={18} />
                        <Text fw={700}>{t('settings.createAccount')}</Text>
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <TextInput label={t('settings.fullName')} placeholder="Nguyen Van A" {...form.getInputProps('fullName')} />
                        <TextInput label="Email" placeholder="user@kbfe.local" {...form.getInputProps('email')} />
                        <PasswordInput label={t('common.password')} placeholder={t('settings.passwordMin')} {...form.getInputProps('password')} />
                        <Select label={t('common.role')} data={roleOptions} {...form.getInputProps('role')} />
                        <TextInput label={t('common.position')} placeholder="PIC Manager" {...form.getInputProps('position')} />
                        <TextInput label={t('common.department')} placeholder="Purchasing" {...form.getInputProps('department')} />
                      </SimpleGrid>
                      <TextInput label={t('settings.avatarUrl')} placeholder="https://example.com/avatar.png" {...form.getInputProps('avatarUrl')} />
                      <Button type="submit" loading={createUserMutation.isPending} w={{ base: '100%', sm: 220 }}>
                        {t('settings.createAccount')}
                      </Button>
                    </Stack>
                  </form>
                </Paper>

                <Paper withBorder p="lg">
                  <Group justify="space-between" mb="md">
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
