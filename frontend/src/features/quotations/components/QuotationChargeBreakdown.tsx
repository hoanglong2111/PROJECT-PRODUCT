import { ActionIcon, Alert, Button, Checkbox, Collapse, Group, NumberInput, Table, Text, Textarea, Tooltip } from '@mantine/core';
import { IconChevronDown, IconHistory, IconSend, IconX } from '@tabler/icons-react';
import { Fragment, useEffect, useMemo, useState } from 'react';

import type { QuotationChargeGroup, QuotationChargeLineV1, QuotationLineAdjustmentV1, QuotationV1 } from '@shared/api/quotations';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import {
  computeQuotationLineVnd,
  summarizeQuotationVndLines,
} from '@shared/lib/quotationCharges';
import { formatMoney, formatUnitPrice } from '@shared/utils/money';

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
  lineCurrency: string;
  localAmount: number;
  vndBreakdown: ReturnType<typeof computeQuotationLineVnd>;
};

type QuotationChargeBreakdownProps = {
  quotation: QuotationV1;
  chargeLines: QuotationChargeLineV1[];
  adjustMode: boolean;
  isSubmitting?: boolean;
  rateToVndOrNull: (code: string | null | undefined) => number | null;
  onCancelAdjust: () => void;
  onSubmitAdjust: (lines: QuotationChargeAdjustmentDraft[]) => void;
};

function formatChargeDescription(value?: string | null): string {
  const description = value?.trim();
  if (!description) return '-';
  return description.startsWith('-') ? description : `- ${description}`;
}

