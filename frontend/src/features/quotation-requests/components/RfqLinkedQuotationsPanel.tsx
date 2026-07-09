import { Button, Paper, Table, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

import { rfqHasDraftQuotation, rfqResponseQuotations, type TFn } from '../model/quotationRequestModel';
import { RfqCardFact } from './RfqResponsiveData';

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
  const quotationViews = responseQuotations.map((quotation) => {
    const recommendedOption = quotation.options?.find((option) => option.is_recommended)
      ?? quotation.options?.find((option) => option.is_selected)
      ?? null;

    return {
      id: quotation.id,
      number: quotation.quotation_no,
      createdDate: formatDate(quotation.create_at),
      status: statusLabel(quotation.status),
      total: formatMoney(quotation.grand_total_amount, quotation.currency_code),
      mode: quotation.mode ?? '-',
      incoterm: quotation.incoterm_code ?? '-',
      carrier: recommendedOption?.carrier_name ?? recommendedOption?.carrier_code ?? '-',
      schedule: recommendedOption
        ? `${recommendedOption.transit_time_days ?? '-'}d / ETD ${formatDate(recommendedOption.etd)} / ETA ${formatDate(recommendedOption.eta)}`
        : '-',
      optionCount: quotation.options?.length ?? 0,
      validUntil: formatDate(quotation.valid_until),
    };
  });

  const subtitle =
    responseQuotations.length > 0
      ? t('quotationRequests.responsesCount', { count: responseQuotations.length })
      : hasDraftQuotation
        ? t('quotationRequests.draftQuotationInProgress')
        : t('quotationRequests.noLinkedQuotations');

  return (
    <section id={LINKED_QUOTATIONS_SECTION_ID} className="rfq-linked-quotations" aria-labelledby="rfq-quotations-title">
      <Paper withBorder p={0} className="dl-data-panel rfq-request-data-panel">
        <div className="rfq-panel-head">
          <div>
            <Text id="rfq-quotations-title" fw={800}>{t('quotationRequests.linkedQuotations')}</Text>
            <Text size="xs" c="dimmed">{subtitle}</Text>
          </div>
        </div>
        <Table.ScrollContainer className="rfq-table-scroll-container rfq-responsive-table" minWidth={1040}>
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
              {quotationViews.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" size="sm">
                      {hasDraftQuotation ? t('quotationRequests.draftQuotationInProgress') : t('quotationRequests.noLinkedQuotations')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                quotationViews.map((quotation) => (
                    <Table.Tr key={quotation.id}>
                      <Table.Td>
                        <Text fw={700} size="sm">{quotation.number}</Text>
                      </Table.Td>
                      <Table.Td>{quotation.createdDate}</Table.Td>
                      <Table.Td>{quotation.status}</Table.Td>
                      <Table.Td className="tabular-nums">
                        {quotation.total}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{quotation.mode}</Text>
                        <Text size="xs" c="dimmed">{quotation.incoterm}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {quotation.carrier}
                        </Text>
                        <Text size="xs" c="dimmed">{quotation.schedule}</Text>
                      </Table.Td>
                      <Table.Td ta="right" className="tabular-nums">
                        {quotation.optionCount}
                      </Table.Td>
                      <Table.Td>{quotation.validUntil}</Table.Td>
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
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <div className="rfq-responsive-cards">
          {quotationViews.length === 0 ? (
            <div className="rfq-data-card-empty">
              <Text c="dimmed" size="sm">
                {hasDraftQuotation ? t('quotationRequests.draftQuotationInProgress') : t('quotationRequests.noLinkedQuotations')}
              </Text>
            </div>
          ) : (
            quotationViews.map((quotation) => (
              <article className="rfq-data-card" key={quotation.id}>
                <div className="rfq-data-card-head">
                  <div>
                    <Text fw={800}>{quotation.number}</Text>
                    <Text size="xs" c="dimmed">{quotation.status}</Text>
                  </div>
                  <Text size="sm" fw={700} className="tabular-nums">{quotation.total}</Text>
                </div>
                <div className="rfq-data-card-facts">
                  <RfqCardFact
                    label={t('quotationRequests.response.modeIncoterm')}
                    value={<Text size="sm">{quotation.mode} / {quotation.incoterm}</Text>}
                  />
                  <RfqCardFact
                    label={t('quotationRequests.response.createdDate')}
                    value={<Text size="sm" className="tabular-nums">{quotation.createdDate}</Text>}
                  />
                  <RfqCardFact
                    label={t('quotations.validUntil')}
                    value={<Text size="sm" className="tabular-nums">{quotation.validUntil}</Text>}
                  />
                  <RfqCardFact
                    label={t('quotationRequests.response.optionCount')}
                    value={<Text size="sm" className="tabular-nums">{quotation.optionCount}</Text>}
                  />
                  <RfqCardFact
                    label={t('quotationRequests.response.recommendedOption')}
                    value={
                      <>
                        <Text size="sm" fw={700}>{quotation.carrier}</Text>
                        <Text size="xs" c="dimmed">{quotation.schedule}</Text>
                      </>
                    }
                    wide
                  />
                </div>
                <Button
                  className="rfq-data-card-action"
                  variant="light"
                  rightSection={<IconExternalLink size={14} />}
                  onClick={() => onView(quotation.id)}
                >
                  {t('common.view')}
                </Button>
              </article>
            ))
          )}
        </div>
      </Paper>
    </section>
  );
}
