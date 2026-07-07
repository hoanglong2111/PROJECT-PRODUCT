import {
  ActionIcon,
  Badge,
  Button,
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
import { useState } from 'react';

import type { QuotationChargeGroup } from '@shared/api/quotations';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { formatMoney } from '@shared/utils/money';

import type { QuotationDraftChargeLineState } from '../model/quotationDraftLines';
import { computeOptionHeadlineVnd, type DraftBuildContext, type DraftQuotationOption } from '../model/quotationOptionDraft';
import { type FeeRow, QuotationFeeTable } from './QuotationFeeTable';

type QuotationOptionEditorProps = {
  option: DraftQuotationOption;
  carriers: { carrier_code: string; carrier_name: string }[];
  carrierOptions: { label: string; value: string }[];
  transportModeOptions: { label: string; value: string }[];
  chargeCodeOptions: { label: string; value: string }[];
  currencyOptions: { label: string; value: string }[];
  uoms: Uom[];
  buildCtx: DraftBuildContext;
  rateToVndOrNull: (code: string | null | undefined) => number | null;
  isTaxable: (chargeCode: string | null | undefined) => boolean;
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
  buildCtx,
  carrierOptions,
  carriers,
  chargeCodeOptions,
  currencyOptions,
  isTaxable,
  onAddLine,
  onRemoveLine,
  onRemoveOption,
  onUpdateLine,
  onUpdateOption,
  option,
  rateToVndOrNull,
  transportModeOptions,
  uoms,
}: QuotationOptionEditorProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Record<QuotationChargeGroup, boolean>>({
    FREIGHT: true,
    ORIGIN: false,
    DESTINATION: false,
  });
  const headline = computeOptionHeadlineVnd(option, buildCtx);
  const lineCount = QUOTATION_CHARGE_GROUPS.reduce((count, group) => count + option.groupLines[group.value].length, 0);

  return (
    <div className="rfq-option-editor" data-selected={lineCount > 0 ? 'true' : undefined}>
      <div className="rfq-option-editor-head">
        <Group justify="space-between" align="flex-start" gap="sm">
          <div>
            <Group gap="xs">
              <Text fw={800} size="sm">
                {t('quotations.options')} #{option.option_no}
              </Text>
              {option.is_recommended ? (
                <Badge size="xs" color="green" variant="light">
                  {t('quotations.recommendedOption')}
                </Badge>
              ) : null}
            </Group>
            <Text size="xs" c="dimmed" className="tabular-nums">
              {formatMoney(headline, 'VND')} · {t('quotations.chargeLinesCount', { count: lineCount })}
            </Text>
          </div>
          <Tooltip label={t('quotations.removeOption')}>
            <ActionIcon color="red" variant="subtle" aria-label={t('quotations.removeOption')} onClick={() => onRemoveOption(option.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>

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
          <TextInput
            type="date"
            label={t('quotations.etd')}
            value={option.etd ?? ''}
            onChange={(event) => onUpdateOption(option.id, { etd: event.currentTarget.value || null })}
          />
          <TextInput
            type="date"
            label={t('quotations.eta')}
            value={option.eta ?? ''}
            onChange={(event) => onUpdateOption(option.id, { eta: event.currentTarget.value || null })}
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
              <div className="rfq-charge-group rfq-option-charge-group" data-selected={lines.length > 0 ? 'true' : undefined} key={group.value}>
                <div className="rfq-charge-group-head">
                  <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={800} size="sm">
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
                        onClick={() => onAddLine(option.id, group.value)}
                      >
                        {t('quotations.addFee')}
                      </Button>
                      <Tooltip label={isExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges')}>
                        <ActionIcon
                          aria-expanded={isExpanded}
                          className="rfq-breakdown-toggle"
                          variant="light"
                          onClick={() => setExpanded((current) => ({ ...current, [group.value]: !isExpanded }))}
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
                        currencyOptions={currencyOptions}
                        uoms={uoms}
                        removable
                        rateToVndOrNull={rateToVndOrNull}
                        isTaxable={isTaxable}
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
    </div>
  );
}
