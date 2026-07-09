import { ActionIcon, Badge, Paper, SimpleGrid, Stack, Switch, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { IconEye, IconFileText, IconSearch, IconSend, IconTags } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';

import {
  buildRfqRouteLabel,
  type QuotationRequestStatusV1,
  type QuotationRequestV1,
} from '@shared/api/quotationRequests';
import { CopyValue } from '@shared/components/CopyValue';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterSegment } from '@shared/components/FilterSegment';
import { useI18n, type MessageKey } from '@shared/i18n';
import { buildTabCounts } from '@shared/lib/tabCounts';
import { formatDate } from '@shared/utils/date';

import {
  isAirMode,
  isFclMode,
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

const tabColors: Record<QuotationRequestTab, string> = {
  all: 'gray',
  submitted: 'blue',
  received: 'cyan',
  quoted: 'orange',
  confirmed: 'green',
  cancelled: 'gray',
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
  const linesLabel = `${lineCount} ${t('quotationRequests.lines')}`;

  let primary: string;
  if (isAirMode(request.mode)) {
    const chargeable = request.chargeable_weight_kg;
    primary = chargeable != null ? `${gross || '-'} kg / ${chargeable} kg` : `${gross || '-'} kg`;
  } else if (isFclMode(request.mode)) {
    primary = request.container_type ?? '-';
  } else if (request.volume_cbm != null || request.chargeable_revenue_ton != null) {
    const cbm = request.volume_cbm != null ? `${request.volume_cbm} cbm` : '-';
    primary = request.chargeable_revenue_ton != null ? `${cbm} / ${request.chargeable_revenue_ton} RT` : cbm;
  } else {
    primary = `${gross || '-'} kg / ${request.volume_cbm ?? '-'} cbm`;
  }

  return (
    <div className="rfq-queue-cargo">
      <Text size="sm" className="tabular-nums">{primary}</Text>
      <Text size="xs" c="dimmed">{linesLabel}</Text>
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
      <SimpleGrid cols={{ base: 1, sm: 3 }} className="rfq-metric-grid">
        <Metric label={t('quotationRequests.metricShown')} value={filteredRequests.length} color="blue" icon={<IconFileText size={22} />} />
        <Metric label={t('quotationRequests.metricSubmitted')} value={tabCounts.submitted} color="cyan" icon={<IconSend size={22} />} />
        <Metric label={t('quotationRequests.metricQuoted')} value={tabCounts.quoted} color="orange" icon={<IconTags size={22} />} />
      </SimpleGrid>

      <Paper withBorder p="md" className="rfq-list-filter-panel dl-filter-panel">
        <div className="dl-filter-head">
          <div className="dl-filter-head__control">
            <FilterSegment
              ariaLabel={t('common.status')}
              value={activeTab}
              onChange={(value) => onTabChange(value as QuotationRequestTab)}
              options={quotationRequestTabItems.map((tab) => ({
                value: tab.value,
                label: t(tab.labelKey),
                count: tabCounts[tab.value],
                color: tabColors[tab.value],
              }))}
            />
          </div>
          <div className="dl-filter-result">
            <Switch
              size="sm"
              checked={needsActionOnly}
              onChange={(event) => setNeedsActionOnly(event.currentTarget.checked)}
              label={t('quotationRequests.filterNeedsAction')}
            />
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: filteredRequests.length })}
            </Text>
          </div>
        </div>

        <TextInput
          mt="md"
          leftSection={<IconSearch size={16} />}
          label={t('common.search')}
          placeholder={t('quotationRequests.searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </Paper>

      <Paper withBorder p={0} className="dl-data-panel">
        {filteredRequests.length === 0 ? (
          <div className="rfq-list-empty">
            <EmptyState
              title={t('quotationRequests.emptyTitle')}
              description={isLoading ? t('common.loadingDescription') : t('quotationRequests.emptyDescription')}
            />
          </div>
        ) : (
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
                {filteredRequests.map((request) => (
                  <Table.Tr key={request.id}>
                    <Table.Td>
                      <CopyValue value={request.rfq_no}>
                        <Text fw={800} size="sm">{request.rfq_no}</Text>
                      </CopyValue>
                      <Text size="xs" c="dimmed">{request.customer_ref ?? '-'}</Text>
                      {request.supplier?.supplier_code ? (
                        <Text size="xs" c="dimmed">{request.supplier.supplier_code}</Text>
                      ) : null}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{buildRfqRouteLabel(request)}</Text>
                      <div className="rfq-picker-chips" style={{ marginTop: 4 }}>
                        {request.mode ? <span className="rfq-picker-chip">{request.mode}</span> : null}
                        {request.incoterm_code ? <span className="rfq-picker-chip">{request.incoterm_code}</span> : null}
                        {request.currency_code ? <span className="rfq-picker-chip">{request.currency_code}</span> : null}
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <CargoCell request={request} t={t} />
                    </Table.Td>
                    <Table.Td>
                      <div className="rfq-queue-timeline">
                        <Text size="sm">{formatDate(request.desired_cargo_ready_date)}</Text>
                        <Text size="xs" c="dimmed">
                          {t('quotationRequests.timeline.created')}: {formatDate(request.create_at)}
                        </Text>
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
                        <ActionIcon variant="light" aria-label={t('quotationRequests.inspect')} onClick={() => onInspect(request.id)}>
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
}

function Metric({ color, icon, label, value }: { color: 'blue' | 'cyan' | 'orange'; icon: ReactNode; label: string; value: number }) {
  return (
    <Paper
      withBorder
      p="md"
      className="metric-card rfq-metric-card kbfe-surface-wash kbfe-surface-wash--emphasis"
      data-surface-tone={color}
    >
      <div>
        <Text className="metric-label" size="xs" fw={700} tt="uppercase" mb={4}>
          {label}
        </Text>
        <Title order={1} fw={800} style={{ lineHeight: 1.1 }}>
          {new Intl.NumberFormat().format(value)}
        </Title>
      </div>
      <span className={`metric-icon metric-icon-${color}`}>{icon}</span>
    </Paper>
  );
}