function numeric(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveLineCurrency(line: QuotationChargeLineV1, fallbackCurrency: string): string {
  return line.currency_code?.trim() || fallbackCurrency;
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
  rateToVndOrNull,
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
      const lineCurrency = resolveLineCurrency(line, paymentCurrency);
      const enabled = Boolean(draft?.enabled);
      const proposedUnitPrice = adjustMode && enabled ? numeric(draft?.proposedUnitPrice ?? unitPrice) : unitPrice;
      const localAmount = quantity * proposedUnitPrice;
      const vndBreakdown = computeQuotationLineVnd(
        {
          quantity,
          unitPrice: proposedUnitPrice,
          currency: lineCurrency,
          endpointCurrency: paymentCurrency,
        },
        (code) => rateToVndOrNull(code),
      );

      return {
        line,
        quantity,
        unitPrice,
        proposedUnitPrice,
        unitDelta: proposedUnitPrice - unitPrice,
        note: draft?.note ?? '',
        enabled,
        lineCurrency,
        localAmount,
        vndBreakdown,
      };
    })
  ), [adjustMode, chargeLines, draftByLineId, paymentCurrency, rateToVndOrNull]);

  const groupedLines = useMemo(() => groupLines(displayLines), [displayLines]);
  const quotationVndTotals = useMemo(
    () => summarizeQuotationVndLines(displayLines.map((row) => row.vndBreakdown)),
    [displayLines],
  );
  const paymentRate = paymentCurrency === 'VND' ? 1 : rateToVndOrNull(paymentCurrency);
  const customerPaysTotal = paymentRate ? quotationVndTotals.totalVnd / paymentRate : null;
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
          <Text fw={700}>{t('quotations.chargeBreakdown')}</Text>
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
          <div className="rfq-breakdown-table-wrap">
            <div className="rfq-table-scroll">
              <Table
                highlightOnHover
                className={`rfq-charge-table rfq-charge-table--breakdown${adjustMode ? ' rfq-charge-table--adjustable' : ''}`}
              >
                <Table.Thead>
                  <Table.Tr>
                    {adjustMode ? <Table.Th className="rfq-adjust-check-column" /> : null}
                    <Table.Th>{t('quotations.chargeBreakdown')}</Table.Th>
                    <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
                    <Table.Th>{t('forms.unit')}</Table.Th>
                    <Table.Th ta="right">{adjustMode ? t('quotations.currentPrice') : t('quotations.unitPrice')}</Table.Th>
                    <Table.Th>{t('quotations.lineCurrency')}</Table.Th>
                    {adjustMode ? (
                      <>
                        <Table.Th ta="right">{t('quotations.yourProposedPrice')}</Table.Th>
                        <Table.Th ta="right">{t('quotations.priceDelta')}</Table.Th>
                        <Table.Th>{t('quotations.lineNote')}</Table.Th>
                      </>
                    ) : (
                      <Table.Th ta="right">{t('quotations.lineTotal')}</Table.Th>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {groupedLines.map((group) => {
                    if (group.lines.length === 0) return null;
                    const groupTotals = summarizeQuotationVndLines(group.lines.map((row) => row.vndBreakdown));
                    const columnCount = adjustMode ? 9 : 6;

                    return (
                      <Fragment key={group.value}>
                        <Table.Tr className="rfq-breakdown-group-row" data-charge-group={group.value}>
                          <Table.Td colSpan={columnCount}>
                            <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                              <Text className="rfq-breakdown-group-title" fw={800} size="sm">{t(group.labelKey)}</Text>
                              <Text size="xs" className="rfq-breakdown-group-subtotal tabular-nums">
                                {t('quotations.groupSubtotal')}: {formatMoney(groupTotals.totalVnd, 'VND')}
                              </Text>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                        {group.lines.map(({ line, quantity, unitPrice, proposedUnitPrice, vndBreakdown, unitDelta, note, enabled, lineCurrency }) => {
                          const deltaColor = unitDelta > 0 ? 'red' : unitDelta < 0 ? 'teal' : 'dimmed';
                          const lineHistory = buildLineHistory(line, quotation.adjustments ?? []);
                          const isHistoryExpanded = Boolean(historyExpandedByLineId[line.id]);
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
                                  {Number.isFinite(unitPrice) ? formatUnitPrice(unitPrice, lineCurrency) : '-'}
                                </Table.Td>
                                <Table.Td>
                                  <Tooltip label={`${t('quotations.sourceCurrency')}: ${lineCurrency}`}>
                                    <span className="rfq-line-currency-badge">{lineCurrency}</span>
                                  </Tooltip>
                                </Table.Td>
                                {adjustMode ? (
                                  <>
                                    <Table.Td ta="right">
                                      <NumberInput
                                        aria-label={`${t('quotations.yourProposedPrice')} ${line.description ?? ''} ${lineCurrency}`}
                                        className="rfq-adjust-price-input"
                                        decimalScale={6}
                                        disabled={!enabled}
                                        min={0}
                                        size="xs"
                                        suffix={` ${lineCurrency}`}
                                        thousandSeparator=","
                                        value={draftByLineId[line.id]?.proposedUnitPrice ?? proposedUnitPrice}
                                        onChange={(value) => setDraft(line.id, { proposedUnitPrice: value })}
                                      />
                                    </Table.Td>
                                    <Table.Td ta="right" className="tabular-nums">
                                      <Text c={deltaColor} fw={700} size="sm">
                                        {!enabled || unitDelta === 0 ? '-' : formatUnitPrice(unitDelta, lineCurrency)}
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
                                  <Table.Td ta="right" className="tabular-nums">
                                    {Number.isFinite(totalAmount) ? formatMoney(totalAmount, paymentCurrency) : '-'}
                                  </Table.Td>
                                )}
                              </Table.Tr>
                              {isHistoryExpanded ? (
                                <Table.Tr className="rfq-price-history-row">
                                  <Table.Td colSpan={columnCount}>
                                    <div className="rfq-price-history-ladder">
                                      {lineHistory.map((entry, index) => (
                                        <div className="rfq-price-history-step" key={entry.key}>
                                          <span className="rfq-price-history-dot" aria-hidden="true" />
                                          <div>
                                            <Text size="xs" fw={600}>
                                              {entry.labelKey === 'quotations.initialPrice'
                                                ? t(entry.labelKey)
                                                : t(entry.labelKey, { round: entry.roundNo })}
                                              {' · '}
                                              {entry.actor}
                                            </Text>
                                            <Text size="sm" fw={700} className="tabular-nums">
                                              {formatUnitPrice(entry.price, lineCurrency)}
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
                      </Fragment>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
          </div>
        )}

        <div className="rfq-breakdown-total">
          {adjustMode && submitAttempted && changedLines.length === 0 ? (
            <Alert color="yellow" py={6} mb="xs">
              {t('quotations.noAdjustedLines')}
            </Alert>
          ) : null}
          <div className="rfq-breakdown-total-stack">
            <Group justify="flex-end" gap="sm" wrap="nowrap" className="rfq-customer-pays-summary">
              <Text size="sm" c="dimmed">
                {t('quotations.customerPays')} ({paymentCurrency})
              </Text>
              <Text fw={800} className="tabular-nums">
                {customerPaysTotal != null ? formatMoney(customerPaysTotal, paymentCurrency) : '-'}
              </Text>
            </Group>
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
