import { Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import type { QuotationOptionV1, QuotationV1 } from '@shared/api/quotations';
import { FieldPair } from '@shared/components/FieldPair';
import { useI18n, type MessageKey } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

import {
  type QuotationChargeGroupKey,
  type QuotationOptionCompareTotals,
} from '../model/quotationMoney';

type CompareDelta =
  | { kind: 'up' | 'down'; value: string }
  | { kind: 'equal' }
  | null;

function quotationChargeGroupLabelKey(group?: string | null): MessageKey {
  if (group === 'ORIGIN') return 'quotations.group.origin';
  if (group === 'DESTINATION') return 'quotations.group.destination';
  return 'quotations.group.freight';
}

function compareNumericDelta(
  own: number | null | undefined,
  other: number | null | undefined,
  formatAbs: (abs: number) => string,
): CompareDelta {
  if (own == null || other == null || !Number.isFinite(own) || !Number.isFinite(other)) return null;
  const diff = own - other;
  if (Math.abs(diff) < 1e-9) return { kind: 'equal' };
  return { kind: diff > 0 ? 'up' : 'down', value: formatAbs(Math.abs(diff)) };
}

function compareDateDayDelta(
  own: string | null | undefined,
  other: string | null | undefined,
  formatAbs: (abs: number) => string,
): CompareDelta {
  const ownTime = own ? Date.parse(own) : Number.NaN;
  const otherTime = other ? Date.parse(other) : Number.NaN;
  if (!Number.isFinite(ownTime) || !Number.isFinite(otherTime)) return null;
  const diffDays = Math.round((ownTime - otherTime) / 86_400_000);
  if (diffDays === 0) return { kind: 'equal' };
  return { kind: diffDays > 0 ? 'up' : 'down', value: formatAbs(Math.abs(diffDays)) };
}

function CompareDeltaPill({ delta }: { delta: CompareDelta }) {
  const { t } = useI18n();
  if (!delta) return null;
  if (delta.kind === 'equal') {
    return <span className="rfq-compare-delta" data-direction="equal">= {t('quotations.compareNoDifference')}</span>;
  }
  return (
    <span className="rfq-compare-delta" data-direction={delta.kind}>
      {delta.kind === 'up' ? 'â†‘' : 'â†“'}{' '}
      {delta.kind === 'up'
        ? t('quotations.compareHigherBy', { value: delta.value })
        : t('quotations.compareLowerBy', { value: delta.value })}
    </span>
  );
}

function CompareMetric({ label, value, delta }: { label: string; value: ReactNode; delta: CompareDelta }) {
  return (
    <div className="rfq-compare-metric">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
      <Text fw={700} size="sm" className="tabular-nums">{value}</Text>
      <CompareDeltaPill delta={delta} />
    </div>
  );
}

const COMPARE_GROUP_ORDER: QuotationChargeGroupKey[] = ['FREIGHT', 'ORIGIN', 'DESTINATION'];

function groupCompareLines(lines: NonNullable<QuotationV1['charge_lines']>) {
  const grouped = new Map<string, NonNullable<QuotationV1['charge_lines']>>();
  for (const group of QUOTATION_CHARGE_GROUPS) grouped.set(group.value, []);
  for (const line of lines) {
    const key = line.charge_group && grouped.has(line.charge_group) ? line.charge_group : 'FREIGHT';
    grouped.get(key)?.push(line);
  }
  return QUOTATION_CHARGE_GROUPS.map((group) => ({ ...group, lines: grouped.get(group.value) ?? [] })).filter(
    (group) => group.lines.length > 0,
  );
}

export function QuotationOptionComparePanel({
  option,
  otherOption,
  optionLines,
  paymentCurrency,
  totals,
  otherTotals,
}: {
  option: QuotationOptionV1;
  otherOption: QuotationOptionV1 | null;
  optionLines: NonNullable<QuotationV1['charge_lines']>;
  paymentCurrency: string;
  totals: QuotationOptionCompareTotals;
  otherTotals: QuotationOptionCompareTotals | null;
}) {
  const { t } = useI18n();
  const formatDays = (abs: number) => t('quotations.compareDays', { count: abs });
  const rateMissing = totals.missingRateCount > 0 || (otherTotals?.missingRateCount ?? 0) > 0;
  const moneyDelta = rateMissing ? null : compareNumericDelta(
    totals.customerPayTotal,
    otherTotals?.customerPayTotal ?? null,
    (abs) => formatMoney(abs, paymentCurrency),
  );
  const vndDelta = rateMissing ? null : compareNumericDelta(
    totals.totalVnd,
    otherTotals?.totalVnd ?? null,
    (abs) => formatMoney(abs, 'VND'),
  );

  return (
    <Paper withBorder p="lg" className="rfq-compare-card">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" gap="xs" className="rfq-compare-card-head">
          <div>
            <Group gap={6} align="center">
              <Badge size="sm" variant="light">#{option.option_no}</Badge>
              {option.is_recommended ? <Badge size="sm" color="green" variant="light">{t('quotations.recommendedOption')}</Badge> : null}
              {option.is_selected ? <Badge size="sm" color="blue" variant="light">{t('quotations.selectedOption')}</Badge> : null}
            </Group>
            <Text fw={800} size="lg" mt={4}>{option.carrier_name || option.carrier_code || '-'}</Text>
            {option.carrier_code ? <Text size="xs" c="dimmed">{option.carrier_code}</Text> : null}
          </div>
          <div className="rfq-compare-total">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{t('quotations.customerPays')} ({paymentCurrency})</Text>
            <Text fw={800} className="tabular-nums">{totals.customerPayTotal != null ? formatMoney(totals.customerPayTotal, paymentCurrency) : '-'}</Text>
            <CompareDeltaPill delta={moneyDelta} />
            {rateMissing ? <Text size="xs" c="yellow.7" fw={700}>{t('quotations.compareMissingRate')}</Text> : null}
          </div>
        </Group>

        <div className="rfq-compare-metrics">
          <CompareMetric label={t('quotations.totalVnd')} value={totals.totalVnd > 0 ? formatMoney(totals.totalVnd, 'VND') : '-'} delta={vndDelta} />
          <CompareMetric
            label={t('quotations.transitDays')}
            value={option.transit_time_days ?? '-'}
            delta={compareNumericDelta(
              option.transit_time_days != null ? Number(option.transit_time_days) : null,
              otherOption?.transit_time_days != null ? Number(otherOption.transit_time_days) : null,
              formatDays,
            )}
          />
          <CompareMetric label={t('quotations.compareEtdOffset')} value={formatDate(option.etd)} delta={compareDateDayDelta(option.etd, otherOption?.etd ?? null, formatDays)} />
          <CompareMetric label={t('quotations.compareEtaOffset')} value={formatDate(option.eta)} delta={compareDateDayDelta(option.eta, otherOption?.eta ?? null, formatDays)} />
          <CompareMetric label={t('quotations.compareLineCount')} value={totals.lineCount} delta={compareNumericDelta(totals.lineCount, otherTotals?.lineCount ?? null, (abs) => `${abs}`)} />
        </div>

        <div className="rfq-compare-groups">
          <Text fw={700} size="sm">{t('quotations.compareGroupTotals')}</Text>
          {COMPARE_GROUP_ORDER.map((group) => (
            <div className="rfq-compare-group-row" key={group}>
              <Text size="sm" c="dimmed">{t(quotationChargeGroupLabelKey(group))}</Text>
              <div className="rfq-compare-group-value">
                <Text fw={700} size="sm" className="tabular-nums">{totals.groupTotalsVnd[group] > 0 ? formatMoney(totals.groupTotalsVnd[group], 'VND') : '-'}</Text>
                {rateMissing ? null : <CompareDeltaPill delta={compareNumericDelta(totals.groupTotalsVnd[group], otherTotals?.groupTotalsVnd[group] ?? null, (abs) => formatMoney(abs, 'VND'))} />}
              </div>
            </div>
          ))}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <FieldPair label={t('quotations.mode')} value={option.mode ?? '-'} />
          <FieldPair label={t('quotations.vesselOrFlight')} value={option.vessel_or_flight ?? '-'} />
          <FieldPair label={t('quotations.riskWarning')} value={option.risk_warning ?? '-'} />
        </SimpleGrid>

        <div className="rfq-compare-lines">
          <Group justify="space-between" gap="xs" mb={6}><Text fw={700} size="sm">{t('quotations.compareChargeLines')}</Text><Badge size="xs" variant="light">{optionLines.length}</Badge></Group>
          {optionLines.length === 0 ? <Text c="dimmed" size="sm">{t('quotations.noChargeLines')}</Text> : groupCompareLines(optionLines).map((group) => (
            <div className="rfq-compare-line-group" key={group.value}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} className="rfq-compare-line-group-label">{t(group.labelKey)}</Text>
              {group.lines.map((line) => {
                const amount = Number(line.amount ?? Number(line.quantity ?? 0) * Number(line.unit_price ?? 0));
                return <div className="rfq-compare-line" key={line.id}><Text fw={700} size="xs" lineClamp={1}>{line.charge_code ?? line.description ?? '-'}</Text><Text fw={700} size="xs" className="tabular-nums">{Number.isFinite(amount) ? formatMoney(amount, line.currency_code) : '-'}</Text></div>;
              })}
            </div>
          ))}
        </div>
      </Stack>
    </Paper>
  );
}
