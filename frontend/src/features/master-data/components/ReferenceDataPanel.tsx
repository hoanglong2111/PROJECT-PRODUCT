import { ActionIcon, Alert, Group, Loader, Paper, ScrollArea, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle, IconPencil, IconTrash } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import type { PaginatedResponse } from '@shared/api/tradeMasterData';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { LIST_PAGE_SIZE, ListPagination, useListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalString } from '../model/masterDataModel';
import { MasterDataToolbar } from './MasterDataToolbar';

// Reference master-data sets are small; load the whole set up-front so search/filter and
// client-side pagination operate over every row, not just the first server page.
const REFERENCE_PAGE_FETCH_LIMIT = 500;

export type ReferenceColumn<T> = {
  align?: 'left' | 'center' | 'right';
  key: string;
  label: string;
  hint?: string;
  width?: number | string;
  render: (record: T) => ReactNode;
};

type ColumnAlign = NonNullable<ReferenceColumn<unknown>['align']>;

function alignToJustify(align?: ColumnAlign) {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

function cellClassName(align?: ColumnAlign) {
  return ['md-cell-clamp', align ? `md-cell-align-${align}` : null].filter(Boolean).join(' ');
}

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
  const showSmallSetCount = !query.isLoading && total <= LIST_PAGE_SIZE;
  // The full reference set is loaded up-front, so paginate client-side: every tab gets a
  // consistent LIST_PAGE_SIZE page and a continuous STT counter. Reset to page 1 whenever the
  // filtered row count changes (search / status / attribute filter).
  const { page, pageCount, pageEnd, pageStart, setPage, visibleItems: records } = useListPagination(filtered, [
    debouncedSearch,
    statusFilter,
    total,
  ]);

  const handleClearFilters = () => {
    setSearch('');
    setPage(1);
    onClearFilters?.();
  };

  return (
    <Stack gap="md">
      <MasterDataToolbar
        addLabel={addLabel}
        canManage={canManage}
        filters={toolbarExtra}
        hasActiveFilters={showClearFilters}
        isFetching={query.isFetching}
        onAdd={onAdd}
        onClear={handleClearFilters}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={onStatusFilterChange
          ? (value) => {
            onStatusFilterChange(value);
            setPage(1);
          }
          : undefined}
        searchLabel={title}
        searchPlaceholder={searchPlaceholder}
        searchValue={search}
        statusValue={statusFilter}
      />

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
            <Table
              stickyHeader
              verticalSpacing="sm"
              highlightOnHover
              className="md-table"
              layout="fixed"
              w="100%"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 56, textAlign: 'center' }}>
                    <HeaderLabel label={t('common.rowNumber')} />
                  </Table.Th>
                  {columns.map((column) => (
                    <Table.Th key={column.key} style={{ width: column.width, textAlign: column.align }}>
                      <HeaderLabel label={column.label} hint={column.hint} justify={alignToJustify(column.align)} />
                    </Table.Th>
                  ))}
                  {canManage ? (
                    <Table.Th style={{ width: 112, textAlign: 'center' }}>
                      {t('masterData.actions')}
                    </Table.Th>
                  ) : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record, index) => (
                  <Table.Tr key={record.id}>
                    <Table.Td className="md-cell-align-center">
                      <Text size="sm" className="tabular-nums">
                        {pageStart + index}
                      </Text>
                    </Table.Td>
                    {columns.map((column) => (
                      <Table.Td key={column.key} className={cellClassName(column.align)} style={{ textAlign: column.align }}>
                        {column.render(record)}
                      </Table.Td>
                    ))}
                    {canManage ? (
                      <Table.Td className="md-cell-align-center">
                        <Group gap="xs" wrap="nowrap" justify="center">
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

        {showSmallSetCount ? (
          <Group justify="flex-start" p="md" className="md-pagination-fallback">
            <Text size="sm" c="dimmed" className="md-filter-count">
              {t('common.shown', { count: total })}
            </Text>
          </Group>
        ) : (
          <ListPagination
            page={page}
            pageCount={pageCount}
            pageEnd={pageEnd}
            pageStart={pageStart}
            setPage={setPage}
            total={total}
          />
        )}
      </Paper>
    </Stack>
  );
}
