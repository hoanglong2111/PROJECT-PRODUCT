import { Button, Paper, Table, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

import { rfqHasDraftQuotation, rfqResponseQuotations, type TFn } from '../model/quotationRequestModel';

export const LINKED_QUOTATIONS_SECTION_ID = 'rfq-linked-quotations';

export function LinkedQuotationsPanel({
  request,
  t,
  statusLabel,
  onView,
}: {
  request: QuotationRequestV1;
  t: TFn;
  statusLabel: (status: string) => string;
  onView: (quotationId: string) => void;
}) {
  const responseQuotations = rfqResponseQuotations(request.quotations);
  const hasDraftQuotation = rfqHasDraftQuotation(request.quotations);

  const subtitle =
    responseQuotations.length > 0
      ? t('quotationRequests.responsesCount', { count: responseQuotations.length })
      : hasDraftQuotation
        ? t('quotationRequests.draftQuotationInProgress')
        : t('quotationRequests.noLinkedQuotations');

  return (
    <div id={LINKED_QUOTATIONS_SECTION_ID}>
      <Paper withBorder p={0} className="dl-data-panel">
        <div className="rfq-panel-head">
          <div>
            <Text fw={800}>{t('quotationRequests.linkedQuotations')}</Text>
            <Text size="xs" c="dimmed">{subtitle}</Text>
          </div>
        </div>
        <Table.ScrollContainer className="rfq-table-scroll-container" minWidth={1040}>
          <Table highlightOnHover verticalSpacing="sm" className="rfq-detail-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('quotations.quoteNumber')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.createdDate')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.grandTotal')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.modeIncoterm')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.recommendedOption')}</Table.Th>
                <Table.Th ta="right">{t('quotationRequests.response.optionCount')}</Table.Th>
                <Table.Th>{t('quotations.validUntil')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {responseQuotations.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" size="sm">
                      {hasDraftQuotation ? t('quotationRequests.draftQuotationInProgress') : t('quotationRequests.noLinkedQuotations')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                responseQuotations.map((quotation) => {
                  const recommendedOption = quotation.options?.find((option) => option.is_recommended)
                    ?? quotation.options?.find((option) => option.is_selected)
                    ?? null;

                  return (
                    <Table.Tr key={quotation.id}>
                      <Table.Td>
                        <Text fw={700} size="sm">{quotation.quotation_no}</Text>
                      </Table.Td>
                      <Table.Td>{formatDate(quotation.create_at)}</Table.Td>
                      <Table.Td>{statusLabel(quotation.status)}</Table.Td>
                      <Table.Td className="tabular-nums">
                        {formatMoney(quotation.grand_total_amount, quotation.currency_code)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{quotation.mode ?? '-'}</Text>
                        <Text size="xs" c="dimmed">{quotation.incoterm_code ?? '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {recommendedOption?.carrier_name ?? recommendedOption?.carrier_code ?? '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {recommendedOption
                            ? `${recommendedOption.transit_time_days ?? '-'}d / ETD ${formatDate(recommendedOption.etd)} / ETA ${formatDate(recommendedOption.eta)}`
                            : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right" className="tabular-nums">
                        {quotation.options?.length ?? 0}
                      </Table.Td>
                      <Table.Td>{formatDate(quotation.valid_until)}</Table.Td>
                      <Table.Td ta="right">
                        <Button
                          size="xs"
                          variant="light"
                          rightSection={<IconExternalLink size={14} />}
                          onClick={() => onView(quotation.id)}
                        >
                          {t('common.view')}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </div>
  );
}
