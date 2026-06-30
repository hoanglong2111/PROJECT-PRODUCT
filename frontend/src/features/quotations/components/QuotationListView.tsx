import { Badge, Button, Group, Paper, Stack, Table, Tabs, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';

import type { QuotationV1 } from '@shared/api/quotations';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import {
  quotationTabItems,
  quotationTotal,
  type QuotationTab,
} from '../model/quotationModel';
import { useQuotationsUiStore } from '../model/quotationsUiStore';

function formatMoney(amount: number, currency: string | null | undefined): string {
  return `${new Intl.NumberFormat('en-US').format(Math.round(amount))} ${currency ?? ''}`.trim();
}

type QuotationListViewProps = {
  filteredQuotations: QuotationV1[];
  tabCounts: Record<QuotationTab, number>;
  onInspect: (quotation: QuotationV1) => void;
  onNew: () => void;
};

export function QuotationListView({ filteredQuotations, tabCounts, onInspect, onNew }: QuotationListViewProps) {
  const { t } = useI18n();
  const activeTab = useQuotationsUiStore((s) => s.activeTab);
  const setActiveTab = useQuotationsUiStore((s) => s.setActiveTab);
  const search = useQuotationsUiStore((s) => s.search);
  const setSearch = useQuotationsUiStore((s) => s.setSearch);

  const pagination = useListPagination(filteredQuotations, [activeTab, search]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('quotations.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('quotations.subtitle')}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={onNew}>
          {t('quotations.newQuotation')}
        </Button>
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab((value ?? 'all') as QuotationTab)}>
        <Tabs.List>
          {quotationTabItems.map((tab) => (
            <Tabs.Tab
              key={tab.value}
              value={tab.value}
              rightSection={
                <Badge size="xs" variant="light" circle>
                  {tabCounts[tab.value]}
                </Badge>
              }
            >
              {t(tab.labelKey)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <TextInput
        leftSection={<IconSearch size={16} />}
        placeholder={t('quotations.searchPlaceholder')}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        maw={360}
      />

      <Paper withBorder>
        {filteredQuotations.length === 0 ? (
          <EmptyState title={t('quotations.emptyTitle')} description={t('quotations.emptyDescription')} />
        ) : (
          <>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('quotations.quoteNumber')}</Table.Th>
                  <Table.Th>{t('quotations.customer')}</Table.Th>
                  <Table.Th>{t('quotations.incoterm')}</Table.Th>
                  <Table.Th>{t('quotations.route')}</Table.Th>
                  <Table.Th>{t('quotations.total')}</Table.Th>
                  <Table.Th>{t('quotations.validUntil')}</Table.Th>
                  <Table.Th>{t('quotations.status')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagination.visibleItems.map((quotation) => (
                  <Table.Tr
                    key={quotation.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onInspect(quotation)}
                  >
                    <Table.Td fw={600}>{quotation.quotation_no}</Table.Td>
                    <Table.Td>{quotation.customer_ref ?? '—'}</Table.Td>
                    <Table.Td>{quotation.incoterm_code ?? '—'}</Table.Td>
                    <Table.Td>{quotation.mode ?? '—'}</Table.Td>
                    <Table.Td className="tabular-nums">
                      {formatMoney(quotationTotal(quotation), quotation.currency_code)}
                    </Table.Td>
                    <Table.Td>{quotation.valid_until ?? '—'}</Table.Td>
                    <Table.Td>
                      <StatusBadge status={quotation.status} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <ListPagination
              page={pagination.page}
              pageCount={pagination.pageCount}
              pageStart={pagination.pageStart}
              pageEnd={pagination.pageEnd}
              setPage={pagination.setPage}
              total={filteredQuotations.length}
            />
          </>
        )}
      </Paper>
    </Stack>
  );
}
