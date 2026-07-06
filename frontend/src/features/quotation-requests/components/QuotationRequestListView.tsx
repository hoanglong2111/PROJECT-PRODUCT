import { ActionIcon, Badge, Paper, SimpleGrid, Stack, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { IconEye, IconFileText, IconSearch, IconSend, IconTags } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';

import { buildRfqRouteLabel, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { CopyValue } from '@shared/components/CopyValue';
import { EmptyState } from '@shared/components/EmptyState';
import { FilterSegment } from '@shared/components/FilterSegment';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';

import {
  quotationRequestStatusTabs,
  quotationRequestTabItems,
  rfqTotalWeight,
  rfqStatusColor,
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

export function QuotationRequestListView({
  activeTab,
  isLoading = false,
  onInspect,
  onTabChange,
  requests,
}: QuotationRequestListViewProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const normalizedSearch = search.toLowerCase().trim();

  const tabCounts = useMemo(
    () =>
      quotationRequestTabItems.reduce<Record<QuotationRequestTab, number>>(
        (counts, tab) => {
          if (tab.value === 'all') {
            counts.all = requests.length;
            return counts;
          }
          const tabValue = tab.value as Exclude<QuotationRequestTab, 'all'>;
          counts[tabValue] = requests.filter((request) =>
            quotationRequestStatusTabs[tabValue].includes(request.status),
          ).length;
          return counts;
        },
        { all: 0, submitted: 0, received: 0, quoted: 0, confirmed: 0, cancelled: 0 },
      ),
    [requests],
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const matchesTab = activeTab === 'all'
          || quotationRequestStatusTabs[activeTab as Exclude<QuotationRequestTab, 'all'>].includes(request.status);
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
        return matchesTab && matchesSearch;
      }),
    [requests, activeTab, normalizedSearch],
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
          <Table.ScrollContainer minWidth={980}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('quotationRequests.field.rfqNo')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.customerRef')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.route')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.mode')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.readyDate')}</Table.Th>
                  <Table.Th>{t('quotationRequests.cargoSummary')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th ta="right">{t('quotationRequests.linkedQuotations')}</Table.Th>
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
                    </Table.Td>
                    <Table.Td>{request.customer_ref ?? '-'}</Table.Td>
                    <Table.Td>{buildRfqRouteLabel(request)}</Table.Td>
                    <Table.Td>{request.mode ?? '-'}</Table.Td>
                    <Table.Td>{formatDate(request.desired_cargo_ready_date)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {rfqTotalWeight(request.lines ?? []) || request.gross_weight_kg || '-'} kg / {request.volume_cbm ?? '-'} cbm
                      </Text>
                      <Text size="xs" c="dimmed">
                        {(request.lines?.length ?? 0)} {t('quotationRequests.lines')} / {request.container_type ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={rfqStatusColor(request.status)} variant="light">
                        {t(`quotationRequests.status.${request.status}` as never)}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right" className="tabular-nums">
                      {request.quotations?.length ?? 0}
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
    <Paper withBorder p="md" className="metric-card rfq-metric-card">
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
