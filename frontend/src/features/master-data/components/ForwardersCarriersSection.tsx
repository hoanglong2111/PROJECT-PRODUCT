import { ActionIcon, Alert, Badge, Group, Loader, Paper, ScrollArea, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertCircle, IconPencil, IconStarFilled, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchCarriers, fetchForwarders, updateCarrier, updateForwarder, type Carrier, type Forwarder } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterSegment } from '@shared/components/FilterSegment';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { LIST_PAGE_SIZE, ListPagination, useListPagination } from '@shared/components/ListPagination';
import { ConfirmModal } from '@shared/components/ConfirmModal';
import { StatusToggle } from '@shared/components/StatusToggle';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { getCarrierTypeLabel, getForwarderTypeLabel } from '../model/masterDataModel';
import { MasterDataToolbar } from './MasterDataToolbar';

export type CombinedPartnerRecord =
  | {
      id: string;
      rowType: 'forwarder';
      code: string;
      name: string;
      type: string;
      is_active: boolean;
      original: Forwarder;
    }
  | {
      id: string;
      rowType: 'carrier';
      code: string;
      name: string;
      type: string;
      is_active: boolean;
      original: Carrier;
    };

export function ForwardersCarriersSection({
  canManage,
  onAddForwarder,
  onAddCarrier,
  onEditForwarder,
  onEditCarrier,
  onDeleteForwarder,
  onDeleteCarrier,
}: {
  canManage: boolean;
  onAddForwarder: () => void;
  onAddCarrier: () => void;
  onEditForwarder: (forwarder: Forwarder) => void;
  onEditCarrier: (carrier: Carrier) => void;
  onDeleteForwarder: (forwarder: Forwarder) => void;
  onDeleteCarrier: (carrier: Carrier) => void;
}) {
  const { t } = useI18n();

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [segment, setSegment] = useState<'ALL' | 'FORWARDER' | 'CARRIER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<CombinedPartnerRecord | null>(null);

  const queryClient = useQueryClient();
  const toggleMutation = useMutation<any, Error, CombinedPartnerRecord>({
    mutationFn: (r: CombinedPartnerRecord) =>
      r.rowType === 'forwarder'
        ? updateForwarder(r.id, { is_active: !r.is_active })
        : updateCarrier(r.id, { is_active: !r.is_active }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.forwarderLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.carrierLists }),
      ]);
      setConfirmTarget(null);
    },
  });

  // Load both datasets (up to 500 items for client-side search/filter/pagination)
  const forwardersQuery = useQuery({
    queryKey: queryKeys.forwarders({ page: 1, limit: 500 }),
    queryFn: () => fetchForwarders({ page: 1, limit: 500 }),
  });

  const carriersQuery = useQuery({
    queryKey: queryKeys.carriers({ page: 1, limit: 500 }),
    queryFn: () => fetchCarriers({ page: 1, limit: 500 }),
  });

  const combinedRecords = useMemo((): CombinedPartnerRecord[] => {
    const list: CombinedPartnerRecord[] = [];

    if (forwardersQuery.data?.data) {
      for (const f of forwardersQuery.data.data) {
        list.push({
          id: f.id,
          rowType: 'forwarder',
          code: f.forwarder_code,
          name: f.forwarder_name,
          type: f.forwarder_type,
          is_active: f.is_active !== false,
          original: f,
        });
      }
    }

    if (carriersQuery.data?.data) {
      for (const c of carriersQuery.data.data) {
        list.push({
          id: c.id,
          rowType: 'carrier',
          code: c.carrier_code,
          name: c.carrier_name,
          type: c.carrier_type,
          is_active: c.is_active !== false,
          original: c,
        });
      }
    }

    return list;
  }, [forwardersQuery.data, carriersQuery.data]);

  // Client-side filtering
  const filteredRecords = useMemo(() => {
    return combinedRecords.filter((record) => {
      // 1. Segment filter
      if (segment === 'FORWARDER' && record.rowType !== 'forwarder') return false;
      if (segment === 'CARRIER' && record.rowType !== 'carrier') return false;

      // 2. Status filter
      if (statusFilter !== null && record.is_active !== statusFilter) return false;

      // 3. Search query
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const codeMatch = record.code.toLowerCase().includes(query);
        const nameMatch = record.name.toLowerCase().includes(query);
        const typeMatch = record.type.toLowerCase().includes(query);
        
        let contactMatch = false;
        if (record.rowType === 'forwarder') {
          contactMatch =
            (record.original.contact_person || '').toLowerCase().includes(query) ||
            (record.original.contact_email || '').toLowerCase().includes(query) ||
            (record.original.contact_phone || '').toLowerCase().includes(query);
        } else {
          contactMatch =
            (record.original.contact_booking || '').toLowerCase().includes(query) ||
            (record.original.contact_email || '').toLowerCase().includes(query);
        }

        return codeMatch || nameMatch || typeMatch || contactMatch;
      }

      return true;
    });
  }, [combinedRecords, segment, statusFilter, debouncedSearch]);

  const total = filteredRecords.length;
  const showSmallSetCount =
    !forwardersQuery.isLoading && !carriersQuery.isLoading && total <= LIST_PAGE_SIZE;

  const { page, pageCount, pageEnd, pageStart, setPage, visibleItems: records } = useListPagination(
    filteredRecords,
    [debouncedSearch, statusFilter, segment, total]
  );

  const handleClearFilters = () => {
    setSearch('');
    setSegment('ALL');
    setStatusFilter(null);
    setPage(1);
  };

  const isFetching = forwardersQuery.isFetching || carriersQuery.isFetching;
  const isLoading = forwardersQuery.isLoading || carriersQuery.isLoading;
  const hasError = forwardersQuery.isError || carriersQuery.isError;
  const error = forwardersQuery.error || carriersQuery.error;

  const hasActiveFilters = search.trim().length > 0 || segment !== 'ALL' || statusFilter !== null;

  return (
    <Stack gap="md">
      <MasterDataToolbar
        addLabel={t('common.add')}
        canManage={canManage}
        hasActiveFilters={hasActiveFilters}
        isFetching={isFetching}
        onClear={handleClearFilters}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        searchLabel={t('masterData.forwardersCarriersTitle')}
        searchPlaceholder={t('masterData.searchForwardersCarriers')}
        searchValue={search}
        statusValue={statusFilter}
        addMenu={[
          { label: t('masterData.addForwarder'), onClick: onAddForwarder },
          { label: t('masterData.addCarrier'), onClick: onAddCarrier },
        ]}
        filters={
          <FilterSegment
            ariaLabel={t('masterData.kindColumn')}
            value={segment}
            onChange={(val) => {
              setSegment(val as any);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: t('common.all') },
              { value: 'FORWARDER', label: t('masterData.typeForwarder') },
              { value: 'CARRIER', label: t('masterData.typeCarrier') },
            ]}
          />
        }
      />

      {hasError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      <Paper withBorder p={0} className="dl-data-panel">
        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              {t('masterData.loadingReferenceData')}
            </Text>
          </Group>
        ) : records.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? t('masterData.noFilteredResults') : t('masterData.noForwardersCarriers')}
            description={
              hasActiveFilters
                ? t('masterData.noFilteredResultsDescription')
                : t('masterData.noForwardersCarriersDescription')
            }
            action={
              hasActiveFilters
                ? { label: t('masterData.clearFilters'), onClick: handleClearFilters }
                : undefined
            }
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
                  <Table.Th style={{ width: 220 }}>
                    <HeaderLabel label={t('masterData.forwardersCarriersTitle')} />
                  </Table.Th>
                  <Table.Th style={{ width: 120 }}>
                    <HeaderLabel label={t('masterData.kindColumn')} />
                  </Table.Th>
                  <Table.Th style={{ width: 150 }}>
                    <HeaderLabel label={t('masterData.forwarderType')} />
                  </Table.Th>
                  <Table.Th style={{ width: 220 }}>
                    <HeaderLabel label={t('masterData.contact')} />
                  </Table.Th>
                  <Table.Th style={{ width: 200 }}>
                    <HeaderLabel label={t('common.notes')} />
                  </Table.Th>
                  <Table.Th style={{ width: 96, textAlign: 'center' }}>
                    <HeaderLabel label={t('common.status')} justify="center" />
                  </Table.Th>
                  {canManage ? (
                    <Table.Th style={{ width: 112, textAlign: 'center' }}>
                      {t('masterData.actions')}
                    </Table.Th>
                  ) : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record, index) => {
                  const isForwarder = record.rowType === 'forwarder';
                  return (
                    <Table.Tr
                      key={`${record.rowType}-${record.id}`}
                      className={isForwarder && record.original.is_primary ? 'md-row-primary' : undefined}
                    >
                      <Table.Td className="md-cell-align-center md-cell-stt">
                        {isForwarder && record.original.is_primary ? (
                          <Tooltip label={t('masterData.isPrimary')}>
                            <span className="md-primary-flag">
                              <IconStarFilled size={12} />
                            </span>
                          </Tooltip>
                        ) : null}
                        <Text size="sm" className="tabular-nums">
                          {pageStart + index}
                        </Text>
                      </Table.Td>
                      <Table.Td className="md-cell-clamp">
                        <Stack gap={4}>
                          <Badge variant="light">{record.code}</Badge>
                          <Text size="sm" fw={700} lineClamp={1} title={record.name}>
                            {record.name}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={isForwarder ? 'indigo' : 'teal'} variant="light">
                          {isForwarder ? t('masterData.typeForwarder') : t('masterData.typeCarrier')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="gray" variant="outline">
                          {isForwarder
                            ? getForwarderTypeLabel(record.type, t)
                            : getCarrierTypeLabel(record.type, t)}
                        </Badge>
                      </Table.Td>
                      <Table.Td className="md-cell-clamp">
                        {isForwarder ? (
                          <Stack gap={2}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {record.original.contact_person || '-'}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {[record.original.contact_email, record.original.contact_phone]
                                .filter(Boolean)
                                .join(' | ') || '-'}
                            </Text>
                          </Stack>
                        ) : (
                          <Stack gap={2}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {record.original.contact_booking || '-'}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {record.original.contact_email || '-'}
                            </Text>
                          </Stack>
                        )}
                      </Table.Td>
                      <Table.Td className="md-cell-clamp">
                        {isForwarder ? (
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {record.original.note || record.original.country || '-'}
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed" lineClamp={2}>
                            {record.original.service_route_note || record.original.scac_iata_code || '-'}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td className="md-cell-align-center">
                        <StatusToggle
                          active={record.is_active}
                          onToggle={canManage ? () => setConfirmTarget(record) : undefined}
                          loading={toggleMutation.isPending && confirmTarget?.id === record.id && confirmTarget?.rowType === record.rowType}
                          disabled={toggleMutation.isPending}
                        />
                      </Table.Td>
                      {canManage ? (
                        <Table.Td className="md-cell-align-center">
                          <Group gap="xs" wrap="nowrap" justify="center">
                            <Tooltip label={t('common.edit')}>
                              <ActionIcon
                                aria-label={t('common.edit')}
                                variant="subtle"
                                onClick={() => {
                                  if (isForwarder) {
                                    onEditForwarder(record.original);
                                  } else {
                                    onEditCarrier(record.original);
                                  }
                                }}
                              >
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t('common.delete')}>
                              <ActionIcon
                                aria-label={t('common.delete')}
                                color="red"
                                variant="subtle"
                                onClick={() => {
                                  if (isForwarder) {
                                    onDeleteForwarder(record.original);
                                  } else {
                                    onDeleteCarrier(record.original);
                                  }
                                }}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      ) : null}
                    </Table.Tr>
                  );
                })}
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

      {confirmTarget ? (
        <ConfirmModal
          opened={!!confirmTarget}
          title={t('masterData.confirmToggleTitle')}
          message={
            confirmTarget.is_active
              ? t('masterData.confirmCloseMessage', { name: confirmTarget.name })
              : t('masterData.confirmOpenMessage', { name: confirmTarget.name })
          }
          confirmLabel={confirmTarget.is_active ? t('masterData.closeAction') : t('masterData.openAction')}
          confirmColor={confirmTarget.is_active ? 'red' : 'teal'}
          loading={toggleMutation.isPending}
          onConfirm={() => toggleMutation.mutate(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}
    </Stack>
  );
}
