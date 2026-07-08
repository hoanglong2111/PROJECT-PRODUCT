import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconChevronDown, IconPlus, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';

import type { QuotationChargeGroup } from '@shared/api/quotations';
import type { Currency } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import { DateField } from '@shared/components/DateField';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { formatMoney } from '@shared/utils/money';

import type { QuotationDraftChargeLineState } from '../model/quotationDraftLines';
import type { DraftQuotationOption } from '../model/quotationOptionDraft';
import type { QuotationMoneyTotals } from '../model/quotationMoney';
import { type FeeRow, QuotationFeeTable } from './QuotationFeeTable';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function calculateTransitDays(etd: string | null | undefined, eta: string | null | undefined): number | null {
  if (!etd || !eta) return null;

  const etdDay = dayjs(etd);
  const etaDay = dayjs(eta);
  if (!etdDay.isValid() || !etaDay.isValid()) return null;

  const diffDays = Math.round(
    (Date.UTC(etaDay.year(), etaDay.month(), etaDay.date()) - Date.UTC(etdDay.year(), etdDay.month(), etdDay.date())) / MS_PER_DAY,
  );

  return diffDays >= 0 ? diffDays : null;
}

type QuotationOptionEditorProps = {
  option: DraftQuotationOption;
  carriers: { carrier_code: string; carrier_name: string }[];
  carrierOptions: { label: string; value: string }[];
  transportModeOptions: { label: string; value: string }[];
  chargeCodeOptions: { label: string; value: string }[];
  currencies: Currency[];
  uoms: Uom[];
  moneyTotals: QuotationMoneyTotals | null;
  paymentCurrency: string;
  rateToVndOrNull: (code: string | null | undefined) => number | null;
  collapsed: boolean;
  onToggleCollapsed: (id: string) => void;
  onSetRecommended: (id: string) => void;
  onUpdateOption: (id: string, patch: Partial<DraftQuotationOption>) => void;
  onAddLine: (optionId: string, group: QuotationChargeGroup) => void;
  onUpdateLine: (
    optionId: string,
    group: QuotationChargeGroup,
    rowIndex: number,
    patch: Partial<QuotationDraftChargeLineState>,
  ) => void;
  onRemoveLine: (optionId: string, group: QuotationChargeGroup, rowIndex: number) => void;
  onRemoveOption: (optionId: string) => void;
};

