import { ActionIcon, Alert, Button, Group, Loader, Paper, ScrollArea, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle, IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import type { PaginatedResponse } from '@shared/api/tradeMasterData';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { getStatusFilterOptions, optionalString, selectValueToStatus, statusToSelectValue } from '../model/masterDataModel';

// Reference master-data sets are small; load the whole set up-front so search/filter and
// client-side pagination operate over every row, not just the first server page.
const REFERENCE_PAGE_FETCH_LIMIT = 500;

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
  hasActiveFilters = false,
  onAdd,
  onClearFilters,
  onDelete,
  onEdit,
  pageSize = REFERENCE_PAGE_FETCH_LIMIT,
  queryKey,
  searchPlaceholder,
  statusFilter,
  statusFilterClientSide = false,
  onStatusFilterChange,
  title,
  toolbarExtra,
}: {
  addLabel: string;
  canManage: boolean;
  clientFilter?: (record: T) => boolean;
  columns: Array<ReferenceColumn<T>>;
  emptyDescription: string;
  emptyTitle: string;
  fetcher: (params: { limit: number; page: number; search?: string; is_active?: boolean }) => Promise<PaginatedResponse<T>>;
  hasActiveFilters?: boolean;
  onAdd: () => void;
  onClearFilters?: () => void;
  onDelete: (record: T) => void;
  onEdit: (record: T) => void;
  /** Server fetch page size. Pass a large value to load all rows when using clientFilter. */
  pageSize?: number;
  queryKey: (params: Record<string, unknown>) => readonly unknown[];
  searchPlaceholder: string;
  statusFilter?: boolean | null;
  statusFilterClientSide?: boolean;
  onStatusFilterChange?: (value: boolean | null) => void;
  title: string;
  toolbarExtra?: ReactNode;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const hasSearch = search.trim().length > 0;
  const showClearFilters = hasActiveFilters || hasSearch;
  const params = useMemo(
    () => ({
      page: 1,
      limit: pageSize,
      search: optionalString(debouncedSearch),
      is_active: statusFilterClientSide ? undefined : statusFilter ?? undefined,
    }),
    [debouncedSearch, pageSize, statusFilter, statusFilterClientSide],
  );

  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => fetcher(params),
  });

  const allRecords = query.data?.data ?? [];
  const filtered = clientFilter ? allRecords.filter(clientFilter) : allRecords;
  const total = filtered.length;
  // The full reference set is loaded up-front, so paginate client-side: every tab gets a
  // consistent LIST_PAGE_SIZE page and a continuous STT counter. Reset to page 1 whenever the
  // filtered row count changes (search / status / attribute filter).
  const { page, pageCount, pageEnd, pageStart, setPage, visibleItems: records } = useListPagination(filtered, [
    debouncedSearch,
    statusFilter,
    total,
  ]);
  const statusSelect = onStatusFilterChange ? (
    <Select
      className="md-filter-select"
      label={t('common.status')}
      data={getStatusFilterOptions(t)}
      value={statusToSelectValue(statusFilter)}
      onChange={(value) => {
        onStatusFilterChange(selectValueToStatus(value));
        setPage(1);
      }}
      w={170}
    />
  ) : null;

  const handleClearFilters = () => {
    setSearch('');
    setPage(1);
    onClearFilters?.();
  };
  const resultCountLabel = t('common.shown', { count: total });

  return (
    <Stack gap="md">
      <Paper withBorder p="md" className="dl-filter-panel">
        <Group align="flex-end" gap="sm" wrap="wrap" className="dl-filter-row">
          <TextInput
            className="dl-filter-search"
            label={title}
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          {statusSelect}
          {toolbarExtra}
          <Group gap="xs" wrap="nowrap" align="flex-end" ml="auto" className="md-filter-tail">
            {query.isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed" className="md-filter-count">
              {resultCountLabel}
            </Text>
            {canManage ? (
              <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
                {addLabel}
              </Button>
            ) : null}
            {showClearFilters ? (
              <Button variant="subtle" onClick={handleClearFilters}>
                {t('masterData.clearFilters')}
              </Button>
            ) : null}
          </Group>
        </Group>
      </Paper>

      {query.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(query.error)}
        </Alert>
      ) : null}

      <Paper withBorder p={0} className="dl-data-panel">
        {query.isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('masterData.loadingReferenceData')}
            </Text>
          </Group>
        ) : records.length === 0 ? (
          <EmptyState
            title={showClearFilters ? t('masterData.noFilteredResults') : emptyTitle}
            description={showClearFilters ? t('masterData.noFilteredResultsDescription') : emptyDescription}
            action={showClearFilters
              ? { label: t('masterData.clearFilters'), onClick: handleClearFilters }
              : canManage
                ? { label: addLabel, onClick: onAdd }
                : undefined}
          />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table stickyHeader verticalSpacing="sm" highlightOnHover style={{ tableLayout: 'fixed', width: '100%' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 56 }}>
                    <HeaderLabel label={t('common.rowNumber')} />
                  </Table.Th>
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
                {records.map((record, index) => (
                  <Table.Tr key={record.id}>
                    <Table.Td className="tabular-nums">{pageStart + index}</Table.Td>
                    {columns.map((column) => (
                      <Table.Td key={column.key} className="md-cell-clamp">{column.render(record)}</Table.Td>
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
