import { ActionIcon, Alert, Button, Group, Loader, Paper, ScrollArea, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { PaginatedResponse } from '@shared/api/tradeMasterData';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { LIST_PAGE_SIZE, ListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalString } from '../model/masterDataModel';

export type ReferenceColumn<T> = {
  key: string;
  label: string;
  hint?: string;
  width?: number | string;
  render: (record: T) => ReactNode;
};

export function ReferenceDataPanel<T extends { id: string }>({
  addLabel,
  canManage,
  clientFilter,
  columns,
  emptyDescription,
  emptyTitle,
  fetcher,
  onAdd,
  onDelete,
  onEdit,
  queryKey,
  searchPlaceholder,
  title,
  toolbarExtra,
}: {
  addLabel: string;
  canManage: boolean;
  clientFilter?: (record: T) => boolean;
  columns: Array<ReferenceColumn<T>>;
  emptyDescription: string;
  emptyTitle: string;
  fetcher: (params: { limit: number; page: number; search?: string }) => Promise<PaginatedResponse<T>>;
  onAdd: () => void;
  onDelete: (record: T) => void;
  onEdit: (record: T) => void;
  queryKey: (params: Record<string, unknown>) => readonly unknown[];
  searchPlaceholder: string;
  title: string;
  toolbarExtra?: ReactNode;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const params = useMemo(
    () => ({
      page,
      limit: LIST_PAGE_SIZE,
      search: optionalString(search),
    }),
    [page, search],
  );

  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => fetcher(params),
  });

  const allRecords = query.data?.data ?? [];
  const records = clientFilter ? allRecords.filter(clientFilter) : allRecords;
  const total = clientFilter ? records.length : (query.data?.total ?? 0);
  const pageCount = clientFilter ? 1 : Math.max(1, query.data?.pagination.totalPages ?? 1);
  const pageStart = total === 0 ? 0 : (page - 1) * LIST_PAGE_SIZE + 1;
  const pageEnd = Math.min(total, page * LIST_PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end" gap="md">
        <TextInput
          label={title}
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1 }}
        />
        {toolbarExtra}
        <Group gap="xs">
          {query.isFetching ? <Loader size="sm" /> : null}
          {canManage ? (
            <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
              {addLabel}
            </Button>
          ) : null}
          <Tooltip label={t('masterData.refresh')}>
            <ActionIcon
              aria-label={t('masterData.refresh')}
              variant="light"
              onClick={() => {
                void query.refetch();
              }}
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {query.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(query.error)}
        </Alert>
      ) : null}

      <Paper withBorder p={0}>
        {query.isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('masterData.loadingReferenceData')}
            </Text>
          </Group>
        ) : records.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={1100} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {columns.map((column) => (
                    <Table.Th key={column.key} style={{ width: column.width }}>
                      <HeaderLabel label={column.label} hint={column.hint} />
                    </Table.Th>
                  ))}
                  {canManage ? (
                    <Table.Th style={{ width: 112 }}>
                      {t('masterData.actions')}
                    </Table.Th>
                  ) : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record) => (
                  <Table.Tr key={record.id}>
                    {columns.map((column) => (
                      <Table.Td key={column.key}>{column.render(record)}</Table.Td>
                    ))}
                    {canManage ? (
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip label={t('common.edit')}>
                            <ActionIcon
                              aria-label={t('common.edit')}
                              variant="subtle"
                              onClick={() => onEdit(record)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t('common.delete')}>
                            <ActionIcon
                              aria-label={t('common.delete')}
                              color="red"
                              variant="subtle"
                              onClick={() => onDelete(record)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    ) : null}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={total}
        />
      </Paper>
    </Stack>
  );
}
