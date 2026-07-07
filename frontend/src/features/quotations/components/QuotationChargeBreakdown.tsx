import { ActionIcon, Alert, Button, Checkbox, Collapse, Group, NumberInput, Stack, Table, Text, Textarea, Tooltip } from '@mantine/core';
import { IconChevronDown, IconHistory, IconSend, IconX } from '@tabler/icons-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

import type { QuotationChargeGroup, QuotationChargeLineV1, QuotationLineAdjustmentV1, QuotationV1 } from '@shared/api/quotations';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import {
  computeQuotationLineVnd,
  QUOTATION_VAT_RATE,
  summarizeQuotationVndLines,
} from '@shared/lib/quotationCharges';
import { formatMoney, roundToMinorUnits } from '@shared/utils/money';

export type QuotationChargeAdjustmentDraft = {
  charge_line_id: string;
  proposed_unit_price: number;
  note?: string | null;
};

type DraftLineState = {
  enabled: boolean;
  proposedUnitPrice: number | string;
  note: string;
};

type DisplayLine = {
  line: QuotationChargeLineV1;
  quantity: number;
  unitPrice: number;
  proposedUnitPrice: number;
  unitDelta: number;
  note: string;
  enabled: boolean;
  localAmount: number;
  vndBreakdown: ReturnType<typeof computeQuotationLineVnd>;
};

type QuotationChargeBreakdownProps = {
  quotation: QuotationV1;
  chargeLines: QuotationChargeLineV1[];
  adjustMode: boolean;
  isSubmitting?: boolean;
  rateToVnd: (code: string | null | undefined) => number;
  onCancelAdjust: () => void;
  onSubmitAdjust: (lines: QuotationChargeAdjustmentDraft[]) => void;
};

function formatAmount(amount: number, currency: string | null | undefined): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(roundToMinorUnits(amount, currency));
}

