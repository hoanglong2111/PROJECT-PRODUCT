import { ActionIcon, Badge, Group, Paper, SimpleGrid, Skeleton, Stack, Switch, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconEye, IconInfoCircle, IconSearch, IconSend, IconTags } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import {
  buildRfqRouteLabel,
  type QuotationRequestStatusV1,
  type QuotationRequestV1,
} from '@shared/api/quotationRequests';
import { CopyValue } from '@shared/components/CopyValue';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { Metric } from '@shared/components/Metric';
import { useI18n, type MessageKey } from '@shared/i18n';
import { buildTabCounts } from '@shared/lib/tabCounts';
import { formatDate } from '@shared/utils/date';

import {
  isAirMode,
  isFclMode,
  rfqCargoReadyUrgency,
  quotationRequestStatusTabs,
  quotationRequestTabItems,
  rfqHasDraftQuotation,
  rfqResponseQuotations,
  rfqStatusColor,
  rfqTotalWeight,
  type QuotationRequestTab,
} from '../model/quotationRequestModel';

type QuotationRequestListViewProps = {
  requests: QuotationRequestV1[];
  isLoading?: boolean;
  activeTab: QuotationRequestTab;
  onTabChange: (tab: QuotationRequestTab) => void;
  onInspect: (id: string) => void;
};


const NEXT_ACTION_KEY: Record<QuotationRequestStatusV1, MessageKey> = {
  SUBMITTED: 'quotationRequests.next.SUBMITTED',
  RECEIVED: 'quotationRequests.next.RECEIVED',
  QUOTED: 'quotationRequests.next.QUOTED',
  CONFIRMED: 'quotationRequests.next.CONFIRMED',
  CANCELLED: 'quotationRequests.next.CANCELLED',
};

const NEEDS_ACTION_STATUSES: QuotationRequestStatusV1[] = ['SUBMITTED', 'RECEIVED'];

type TFn = ReturnType<typeof useI18n>['t'];

