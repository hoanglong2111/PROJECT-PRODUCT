import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconLanguage, IconPalette, IconPlus, IconSettings, IconUsers } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { createUser, fetchUsers, type CreateUserPayload } from '@shared/api/system';
import { APP_ROLES, type AppRole } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import {
  type EventTheme,
  useWorkspacePreferences,
  type WorkspaceLanguage,
} from '@shared/preferences/WorkspacePreferencesContext';

type CreateUserForm = Omit<CreateUserPayload, 'avatarUrl'> & {
  avatarUrl: string;
};

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { eventTheme, language, setEventTheme, setLanguage } = useWorkspacePreferences();
  const { eventThemeLabel, languageLabel, roleLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const activeSection = searchParams.get('section') === 'accounts' ? 'accounts' : 'preferences';
  const highlightedAccount = searchParams.get('account');
  const isAdmin = user?.role === 'ADMIN';

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
          {t('settings.accountMenu')}
        </Badge>
      </Group>

      <Tabs
        value={activeSection}
        onChange={(value) => {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('section', value ?? 'preferences');
          if (value !== 'accounts') {
            nextParams.delete('account');
          }
          setSearchParams(nextParams);
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="preferences" leftSection={<IconPalette size={16} />}>
            {t('settings.preferences')}
          </Tabs.Tab>
          <Tabs.Tab value="accounts" leftSection={<IconUsers size={16} />}>
            {t('settings.accounts')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="preferences" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 3 }}>
            <Paper withBorder p="lg">
              <Stack gap="sm">
                <Group gap="sm">
                  <IconPalette size={20} />
                  <Text fw={700}>{t('settings.themeMode')}</Text>
                </Group>
                <SegmentedControl
                  data={[
                    { label: t('common.light'), value: 'light' },
                    { label: t('common.dark'), value: 'dark' },
                    { label: t('common.auto'), value: 'auto' },
                  ]}
                  value={colorScheme}
                  onChange={(value) => setColorScheme(value as 'light' | 'dark' | 'auto')}
                />
                <Text c="dimmed" size="sm">
                  {t('settings.darkModeDescription')}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder p="lg">
              <Stack gap="sm">
                <Group gap="sm">
                  <IconSettings size={20} />
                  <Text fw={700}>{t('settings.eventTheme')}</Text>
                </Group>
                <SegmentedControl
                  data={[
                    { label: t('common.standard'), value: 'standard' },
                    { label: t('common.risk'), value: 'risk-focus' },
                    { label: t('common.compact'), value: 'compact' },
                  ]}
                  value={eventTheme}
                  onChange={(value) => setEventTheme(value as EventTheme)}
                />
                <Text c="dimmed" size="sm">
                  {t('settings.eventThemeDescription')}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder p="lg">
              <Stack gap="sm">
                <Group gap="sm">
                  <IconLanguage size={20} />
                  <Text fw={700}>{t('settings.language')}</Text>
                </Group>
                <SegmentedControl
                  data={[
                    { label: 'VN', value: 'vi' },
                    { label: 'EN', value: 'en' },
                  ]}
                  value={language}
                  onChange={(value) => setLanguage(value as WorkspaceLanguage)}
                />
                <Text c="dimmed" size="sm">
                  {t('settings.languageDescription')}
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="lg" mt="lg">
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Info label={t('settings.currentLanguage')} value={languageLabel(language)} />
              <Info label={t('settings.eventTheme')} value={eventThemeLabel(eventTheme)} />
              <Info label={t('settings.currentAccount')} value={`${user.fullName} - ${roleLabel(user.role)}`} />
            </SimpleGrid>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="accounts" pt="lg">
          {!isAdmin ? (
            <Alert color="yellow" title={t('settings.adminOnlyTitle')}>
              {t('settings.adminOnlyDescription')}
            </Alert>
          ) : usersQuery.isLoading ? (
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
                          <Table.Td>{account.department}</Table.Td>
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
      </Tabs>
    </Stack>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
