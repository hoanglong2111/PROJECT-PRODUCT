import { ActionIcon, Alert, Button, Group, Loader, Paper, ScrollArea, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';

import type { ItemGroup } from '@shared/api/items';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

export function ItemGroupsSection({
  canManage,
  error,
  filteredItemGroups,
  isError,
  isFetching,
  isLoading,
  onAdd,
  onDelete,
  onEdit,
  onRefresh,
  onSearchChange,
  search,
  total,
}: {
  canManage: boolean;
  error: unknown;
  filteredItemGroups: ItemGroup[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (group: ItemGroup) => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  search: string;
  total: number;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="md" className="dl-data-panel">
      <Stack gap="md">
        <Group justify="space-between" align="center" className="dl-data-panel-header">
          <div>
            <Text fw={700}>{t('masterData.itemGroupsTitle')}</Text>
            <Text size="sm" c="dimmed">
              {t('common.records', { count: total })}
            </Text>
          </div>
          <Group gap="xs">
            <Tooltip label={t('masterData.refresh')}>
              <ActionIcon variant="light" onClick={onRefresh} loading={isFetching}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            {canManage && (
              <Button size="xs" leftSection={<IconPlus size={14} />} onClick={onAdd}>
                {t('masterData.addItemGroup')}
              </Button>
            )}
          </Group>
        </Group>
        <TextInput
          placeholder={t('masterData.searchItemGroups')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
        />

        {isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(error)}
          </Alert>
        ) : isLoading ? (
          <Group justify="center" p="md">
            <Loader size="sm" />
          </Group>
        ) : filteredItemGroups.length === 0 ? (
          <EmptyState
            title={t('masterData.noItemGroups')}
            description={t('masterData.noItemGroupsDescription')}
            action={canManage ? { label: t('masterData.addItemGroup'), onClick: onAdd } : undefined}
          />
        ) : (
          <ScrollArea>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('masterData.groupCode')}</Table.Th>
                    <Table.Th>{t('masterData.groupName')}</Table.Th>
                    <Table.Th>
                      <HeaderLabel label={t('masterData.defaultHsCode')} hint={t('glossary.hsCode')} />
                    </Table.Th>
                    <Table.Th>{t('masterData.groupDescription')}</Table.Th>
                    {canManage && <Table.Th style={{ width: 100 }}>{t('masterData.actions')}</Table.Th>}
                  </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredItemGroups.map((group) => (
                  <Table.Tr key={group.id}>
                    <Table.Td fw={700}>{group.group_code || '-'}</Table.Td>
                    <Table.Td fw={600}>{group.group_name}</Table.Td>
                    <Table.Td>{group.default_hs_code || '-'}</Table.Td>
                    <Table.Td>{group.description || '-'}</Table.Td>
                    {canManage && (
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon variant="subtle" color="blue" onClick={() => onEdit(group)}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => onDelete(group.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Paper>
  );
}