function formatChargeDescription(value?: string | null): string {
  const description = value?.trim();
  if (!description) return '-';
  return description.startsWith('-') ? description : `- ${description}`;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupLines(lines: DisplayLine[]) {
  const grouped = new Map<QuotationChargeGroup, DisplayLine[]>();
  for (const group of QUOTATION_CHARGE_GROUPS) grouped.set(group.value, []);
  for (const line of lines) {
    grouped.get(line.line.charge_group ?? 'FREIGHT')?.push(line);
  }
  return QUOTATION_CHARGE_GROUPS.map((group) => ({
    ...group,
    lines: grouped.get(group.value) ?? [],
  }));
}

function buildLineHistory(line: QuotationChargeLineV1, adjustments: QuotationLineAdjustmentV1[]) {
  const sorted = adjustments
    .filter((adjustment) => adjustment.charge_line_id === line.id)
    .sort((left, right) => Number(left.round_no || 0) - Number(right.round_no || 0));
  if (sorted.length === 0) return [];

  const first = sorted[0];
  return [
    {
      key: `${line.id}-initial`,
      actor: 'FDS',
      labelKey: 'quotations.initialPrice' as const,
      roundNo: Number(first.round_no || 1),
      price: numeric(first.base_unit_price),
      note: null,
    },
    ...sorted.map((adjustment) => ({
      key: adjustment.id,
      actor: adjustment.actor_role,
      labelKey: 'quotations.negotiationRound' as const,
      roundNo: Number(adjustment.round_no || 0),
      price: numeric(adjustment.proposed_unit_price),
      note: adjustment.note,
    })),
  ];
}

export function QuotationChargeBreakdown({
  quotation,
  chargeLines,
  adjustMode,
  isSubmitting,
  rateToVnd,
  onCancelAdjust,
  onSubmitAdjust,
}: QuotationChargeBreakdownProps) {
  const { t } = useI18n();
  const [chargesExpanded, setChargesExpanded] = useState(true);
  const [draftByLineId, setDraftByLineId] = useState<Record<string, DraftLineState>>({});
  const [historyExpandedByLineId, setHistoryExpandedByLineId] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const chargesToggleLabel = chargesExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges');
  const paymentCurrency = quotation.currency_code ?? 'VND';

  useEffect(() => {
    setDraftByLineId((current) => {
      const next: Record<string, DraftLineState> = {};
      for (const line of chargeLines) {
        next[line.id] = current[line.id] ?? {
          enabled: false,
          proposedUnitPrice: numeric(line.unit_price),
          note: '',
        };
      }
      return next;
    });
  }, [chargeLines]);

  useEffect(() => {
    if (adjustMode) {
      setSubmitAttempted(false);
    }
  }, [adjustMode]);

  const displayLines = useMemo<DisplayLine[]>(() => (
    chargeLines.map((line) => {
      const draft = draftByLineId[line.id];
      const quantity = numeric(line.quantity);
      const unitPrice = numeric(line.unit_price);
      const enabled = Boolean(draft?.enabled);
      const proposedUnitPrice = adjustMode && enabled ? numeric(draft?.proposedUnitPrice ?? unitPrice) : unitPrice;
      const localAmount = quantity * proposedUnitPrice;
      const vndBreakdown = computeQuotationLineVnd(
        {
          quantity,
          unitPrice: proposedUnitPrice,
          currency: line.currency_code,
          endpointCurrency: paymentCurrency,
          taxable: numeric(line.tax_rate) > 0,
        },
        (code) => rateToVnd(code),
      );

      return {
        line,
        quantity,
        unitPrice,
        proposedUnitPrice,
        unitDelta: proposedUnitPrice - unitPrice,
        note: draft?.note ?? '',
        enabled,
        localAmount,
        vndBreakdown,
      };
    })
  ), [adjustMode, chargeLines, draftByLineId, paymentCurrency, rateToVnd]);

  const groupedLines = useMemo(() => groupLines(displayLines), [displayLines]);
  const quotationVndTotals = useMemo(
    () => summarizeQuotationVndLines(displayLines.map((row) => row.vndBreakdown)),
    [displayLines],
  );
  const paymentRate = paymentCurrency === 'VND' ? 1 : rateToVnd(paymentCurrency);
  const customerPaysTotal = paymentRate ? quotationVndTotals.totalVnd / paymentRate : null;
  const originalCurrencyItems = displayLines
    .filter(({ line, localAmount }) => line.currency_code && localAmount > 0)
    .map(({ line, localAmount }) => ({
      key: line.id,
      name: line.description || line.charge_code || line.charge_type,
      amount: localAmount,
      currency: line.currency_code as string,
    }));
  const referenceCurrency = displayLines.find(({ line }) => line.currency_code && line.currency_code !== 'VND')?.line.currency_code ?? null;
  const referenceRate = referenceCurrency ? rateToVnd(referenceCurrency) : null;
  const changedLines = displayLines
    .filter(({ enabled, unitDelta }) => enabled && Math.abs(unitDelta) > 0.000001)
    .map(({ line, proposedUnitPrice, note }) => ({
      charge_line_id: line.id,
      proposed_unit_price: proposedUnitPrice,
      note: note.trim() || null,
    }));

  const setDraft = (lineId: string, patch: Partial<DraftLineState>) => {
    setDraftByLineId((current) => ({
      ...current,
      [lineId]: {
        enabled: current[lineId]?.enabled ?? false,
        proposedUnitPrice: current[lineId]?.proposedUnitPrice ?? 0,
        note: current[lineId]?.note ?? '',
        ...patch,
      },
    }));
  };

  return (
    <div>
      <div className="rfq-panel-head">
        <div>
          <Text fw={800}>{t('quotations.chargeBreakdown')}</Text>
          <Text size="xs" c="dimmed" className="rfq-breakdown-meta">
            {adjustMode ? t('quotations.adjustHint') : t('quotations.chargeLinesCount', { count: chargeLines.length })}
          </Text>
        </div>
        <Tooltip label={chargesToggleLabel}>
          <ActionIcon
            aria-expanded={chargesExpanded}
            aria-label={chargesToggleLabel}
            className="rfq-breakdown-toggle"
            variant="light"
            onClick={() => setChargesExpanded((current) => !current)}
          >
            <IconChevronDown
              className={chargesExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'}
              size={18}
            />
          </ActionIcon>
        </Tooltip>
      </div>

      <Collapse expanded={chargesExpanded}>
        {chargeLines.length === 0 ? (
          <div className="rfq-empty-lines">
            <Text c="dimmed" size="sm">{t('quotations.noChargeLines')}</Text>
          </div>
        ) : (
          <Stack gap="md" p="md">
            {groupedLines.map((group) => {
              if (group.lines.length === 0) return null;
              const groupTotals = summarizeQuotationVndLines(group.lines.map((row) => row.vndBreakdown));

              return (
                <section className="rfq-breakdown-group" key={group.value}>
                  <Group justify="space-between" align="center" className="rfq-breakdown-group-head">
                    <Text fw={800} size="sm">{t(group.labelKey)}</Text>
                    <Text size="xs" c="dimmed" className="tabular-nums">
                      {t('quotations.groupSubtotal')}: {formatMoney(groupTotals.totalVnd, 'VND')}
                    </Text>
                  </Group>
                  <div className="rfq-table-scroll">
                    <Table highlightOnHover className="rfq-charge-table rfq-charge-table--adjustable">
                      <Table.Thead>
                        <Table.Tr>
                          {adjustMode ? <Table.Th className="rfq-adjust-check-column" /> : null}
                          <Table.Th>{t('quotations.chargeBreakdown')}</Table.Th>
                          <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
                          <Table.Th>{t('forms.unit')}</Table.Th>
                          <Table.Th ta="right">{adjustMode ? t('quotations.currentPrice') : t('quotations.unitPrice')}</Table.Th>
                          {adjustMode ? (
                            <>
                              <Table.Th ta="right">{t('quotations.yourProposedPrice')}</Table.Th>
                              <Table.Th ta="right">{t('quotations.priceDelta')}</Table.Th>
                              <Table.Th>{t('quotations.lineNote')}</Table.Th>
                            </>
                          ) : (
                            <>
                              <Table.Th ta="right">{t('forms.taxAmount')}</Table.Th>
                              <Table.Th ta="right">{t('quotations.lineTotal')}</Table.Th>
                            </>
                          )}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {group.lines.map(({ line, quantity, unitPrice, proposedUnitPrice, vndBreakdown, unitDelta, note, enabled }) => {
                          const lineCurrency = line.currency_code ?? quotation.currency_code;
                          const deltaColor = unitDelta > 0 ? 'red' : unitDelta < 0 ? 'teal' : 'dimmed';
                          const lineHistory = buildLineHistory(line, quotation.adjustments ?? []);
                          const isHistoryExpanded = Boolean(historyExpandedByLineId[line.id]);
                          const taxAmount = vndBreakdown.vatVnd;
                          const totalAmount = vndBreakdown.totalEndpoint;

                          return (
                            <Fragment key={line.id}>
                              <Table.Tr data-adjusted={enabled && Math.abs(unitDelta) > 0.000001}>
                                {adjustMode ? (
                                  <Table.Td className="rfq-adjust-check-column">
                                    <Checkbox
                                      aria-label={t('quotations.proposeThisLine')}
                                      checked={enabled}
                                      onChange={(event) => setDraft(line.id, {
                                        enabled: event.currentTarget.checked,
                                        proposedUnitPrice: event.currentTarget.checked ? proposedUnitPrice : unitPrice,
                                      })}
                                    />
                                  </Table.Td>
                                ) : null}
                                <Table.Td>
                                  <Group gap="xs" wrap="nowrap" align="flex-start">
                                    <div>
                                      <Text fw={600} size="sm">{formatChargeDescription(line.description ?? line.charge_type)}</Text>
                                      {line.note ? (
                                        <Text size="xs" c="dimmed">{line.note}</Text>
                                      ) : null}
                                    </div>
                                    {lineHistory.length > 0 ? (
                                      <Tooltip label={t('quotations.priceHistory')}>
                                        <ActionIcon
                                          aria-expanded={isHistoryExpanded}
                                          aria-label={t('quotations.priceHistory')}
                                          size="sm"
                                          variant="subtle"
                                          onClick={() => setHistoryExpandedByLineId((current) => ({
                                            ...current,
                                            [line.id]: !isHistoryExpanded,
                                          }))}
                                        >
                                          <IconHistory size={15} />
                                        </ActionIcon>
                                      </Tooltip>
                                    ) : null}
                                  </Group>
                                </Table.Td>
                                <Table.Td ta="right" className="tabular-nums">
                                  {Number.isFinite(quantity) ? new Intl.NumberFormat().format(quantity) : '-'}
                                </Table.Td>
                                <Table.Td>{line.unit ?? '-'}</Table.Td>
                                <Table.Td ta="right" className="tabular-nums">
                                  {Number.isFinite(unitPrice) ? formatAmount(unitPrice, lineCurrency) : '-'}
                                </Table.Td>
                                {adjustMode ? (
                                  <>
                                    <Table.Td ta="right">
                                      <NumberInput
                                        aria-label={`${t('quotations.yourProposedPrice')} ${line.description}`}
                                        className="rfq-adjust-price-input"
                                        decimalScale={6}
                                        disabled={!enabled}
                                        min={0}
                                        size="xs"
                                        thousandSeparator=","
                                        value={draftByLineId[line.id]?.proposedUnitPrice ?? proposedUnitPrice}
                                        onChange={(value) => setDraft(line.id, { proposedUnitPrice: value })}
                                      />
                                    </Table.Td>
                                    <Table.Td ta="right" className="tabular-nums">
                                      <Text c={deltaColor} fw={800} size="sm">
                                        {!enabled || unitDelta === 0 ? '-' : formatAmount(unitDelta, lineCurrency)}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Textarea
                                        aria-label={`${t('quotations.lineNote')} ${line.description}`}
                                        autosize
                                        className="rfq-adjust-note-input"
                                        disabled={!enabled}
                                        minRows={1}
                                        placeholder={t('quotations.adjustNotePlaceholder')}
                                        size="xs"
                                        value={note}
                                        onChange={(event) => setDraft(line.id, { note: event.currentTarget.value })}
                                      />
                                    </Table.Td>
                                  </>
                                ) : (
                                  <>
                                    <Table.Td ta="right" className="tabular-nums">
                                      {Number.isFinite(taxAmount) ? formatMoney(taxAmount, 'VND') : '-'}
                                    </Table.Td>
                                    <Table.Td ta="right" className="tabular-nums">
                                      {Number.isFinite(totalAmount) ? formatMoney(totalAmount, paymentCurrency) : '-'}
                                    </Table.Td>
                                  </>
                                )}
                              </Table.Tr>
                              {isHistoryExpanded ? (
                                <Table.Tr className="rfq-price-history-row">
                                  <Table.Td colSpan={adjustMode ? 8 : 6}>
                                    <div className="rfq-price-history-ladder">
                                      {lineHistory.map((entry, index) => (
                                        <div className="rfq-price-history-step" key={entry.key}>
                                          <span className="rfq-price-history-dot" aria-hidden="true" />
                                          <div>
                                            <Text size="xs" fw={800}>
                                              {entry.labelKey === 'quotations.initialPrice'
                                                ? t(entry.labelKey)
                                                : t(entry.labelKey, { round: entry.roundNo })}
                                              {' · '}
                                              {entry.actor}
                                            </Text>
                                            <Text size="sm" fw={800} className="tabular-nums">
                                              {formatAmount(entry.price, lineCurrency)}
                                            </Text>
                                            {entry.note ? (
                                              <Text size="xs" c="dimmed">{entry.note}</Text>
                                            ) : null}
                                          </div>
                                          {index < lineHistory.length - 1 ? <span className="rfq-price-history-connector" aria-hidden="true" /> : null}
                                        </div>
                                      ))}
                                    </div>
                                  </Table.Td>
                                </Table.Tr>
                              ) : null}
                            </Fragment>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </div>
                </section>
              );
            })}
          </Stack>
        )}

        <div className="rfq-breakdown-total">
          <Stack gap="xs">
            <Text fw={800}>{t('quotations.subtotalsByCurrency')}</Text>
            {adjustMode && submitAttempted && changedLines.length === 0 ? (
              <Alert color="yellow" py={6}>
                {t('quotations.noAdjustedLines')}
              </Alert>
            ) : null}
          </Stack>
          <div className="rfq-breakdown-total-stack">
            {originalCurrencyItems.map((item) => (
              <Group justify="flex-end" gap="sm" wrap="nowrap" key={item.key}>
                <Text size="sm" c="dimmed" className="rfq-original-item-name">
                  {item.name}
                </Text>
                <Text fw={700} className="tabular-nums">
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </Group>
            ))}
            <div className="rfq-total-separator" />
            <Group justify="flex-end" gap="sm" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {t('quotations.vatLabel', { rate: QUOTATION_VAT_RATE })}
              </Text>
              <Text fw={800} className="tabular-nums">
                {paymentRate ? formatMoney(quotationVndTotals.taxVnd / paymentRate, paymentCurrency) : '-'}
              </Text>
            </Group>
            <Group justify="flex-end" gap="sm" wrap="nowrap" className="rfq-customer-pays-summary">
              <Text size="sm" c="dimmed">
                {t('quotations.customerPays')} ({paymentCurrency})
              </Text>
              <Text fw={900} className="tabular-nums">
                {customerPaysTotal != null ? formatMoney(customerPaysTotal, paymentCurrency) : '-'}
              </Text>
            </Group>
            <Text size="xs" c="dimmed" ta="right">
              {t('quotations.internalVndTotal')}: {formatMoney(quotationVndTotals.totalVnd, 'VND')}
            </Text>
            {referenceCurrency && referenceRate ? (
              <Text size="xs" c="dimmed" ta="right">
                {t('quotations.referenceRate')}: 1 {referenceCurrency} = {new Intl.NumberFormat('vi-VN').format(referenceRate)} VND
              </Text>
            ) : null}
          </div>
        </div>

        {adjustMode ? (
          <Group className="rfq-adjust-actions" justify="flex-end" p="md">
            <Button variant="subtle" leftSection={<IconX size={16} />} onClick={onCancelAdjust}>
              {t('common.cancel')}
            </Button>
            <Button
              leftSection={<IconSend size={16} />}
              loading={isSubmitting}
              onClick={() => {
                setSubmitAttempted(true);
                if (changedLines.length > 0) {
                  onSubmitAdjust(changedLines);
                }
              }}
            >
              {quotation.status === 'PENDING_ADJUSTMENT' ? t('quotations.sendCounterToKbi') : t('quotations.sendCounterToFds')}
            </Button>
          </Group>
        ) : null}
      </Collapse>
    </div>
  );
}
