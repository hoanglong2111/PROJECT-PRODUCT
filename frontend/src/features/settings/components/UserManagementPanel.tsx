import { Avatar, Badge, Button, Group, Paper, Select, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { APP_ROLES, type AppRole, type AuthUser } from '@shared/auth/types';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';

type UserManagementPanelProps = {
  highlightedAccount: string | null;
  onCreateClick: () => void;
  users: AuthUser[];
};

export function UserManagementPanel({ highlightedAccount, onCreateClick, users }: UserManagementPanelProps) {
  const { departmentLabel, roleLabel, t } = useI18n();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);

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

  const roleOptions = useMemo(
    () => APP_ROLES.map((role) => ({ label: roleLabel(role), value: role })),
    [roleLabel],
  );

  return (
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
        <Button leftSection={<IconPlus size={16} />} onClick={onCreateClick}>
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
          action={{ label: t('settings.createAccount'), onClick: onCreateClick }}
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
  );
}