export function QuotationOptionEditor({
  carrierOptions,
  carriers,
  chargeCodeOptions,
  currencies,
  moneyTotals,
  onAddLine,
  onRemoveLine,
  onRemoveOption,
  onSetRecommended,
  onToggleCollapsed,
  onUpdateLine,
  onUpdateOption,
  option,
  paymentCurrency,
  rateToVndOrNull,
  collapsed,
  transportModeOptions,
  uoms,
}: QuotationOptionEditorProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<QuotationChargeGroup, boolean>>({
    FREIGHT: true,
    ORIGIN: false,
    DESTINATION: false,
  });
  const chargeGroupRefs = useRef<Partial<Record<QuotationChargeGroup, HTMLDivElement | null>>>({});
  const lineCount = QUOTATION_CHARGE_GROUPS.reduce((count, group) => count + option.groupLines[group.value].length, 0);
  const customerPayTotal = moneyTotals?.customerPayTotal ?? null;
  const totalVnd = moneyTotals?.totalVnd ?? 0;

  function scrollChargeGroupIntoView(group: QuotationChargeGroup) {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const target = chargeGroupRefs.current[group];
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportPadding = 24;
        const isOutOfView = rect.top < viewportPadding || rect.bottom > viewportHeight - viewportPadding;
        if (isOutOfView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }, 180);
  }

  function addLineAndExpand(group: QuotationChargeGroup) {
    setExpanded((current) => ({ ...current, [group]: true }));
    onAddLine(option.id, group);
    scrollChargeGroupIntoView(group);
  }

  function toggleChargeGroup(group: QuotationChargeGroup, isExpanded: boolean) {
    setExpanded((current) => ({ ...current, [group]: !isExpanded }));
    if (!isExpanded) {
      scrollChargeGroupIntoView(group);
    }
  }

  return (
    <div className="rfq-option-editor" data-selected={lineCount > 0 ? 'true' : undefined}>
      <div className="rfq-option-editor-head">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Group gap="xs" align="center">
              <Text fw={700} size="sm">
                {t('quotations.options')} #{option.option_no}
              </Text>
              <Checkbox
                aria-label={`${t('quotations.recommendedOption')} #${option.option_no}`}
                checked={option.is_recommended}
                className="rfq-option-recommended-check"
                label={t('quotations.recommendedOption')}
                onChange={(event) => {
                  if (event.currentTarget.checked || !option.is_recommended) {
                    onSetRecommended(option.id);
                  }
                }}
                size="xs"
              />
            </Group>
            <Group gap="xs" mt={4} wrap="wrap" className="rfq-option-total-strip">
              <Badge size="xs" variant="light" color={lineCount > 0 ? 'teal' : 'gray'} className="tabular-nums">
                {t('quotations.chargeLinesCount', { count: lineCount })}
              </Badge>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {t('quotations.totalVnd')}: {totalVnd > 0 ? formatMoney(totalVnd, 'VND') : '-'}
              </Text>
              <Text size="xs" fw={700} className="tabular-nums">
                {t('quotations.customerPays')} ({paymentCurrency}): {customerPayTotal != null ? formatMoney(customerPayTotal, paymentCurrency) : '-'}
              </Text>
            </Group>
          </div>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label={collapsed ? t('quotations.expandOption') : t('quotations.collapseOption')}>
              <ActionIcon
                aria-expanded={!collapsed}
                aria-label={collapsed ? t('quotations.expandOption') : t('quotations.collapseOption')}
                className="rfq-breakdown-toggle"
                variant="light"
                onClick={() => onToggleCollapsed(option.id)}
              >
                <IconChevronDown className={!collapsed ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'} size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('quotations.removeOption')}>
              <ActionIcon color="red" variant="subtle" aria-label={t('quotations.removeOption')} onClick={() => onRemoveOption(option.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </div>

      <Collapse expanded={!collapsed}>
        <div className="rfq-charge-grid">
          <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
            <Select
              label={t('quotations.carrier')}
              data={carrierOptions}
              value={option.carrier_code}
              onChange={(value) => {
                const carrier = carriers.find((item) => item.carrier_code === value);
                onUpdateOption(option.id, {
                  carrier_code: value,
                  carrier_name: carrier?.carrier_name ?? null,
                });
              }}
              searchable
            />
            <Select
              label={t('quotations.mode')}
              data={transportModeOptions}
              value={option.mode}
              onChange={(value) => onUpdateOption(option.id, { mode: value })}
              searchable
            />
            <TextInput
              label={t('quotations.vesselOrFlight')}
              value={option.vessel_or_flight ?? ''}
              onChange={(event) => onUpdateOption(option.id, { vessel_or_flight: event.currentTarget.value || null })}
            />
            <TextInput
              label={t('quotations.voyageFlightNo')}
              value={option.voyage_flight_no ?? ''}
              onChange={(event) => onUpdateOption(option.id, { voyage_flight_no: event.currentTarget.value || null })}
            />
            <DateField
              label={t('quotations.etd')}
              value={option.etd}
              onChange={(value) => onUpdateOption(option.id, {
                etd: value,
                transit_time_days: calculateTransitDays(value, option.eta),
              })}
            />
            <DateField
              label={t('quotations.eta')}
              value={option.eta}
              onChange={(value) => onUpdateOption(option.id, {
                eta: value,
                transit_time_days: calculateTransitDays(option.etd, value),
              })}
            />
            <NumberInput
              label={t('quotations.transitDays')}
              value={option.transit_time_days ?? ''}
              min={0}
              onChange={(value) => onUpdateOption(option.id, { transit_time_days: value === '' || value == null ? null : Number(value) })}
            />
            <TextInput
              label={t('quotations.riskWarning')}
              value={option.risk_warning ?? ''}
              onChange={(event) => onUpdateOption(option.id, { risk_warning: event.currentTarget.value || null })}
            />
          </SimpleGrid>

          <Stack gap="sm" mt="md">
            {QUOTATION_CHARGE_GROUPS.map((group) => {
              const lines = option.groupLines[group.value];
              const isExpanded = expanded[group.value];
              const rows: FeeRow[] = lines.map((line, index) => ({
                key: `${line.uid}-${index}`,
                rowIndex: index,
                label: null,
                state: line,
                enabled: true,
              }));

              return (
                <div
                  className="rfq-charge-group rfq-option-charge-group"
                  data-selected={lines.length > 0 ? 'true' : undefined}
                  key={group.value}
                  ref={(node) => {
                    chargeGroupRefs.current[group.value] = node;
                  }}
                >
                  <div className="rfq-charge-group-head">
                    <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <Text fw={700} size="sm">
                          {t(group.labelKey)}
                        </Text>
                        <Badge className="rfq-charge-count tabular-nums" color={lines.length > 0 ? 'teal' : 'gray'} variant="light">
                          {lines.length}
                        </Badge>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          className="rfq-add-fee-button"
                          onClick={() => addLineAndExpand(group.value)}
                        >
                          {t('quotations.addFee')}
                        </Button>
                        <Tooltip label={isExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges')}>
                          <ActionIcon
                            aria-expanded={isExpanded}
                            className="rfq-breakdown-toggle"
                            variant="light"
                            onClick={() => toggleChargeGroup(group.value, isExpanded)}
                          >
                            <IconChevronDown className={isExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'} size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </div>
                  <Collapse expanded={isExpanded}>
                    <div className="rfq-charge-grid">
                      {rows.length > 0 ? (
                        <QuotationFeeTable
                          rows={rows}
                          chargeCodeOptions={chargeCodeOptions}
                          currencies={currencies}
                          uoms={uoms}
                          removable
                          paymentCurrency={paymentCurrency}
                          rateToVndOrNull={rateToVndOrNull}
                          onChange={(rowIndex, patch) => onUpdateLine(option.id, group.value, rowIndex, patch)}
                          onRemove={(rowIndex) => onRemoveLine(option.id, group.value, rowIndex)}
                        />
                      ) : (
                        <div className="rfq-empty-lines">
                          <Text size="sm" c="dimmed">
                            {t('quotations.noOtherFees')}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </Stack>
        </div>
      </Collapse>
    </div>
  );
}
