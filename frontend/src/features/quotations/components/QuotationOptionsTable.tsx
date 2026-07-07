import { ActionIcon, Badge, Button, Group, Radio, Text, Tooltip } from '@mantine/core';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import type { QuotationOptionV1 } from '@shared/api/quotations';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

type QuotationOptionsTableProps = {
  options: QuotationOptionV1[];
  mode: 'edit' | 'read';
  selectedOptionId?: string | null;
  optionTotals?: Record<string, number>;
  optionTotalsCurrency?: string | null;
  onSelect?: (optionId: string) => void;
  onAdd?: () => void;
  onEdit?: (option: QuotationOptionV1) => void;
  onRemove?: (option: QuotationOptionV1) => void;
};

export function hasMinimumOptions(options: { id: string }[]): boolean {
  return options.length >= 2;
}

export function QuotationOptionsTable({
  mode,
  onAdd,
  onEdit,
  onRemove,
  onSelect,
  options,
  optionTotals,
  optionTotalsCurrency,
  selectedOptionId,
}: QuotationOptionsTableProps) {
  const { t } = useI18n();
  const selected = selectedOptionId ?? options.find((option) => option.is_selected)?.id ?? null;

  return (
    <div className="rfq-options-panel">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={700}>{t('quotations.options')}</Text>
          <Text size="xs" c="dimmed">{t('quotations.optionsHint')}</Text>
        </div>
        {mode === 'edit' && onAdd ? (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
            {t('quotations.addOption')}
          </Button>
        ) : null}
      </Group>
      {options.length === 0 ? (
        <div className="rfq-empty-lines">
          <Text c="dimmed" size="sm">{t('quotations.minimumOptionsWarning')}</Text>
        </div>
      ) : (
        <div className="rfq-option-row-list" data-mode={mode}>
          <div className="rfq-option-row-head" aria-hidden="true">
            {mode === 'read' ? <span /> : null}
            <span>{t('quotations.carrier')}</span>
            <span>{t('quotations.mode')}</span>
            <span>{t('quotations.vesselOrFlight')}</span>
            <span>{t('quotations.etd')} - {t('quotations.eta')}</span>
            <span>{t('quotations.transitDays')}</span>
            <span>{t('quotations.riskWarning')}</span>
            <span>{t('quotations.headlineAmount')}</span>
            {mode === 'edit' ? <span /> : null}
          </div>
          {options.map((option) => {
            const isSelected = selected === option.id;
            const headlineAmount = optionTotals?.[option.id] != null
              ? formatMoney(optionTotals[option.id], optionTotalsCurrency ?? 'VND')
              : formatMoney(Number(option.headline_amount ?? 0), 'VND');
            const rowBody = (
              <>
                {mode === 'read' ? (
                  <div className="rfq-option-cell rfq-option-cell-select">
                    <Radio
                      checked={isSelected}
                      aria-label={t('quotations.selectOption')}
                      onChange={() => onSelect?.(option.id)}
                    />
                  </div>
                ) : null}

                <div className="rfq-option-cell rfq-option-cell-carrier">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.carrier')}
                  </Text>
                  <Group gap={6} align="center">
                    <Text fw={700} size="sm" lineClamp={1}>
                      {option.carrier_name || option.carrier_code || '-'}
                    </Text>
                    {option.is_recommended ? (
                      <Badge size="xs" color="green" variant="light">{t('quotations.recommendedOption')}</Badge>
                    ) : null}
                  </Group>
                  {option.carrier_code ? <Text size="xs" c="dimmed">{option.carrier_code}</Text> : null}
                </div>

                <div className="rfq-option-cell rfq-option-cell-mode">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.mode')}
                  </Text>
                  <Group gap={6}>
                    <Badge size="xs" variant="light">#{option.option_no}</Badge>
                    <Text size="xs" c="dimmed">{option.mode ?? '-'}</Text>
                  </Group>
                </div>

                <div className="rfq-option-cell rfq-option-cell-route">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.vesselOrFlight')}
                  </Text>
                  <Text size="sm" fw={600} lineClamp={1}>
                    {option.vessel_or_flight ?? '-'}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {option.voyage_flight_no ?? t('quotations.voyageFlightNo')}
                  </Text>
                </div>

                <div className="rfq-option-cell rfq-option-cell-dates">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.etd')} - {t('quotations.eta')}
                  </Text>
                  <Text size="sm">
                    {formatDate(option.etd)} {'->'} {formatDate(option.eta)}
                  </Text>
                </div>

                <div className="rfq-option-cell rfq-option-cell-transit">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.transitDays')}
                  </Text>
                  <Text size="sm" className="tabular-nums">{option.transit_time_days ?? '-'}</Text>
                </div>

                <div className="rfq-option-cell rfq-option-cell-risk">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.riskWarning')}
                  </Text>
                  {option.risk_warning ? (
                    <Badge color="yellow" variant="light">{option.risk_warning}</Badge>
                  ) : (
                    <Text c="dimmed" size="xs">-</Text>
                  )}
                </div>

                <div className="rfq-option-cell rfq-option-cell-amount">
                  <Text size="xs" c="dimmed" className="rfq-option-mobile-label">
                    {t('quotations.headlineAmount')}
                  </Text>
                  <Text fw={700} size="sm" className="tabular-nums">
                    {headlineAmount}
                  </Text>
                </div>

                {mode === 'edit' ? (
                  <Group gap={4} justify="flex-end" wrap="nowrap" className="rfq-option-cell rfq-option-cell-actions">
                    {onEdit ? (
                      <Tooltip label={t('quotations.editOption')}>
                        <ActionIcon variant="subtle" aria-label={t('quotations.editOption')} onClick={() => onEdit(option)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null}
                    {onRemove ? (
                      <Tooltip label={t('quotations.removeOption')}>
                        <ActionIcon color="red" variant="subtle" aria-label={t('quotations.removeOption')} onClick={() => onRemove(option)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    ) : null}
                  </Group>
                ) : null}
              </>
            );

            return mode === 'read' ? (
              <label className="rfq-option-row" data-selected={isSelected ? 'true' : undefined} key={option.id}>
                {rowBody}
              </label>
            ) : (
              <article className="rfq-option-row" data-selected={isSelected ? 'true' : undefined} key={option.id}>
                {rowBody}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