function CargoCell({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const gross = rfqTotalWeight(request.lines ?? []) || Number(request.gross_weight_kg ?? 0);
  const lineCount = request.lines?.length ?? 0;

  let primary: string;
  let caption = `${lineCount} ${t('quotationRequests.lines')}`;
  // Explains what the two slash-separated numbers mean, shown on hover so the row stays compact.
  let tip: string | null = null;

  if (isAirMode(request.mode)) {
    const chargeable = request.chargeable_weight_kg;
    if (chargeable != null) {
      primary = `${gross || '-'} / ${chargeable} kg`;
      tip = t('quotationRequests.cargo.grossChargeable');
    } else {
      primary = `${gross || '-'} kg`;
    }
  } else if (isFclMode(request.mode)) {
    primary = request.container_type ?? '-';
    const containerQty = (request.containers ?? []).reduce((total, container) => total + Number(container.qty ?? 0), 0);
    if (containerQty > 0) caption = t('quotationRequests.cargo.containersCount', { count: containerQty });
  } else if (request.volume_cbm != null || request.chargeable_revenue_ton != null) {
    const cbm = request.volume_cbm != null ? `${request.volume_cbm} cbm` : '-';
    if (request.chargeable_revenue_ton != null) {
      primary = `${cbm} / ${request.chargeable_revenue_ton} RT`;
      tip = t('quotationRequests.cargo.cbmRt');
    } else {
      primary = cbm;
    }
  } else {
    primary = `${gross || '-'} kg / ${request.volume_cbm ?? '-'} cbm`;
  }

  const primaryText = <Text size="sm" className="tabular-nums">{primary}</Text>;

  return (
    <div className="rfq-queue-cargo">
      {tip ? <Tooltip label={tip} withArrow>{primaryText}</Tooltip> : primaryText}
      <Text size="xs" c="dimmed">{caption}</Text>
    </div>
  );
}
function ResponsesCell({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const responseCount = rfqResponseQuotations(request.quotations).length;
  if (responseCount > 0) {
    return <Text size="sm" fw={700} className="tabular-nums">{t('quotationRequests.responsesCount', { count: responseCount })}</Text>;
  }
  if (rfqHasDraftQuotation(request.quotations)) {
    return <Text size="sm" c="dimmed">{t('quotationRequests.draftInProgressShort')}</Text>;
  }
  return <Text size="sm" c="dimmed">{t('quotationRequests.noResponse')}</Text>;
}
const RFQ_SKELETON_ROWS = 6;
const RFQ_COLUMN_COUNT = 7;

/** Placeholder rows shown while the list is loading with nothing yet to display. */
function RfqSkeletonRows() {
  return (
    <>
      {Array.from({ length: RFQ_SKELETON_ROWS }).map((_, rowIndex) => (
        <Table.Tr key={rowIndex}>
          {Array.from({ length: RFQ_COLUMN_COUNT }).map((_, colIndex) => (
            <Table.Td key={colIndex}>
              <Skeleton height={16} width={`${85 - colIndex * 8}%`} />
            </Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}

export function QuotationRequestListView({
  activeTab,
  isLoading = false,
  onInspect,
  onTabChange,
  requests,
}: QuotationRequestListViewProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [needsActionOnly, setNeedsActionOnly] = useState(false);
  const normalizedSearch = search.toLowerCase().trim();
  const sortedRequests = useMemo(
    () => [...requests].sort((left, right) => String(right.create_at || '').localeCompare(String(left.create_at || ''))),
    [requests],
  );

  const tabCounts = useMemo(
    () =>
      buildTabCounts(
        sortedRequests,
        quotationRequestTabItems.map((tab) => tab.value),
        quotationRequestStatusTabs,
        (request) => request.status,
      ),
    [sortedRequests],
  );

  const needsActionCount = useMemo(
    () => sortedRequests.filter((request) => NEEDS_ACTION_STATUSES.includes(request.status)).length,
    [sortedRequests],
  );

  const filteredRequests = useMemo(
    () =>
      sortedRequests.filter((request) => {
        const matchesTab = activeTab === 'all'
          || quotationRequestStatusTabs[activeTab as Exclude<QuotationRequestTab, 'all'>].includes(request.status);
        const matchesNeedsAction = !needsActionOnly || NEEDS_ACTION_STATUSES.includes(request.status);
        const matchesSearch = [
          request.rfq_no,
          request.customer_ref,
          request.customer_po_ref,
          request.customer_contract_ref,
          request.supplier?.supplier_code,
          request.supplier?.supplier_name,
          request.mode,
          request.origin_port,
          request.destination_port,
          request.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
        return matchesTab && matchesNeedsAction && matchesSearch;
      }),
    [sortedRequests, activeTab, needsActionOnly, normalizedSearch],
  );

  return (
    <Stack gap="md" className="rfq-list">
      <SimpleGrid cols={{ base: 1, sm: 3 }} className="rfq-metric-grid dl-metrics-strip">
        <Metric className="rfq-metric-card" label={t('quotationRequests.metricNeedsAction')} value={needsActionCount} color="red" icon={<IconAlertTriangle size={22} />} />
        <Metric className="rfq-metric-card" label={t('quotationRequests.metricSubmitted')} value={tabCounts.submitted} color="cyan" icon={<IconSend size={22} />} />
        <Metric className="rfq-metric-card" label={t('quotationRequests.metricQuoted')} value={tabCounts.quoted} color="orange" icon={<IconTags size={22} />} />
      </SimpleGrid>

      <FilterToolbar
        activeTab={activeTab}
        className="rfq-list-filter-panel"
        isFetching={isLoading}
        onTabChange={(value) => onTabChange(value as QuotationRequestTab)}
        headerActions={(
          <Switch
            size="sm"
            checked={needsActionOnly}
            onChange={(event) => setNeedsActionOnly(event.currentTarget.checked)}
            label={t('quotationRequests.filterNeedsAction')}
          />
        )}
        shown={filteredRequests.length}
        tabs={quotationRequestTabItems.map((tab) => ({
          value: tab.value,
          label: t(tab.labelKey),
          count: tabCounts[tab.value],
        }))}
      >
        <TextInput
          leftSection={<IconSearch size={16} />}
          label={t('common.search')}
          placeholder={t('quotationRequests.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </FilterToolbar>

      <Paper withBorder p={0} className="dl-data-panel">
        {!isLoading && filteredRequests.length === 0 ? (
          <div className="rfq-list-empty">
            <EmptyState
              title={t('quotationRequests.emptyTitle')}
              description={t('quotationRequests.emptyDescription')}
            />
          </div>
        ) : (
          <div
            className={`rfq-list-body${isLoading && filteredRequests.length > 0 ? ' rfq-list-body--refetching' : ''}`}
            aria-busy={isLoading || undefined}
          >
          <Table.ScrollContainer minWidth={1120}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('quotationRequests.field.rfqNo')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.route')}</Table.Th>
                  <Table.Th>{t('quotationRequests.cargoSummary')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.readyDate')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>{t('quotationRequests.linkedQuotations')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading && filteredRequests.length === 0 ? (
                  <RfqSkeletonRows />
                ) : filteredRequests.map((request) => {
                  const supplierCode = request.supplier?.supplier_code ?? null;
                  const supplierName = request.supplier?.supplier_name ?? null;
                  // Show the short code in the row; the full name lives behind an info-icon tooltip.
                  const supplierPrimary = supplierCode ?? supplierName;
                  const supplierFullName = supplierName && supplierName !== supplierPrimary ? supplierName : null;
                  const urgency = rfqCargoReadyUrgency(request.desired_cargo_ready_date, request.status);
                  return (
                    <Table.Tr
                      key={request.id}
                      className="rfq-queue-row"
                      role="button"
                      tabIndex={0}
                      onClick={() => onInspect(request.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onInspect(request.id);
                        }
                      }}
                    >
                      <Table.Td>
                        {/* CopyIconButton stops its own click propagation, so it never opens the row. */}
                        <CopyValue value={request.rfq_no}>
                          <Text fw={800} size="sm">{request.rfq_no}</Text>
                        </CopyValue>
                        {request.customer_ref ? (
                          <Group gap={4} wrap="nowrap" className="rfq-queue-idline">
                            <Text span size="xs" className="rfq-queue-tag">{t('quotationRequests.listTag.customer')}</Text>
                            <Text size="xs" c="dimmed" aria-label={t('quotationRequests.customerAria', { ref: request.customer_ref })}>
                              {request.customer_ref}
                            </Text>
                          </Group>
                        ) : null}
                        {supplierPrimary ? (
                          <Group gap={4} wrap="nowrap" className="rfq-queue-supplier">
                            <Text span size="xs" className="rfq-queue-tag">{t('quotationRequests.listTag.supplier')}</Text>
                            <Text size="xs" c="dimmed">{supplierPrimary}</Text>
                            {supplierFullName ? (
                              <Tooltip
                                label={supplierFullName}
                                withArrow
                                w={260}
                                multiline
                                events={{ hover: true, focus: true, touch: true }}
                              >
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="xs"
                                  className="rfq-queue-info"
                                  aria-label={t('quotationRequests.supplierAria', { name: supplierFullName })}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <IconInfoCircle size={14} />
                                </ActionIcon>
                              </Tooltip>
                            ) : null}
                          </Group>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>{buildRfqRouteLabel(request)}</Text>
                        <div className="rfq-picker-chips" style={{ marginTop: 4 }}>
                          {request.mode ? <span className="rfq-picker-chip">{request.mode}</span> : null}
                          {request.incoterm_code ? <span className="rfq-picker-chip">{request.incoterm_code}</span> : null}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <CargoCell request={request} t={t} />
                      </Table.Td>
                      <Table.Td>
                        <div className="rfq-queue-timeline">
                          <Text size="sm">{formatDate(request.desired_cargo_ready_date)}</Text>
                          {urgency.key === 'overdue' || urgency.key === 'today' || urgency.key === 'soon' ? (
                            <Text
                              size="xs"
                              fw={600}
                              className={`rfq-ready-flag rfq-ready-flag--${urgency.key === 'overdue' ? 'overdue' : 'soon'}`}
                            >
                              {urgency.key === 'overdue'
                                ? t('quotationRequests.ready.overdue', { days: urgency.days })
                                : urgency.key === 'today'
                                  ? t('quotationRequests.ready.today')
                                  : t('quotationRequests.ready.soon', { days: urgency.days })}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">
                              {t('quotationRequests.timeline.created')}: {formatDate(request.create_at)}
                            </Text>
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={rfqStatusColor(request.status)} variant="light">
                          {t(`quotationRequests.status.${request.status}` as never)}
                        </Badge>
                        <Text size="xs" c="dimmed" className="rfq-queue-next" mt={4}>
                          {t(NEXT_ACTION_KEY[request.status])}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ResponsesCell request={request} t={t} />
                      </Table.Td>
                      <Table.Td ta="right">
                        <Tooltip label={t('quotationRequests.inspect')}>
                          <ActionIcon
                            variant="light"
                            aria-label={t('quotationRequests.inspect')}
                            onClick={(event) => {
                              event.stopPropagation();
                              onInspect(request.id);
                            }}
                          >
                            <IconEye size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          </div>
        )}
      </Paper>
    </Stack>
  );
}
