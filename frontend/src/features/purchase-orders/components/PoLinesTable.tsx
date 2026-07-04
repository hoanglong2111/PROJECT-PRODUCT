import { Badge, Collapse, Group, NumberFormatter, Paper, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';

import type { PurchaseOrderLineV1 } from '@shared/api/purchaseOrders';
import { useI18n } from '@shared/i18n';
import { formatMoney as formatMoneyValue } from '@shared/utils/money';

import { dateOnly, formatWeightKg, getPoLineLotState, getPoLineReceiptState, toNumber } from '../model/purchaseOrderModel';

type LotState = ReturnType<typeof getPoLineLotState>;
type LineFilter = 'all' | 'full' | 'partial' | 'needs-lot';

const LOT_CONFIG: Record<LotState, { labelKey: string; color: string }> = {
  full: { labelKey: 'purchaseOrders.poLinesLotStateFull', color: 'teal' },
  partial: { labelKey: 'purchaseOrders.poLinesLotStatePartial', color: 'orange' },
  'needs-lot': { labelKey: 'purchaseOrders.poLinesLotStateNeedsLot', color: 'red' },
  none: { labelKey: 'purchaseOrders.poLinesLotStateNone', color: 'gray' },
};

const RECEIPT_CONFIG: Record<ReturnType<typeof getPoLineReceiptState>['state'], { color: string }> = {
  full: { color: 'teal' },
  short: { color: 'orange' },
  pending: { color: 'gray' },
  none: { color: 'gray' },
};

export function PoLinesTable({ currencyCode, lines }: { currencyCode: string; lines: PurchaseOrderLineV1[] }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LineFilter>('all');

  const lotMetrics = useMemo(
    () =>
      lines.reduce(
        (metrics, line) => {
          const state = getPoLineLotState(line);
          if (state === 'full') metrics.full += 1;
          if (state === 'partial') metrics.partial += 1;
          if (state === 'needs-lot') metrics.needsLot += 1;
          return metrics;
        },
        { full: 0, partial: 0, needsLot: 0 },
      ),
    [lines],
  );

  const fullyReceived = useMemo(
    () => lines.filter((line) => getPoLineReceiptState(line).state === 'full').length,
    [lines],
  );

  const visibleLines = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return lines.filter((line) => {
      if (filter !== 'all' && getPoLineLotState(line) !== filter) return false;
      if (!needle) return true;
      const haystack = [
        line.item?.item_code ?? line.item_id,
        line.item?.item_name ?? line.item_description ?? '',
        line.item_customs_profile?.hs_code ?? '',
        `#${line.line_no}`,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, lines, query]);

  return (
    <Paper withBorder p={0} className="purchase-order-po-lines-panel">
      <Stack gap="sm" p="sm" className="purchase-order-po-lines-header">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2}>
            <Text fw={700}>{t('purchaseOrders.poLinesTitle')}</Text>
            <Text size="sm" c="dimmed">
              {t('purchaseOrders.poLinesDescription')}
            </Text>
          </Stack>
          <Group gap={6} wrap="nowrap" className="purchase-order-po-lines-badges">
            <FilterBadge label={t('purchaseOrders.poLinesCount', { count: lines.length })} active={filter === 'all'} onClick={() => setFilter('all')} />
            {lines.some((line) => toNumber(line.qty_shipped) > 0) ? (
              <Badge color="teal" variant="light" className="purchase-order-nowrap-badge">
                {t('purchaseOrders.poLinesReceivedCount', { received: fullyReceived, total: lines.length })}
              </Badge>
            ) : null}
            {lotMetrics.full > 0 ? (
              <FilterBadge color="teal" label={t('purchaseOrders.poLinesFilterLotted', { count: lotMetrics.full })} active={filter === 'full'} onClick={() => setFilter(filter === 'full' ? 'all' : 'full')} />
            ) : null}
            {lotMetrics.partial > 0 ? (
              <FilterBadge color="orange" label={t('purchaseOrders.poLinesFilterPartial', { count: lotMetrics.partial })} active={filter === 'partial'} onClick={() => setFilter(filter === 'partial' ? 'all' : 'partial')} />
            ) : null}
            {lotMetrics.needsLot > 0 ? (
              <FilterBadge color="red" label={t('purchaseOrders.poLinesFilterNeedsLot', { count: lotMetrics.needsLot })} active={filter === 'needs-lot'} onClick={() => setFilter(filter === 'needs-lot' ? 'all' : 'needs-lot')} />
            ) : null}
          </Group>
        </Group>
        {lines.length > 0 ? (
          <TextInput
            size="xs"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t('purchaseOrders.poLinesSearchPlaceholder')}
            leftSection={<IconSearch size={14} />}
            className="po-line-card-search"
          />
        ) : null}
      </Stack>

      {lines.length === 0 ? (
        <Text p="sm" size="sm" c="dimmed">
          {t('purchaseOrders.poLinesEmpty')}
        </Text>
      ) : visibleLines.length === 0 ? (
        <Text p="sm" size="sm" c="dimmed">
          {t('purchaseOrders.poLinesNoMatch')}
        </Text>
      ) : (
        <div className="po-lines-table-wrap">
          {/* table-layout: fixed keeps every column inside the panel width, so the
              grid never scrolls horizontally; the Item column flexes and truncates. */}
          <table className="po-lines-table">
            <thead>
              <tr>
                <th className="col-toggle" aria-hidden="true" />
                <th className="col-no">#</th>
                <th className="col-item">{t('purchaseOrders.poLinesHeaderItem')}</th>
                <th className="col-qty num col-ordered">{t('purchaseOrders.poLinesHeaderOrdered')}</th>
                <th className="col-qty num col-confirmed">{t('purchaseOrders.poLinesHeaderConfirmed')}</th>
                <th className="col-qty num col-lotted">{t('purchaseOrders.poLinesHeaderLotted')}</th>
                <th className="col-qty num col-shipped">
                  <Tooltip label={t('purchaseOrders.poLinesShippedTooltip')} withArrow><span>{t('purchaseOrders.poLinesHeaderShipped')}</span></Tooltip>
                </th>
                <th className="col-qty num col-received">
                  <Tooltip label={t('purchaseOrders.poLinesReceivedTooltip')} withArrow><span>{t('purchaseOrders.poLinesHeaderReceived')}</span></Tooltip>
                </th>
                <th className="col-status">{t('purchaseOrders.poLinesHeaderStatus')}</th>
                <th className="col-amount num">
                  {currencyCode
                    ? t('purchaseOrders.poLinesHeaderAmountCurrency', { currency: currencyCode })
                    : t('purchaseOrders.poLinesHeaderAmount')}
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((line) => (
                <PoLineRow key={line.id} line={line} currencyCode={currencyCode} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paper>
  );
}

function PoLineRow({ line, currencyCode }: { line: PurchaseOrderLineV1; currencyCode: string }) {
  const { t } = useI18n();
  const [open, { toggle }] = useDisclosure(false);

  const lotState = getPoLineLotState(line);
  const lot = LOT_CONFIG[lotState];
  const itemCode = line.item?.item_code ?? line.item_id;
  const itemName = line.item?.item_name ?? line.item_description ?? '-';

  const ordered = toNumber(line.qty_ordered);
  const confirmed = toNumber(line.qty_confirmed);
  const lotted = toNumber(line.qty_lotted);
  const shipped = toNumber(line.qty_shipped);
  const received = toNumber(line.qty_received);
  const receipt = getPoLineReceiptState(line);
  const unit = line.unit ?? '';
  const lineAmount = ordered * toNumber(line.unit_price);

  // The fulfillment pipeline reads left to right; each downstream stage is
  // measured against the one before it so any shortfall (e.g. shipped < lotted)
  // surfaces consistently. On wide screens every stage is its own column; on
  // narrow screens the trailing columns hide and this list carries the full set.
  const stages: { key: string; labelKey: string; value: number }[] = [
    { key: 'ordered', labelKey: 'purchaseOrders.poLinesHeaderOrdered', value: ordered },
    { key: 'confirmed', labelKey: 'purchaseOrders.poLinesHeaderConfirmed', value: confirmed },
    { key: 'lotted', labelKey: 'purchaseOrders.poLinesHeaderLotted', value: lotted },
    { key: 'shipped', labelKey: 'purchaseOrders.poLinesHeaderShipped', value: shipped },
    { key: 'received', labelKey: 'purchaseOrders.poLinesHeaderReceived', value: received },
  ];

  return (
    <>
      <tr className={`po-line-row is-${lotState}${open ? ' is-open' : ''}`} onClick={toggle}>
        <td className="col-toggle">
          <button
            type="button"
            className={`po-line-row-toggle${open ? ' is-open' : ''}`}
            aria-expanded={open}
            aria-label={open ? t('purchaseOrders.poLinesCollapseDetail') : t('purchaseOrders.poLinesExpandDetail')}
          >
            <IconChevronDown size={16} />
          </button>
        </td>
        <td className="col-no">#{line.line_no}</td>
        <td className="col-item">
          <span className="po-line-item-code" title={itemCode}>
            {itemCode}
          </span>
          <span className="po-line-item-name" title={itemName === '-' ? undefined : itemName}>
            {itemName}
          </span>
        </td>
        <QtyCell value={ordered} unit={unit} className="col-qty col-ordered" />
        <QtyCell value={confirmed} className="col-qty col-confirmed" emphasis="primary" />
        <QtyCell value={lotted} className="col-qty col-lotted" emphasis="lot" tone={lotState} />
        <QtyCell value={shipped} className="col-qty col-shipped" />
        <td className="po-qty-cell num col-qty col-received">
          <span className="po-qty-value tabular-nums" title={`${received.toLocaleString()}${unit ? ` ${unit}` : ''}`}>
            {compactNumber(received)}
          </span>
          {shipped > 0 ? (
            <Badge size="xs" mt={2} color={RECEIPT_CONFIG[receipt.state].color} variant={receipt.state === 'full' ? 'light' : 'outline'}>
              {receipt.state === 'full'
                ? t('purchaseOrders.poLinesReceiptFull')
                : receipt.state === 'pending'
                  ? t('purchaseOrders.poLinesReceiptPending')
                  : t('purchaseOrders.poLinesReceiptShortfall', { count: receipt.shortfall.toLocaleString() })}
            </Badge>
          ) : null}
        </td>
        <td className="col-status">
          <Badge size="sm" color={lot.color} variant={lotState === 'none' ? 'outline' : 'light'} className="purchase-order-nowrap-badge">
            {t(lot.labelKey)}
          </Badge>
        </td>
        <td className="col-amount num">
          <span
            className="po-line-amount tabular-nums"
            title={t('purchaseOrders.poLinesAmountTitle', {
              amount: lineAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              currency: currencyCode ? ` ${currencyCode}` : '',
            })}
          >
            {compactMoney(lineAmount)}
          </span>
        </td>
      </tr>
      <tr className={`po-line-detail-row is-${lotState}${open ? ' is-open' : ''}`}>
        <td colSpan={10} className="po-line-detail-cell">
          <Collapse expanded={open}>
            <div className="po-line-detail">
              {/* Full pipeline — visible on narrow screens where the per-stage
                  columns are hidden, so no quantity is ever lost. */}
              <div className="po-line-detail-pipeline">
                {stages.map((stage, index) => {
                  const delta = index > 0 ? stage.value - stages[index - 1].value : 0;
                  const shortfall = delta < 0 ? Math.abs(delta) : 0;
                  return (
                    <div className="po-line-detail-stage" key={stage.key}>
                      <span className="po-line-meta-label">{t(stage.labelKey)}</span>
                      <span className="po-line-meta-value tabular-nums">
                        <NumberFormatter value={stage.value} thousandSeparator />
                        {unit ? ` ${unit}` : ''}
                      </span>
                      {shortfall > 0 ? (
                        <span className="po-qty-delta tabular-nums">
                          {t('purchaseOrders.poLinesShortfallLeft', { count: shortfall.toLocaleString() })}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="po-line-card-meta">
                <MetaCell label={t('purchaseOrders.poLinesMetaHsCode')} value={line.item_customs_profile?.hs_code ?? '-'} />
                <MetaCell label={t('purchaseOrders.poLinesMetaCoForm')} value={line.item_customs_profile?.co_form ?? '-'} />
                <MetaCell label={t('purchaseOrders.poLinesMetaEta')} value={dateOnly(line.expected_eta_line) || '-'} />
                <MetaCell label={t('purchaseOrders.poLinesMetaUnitPrice')} value={formatMoney(line.unit_price, currencyCode)} />
                <MetaCell label={t('purchaseOrders.poLinesMetaTax')} value={`${toNumber(line.tax_rate)}%`} />
                <MetaCell label={t('purchaseOrders.poLinesMetaDiscount')} value={`${toNumber(line.discount_pct)}%`} />
                <MetaCell label={t('purchaseOrders.poLinesMetaUnit')} value={unit || '-'} />
                <MetaCell label={t('purchaseOrders.poLinesMetaWeight')} value={formatWeightKg(toNumber(line.gross_weight_kg)) || '-'} />
                <MetaCell label={t('purchaseOrders.poLinesMetaNote')} value={line.notes?.trim() || '-'} wide />
              </div>
            </div>
          </Collapse>
        </td>
      </tr>
    </>
  );
}

function FilterBadge({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton onClick={onClick} className="po-line-filter-badge">
      <Badge color={color} variant={active ? 'filled' : 'light'} className="purchase-order-nowrap-badge">
        {label}
      </Badge>
    </UnstyledButton>
  );
}

function QtyCell({
  value,
  unit,
  emphasis,
  tone,
  className,
}: {
  value: number;
  unit?: string;
  emphasis?: 'primary' | 'lot';
  tone?: LotState;
  className?: string;
}) {
  const cls = [
    'po-qty-cell',
    'num',
    className ?? '',
    emphasis === 'primary' ? 'is-emphasis' : '',
    emphasis === 'lot' ? 'is-lot' : '',
    emphasis === 'lot' && tone && tone !== 'none' ? `tone-${tone}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <td className={cls}>
      <span className="po-qty-value tabular-nums" title={`${value.toLocaleString()}${unit ? ` ${unit}` : ''}`}>
        {compactNumber(value)}
        {unit ? <span className="po-qty-unit"> {unit}</span> : null}
      </span>
    </td>
  );
}

function MetaCell({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`po-line-meta-cell${wide ? ' is-wide' : ''}`}>
      <span className="po-line-meta-label">{label}</span>
      <span className="po-line-meta-value">{value}</span>
    </div>
  );
}

function formatMoney(value: number | string | null | undefined, currencyCode: string) {
  return formatMoneyValue(value, currencyCode);
}

// Keep the dense columns narrow: numbers under 10k stay fully readable with
// thousand separators; larger numbers compact to 12.5K / 1.2M (full value on hover).
function compactNumber(value: number) {
  if (Math.abs(value) < 10_000) return value.toLocaleString();
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function compactMoney(value: number) {
  if (Math.abs(value) < 10_000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
