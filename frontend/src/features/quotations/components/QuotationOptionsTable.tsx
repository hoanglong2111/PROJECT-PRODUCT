import { ActionIcon, Badge, Button, Group, Radio, Table, Text, Tooltip } from '@mantine/core';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';

import type { QuotationOptionV1 } from '@shared/api/quotations';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

type QuotationOptionsTableProps = {
  options: QuotationOptionV1[];
  mode: 'edit' | 'read';
  selectedOptionId?: string | null;
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
  selectedOptionId,
}: QuotationOptionsTableProps) {
  const { t } = useI18n();
  const selected = selectedOptionId ?? options.find((option) => option.is_selected)?.id ?? null;

  return (
    <div className="rfq-table-scroll">
      <Group justify="space-between" mb="sm">
        <div>
          <Text fw={800}>{t('quotations.options')}</Text>
          <Text size="xs" c="dimmed">{t('quotations.optionsHint')}</Text>
        </div>
        {mode === 'edit' && onAdd ? (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
            {t('quotations.addOption')}
          </Button>
        ) : null}
      </Group>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('quotations.carrier')}</Table.Th>
            <Table.Th>{t('quotations.mode')}</Table.Th>
            <Table.Th>{t('quotations.vesselOrFlight')}</Table.Th>
            <Table.Th>{t('quotations.etd')}</Table.Th>
            <Table.Th>{t('quotations.eta')}</Table.Th>
            <Table.Th ta="right">{t('quotations.transitDays')}</Table.Th>
            <Table.Th>{t('quotations.riskWarning')}</Table.Th>
            <Table.Th ta="right">{t('quotations.headlineAmount')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {options.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={9}>
                <Text c="dimmed" size="sm">{t('quotations.minimumOptionsWarning')}</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            options.map((option) => {
              const isSelected = selected === option.id;
              return (
                <Table.Tr key={option.id} data-selected={isSelected || undefined}>
                  <Table.Td>
                    <Group gap={6}>
                      <Text fw={700} size="sm">{option.carrier_name || option.carrier_code || '-'}</Text>
                      {option.is_recommended ? (
                        <Badge size="xs" color="green" variant="light">{t('quotations.recommendedOption')}</Badge>
                      ) : null}
                    </Group>
                    {option.carrier_code ? <Text size="xs" c="dimmed">{option.carrier_code}</Text> : null}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{option.mode ?? '-'}</Text>
                    <Text size="xs" c="dimmed">#{option.option_no}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{option.vessel_or_flight ?? '-'}</Text>
                    <Text size="xs" c="dimmed">{option.voyage_flight_no ?? '-'}</Text>
                  </Table.Td>
                  <Table.Td>{formatDate(option.etd)}</Table.Td>
                  <Table.Td>{formatDate(option.eta)}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{option.transit_time_days ?? '-'}</Table.Td>
                  <Table.Td>
                    {option.risk_warning ? (
                      <Badge color="yellow" variant="light">{option.risk_warning}</Badge>
                    ) : (
                      <Text c="dimmed" size="sm">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right" className="tabular-nums">
                    {formatMoney(Number(option.headline_amount ?? 0), 'VND')}
                  </Table.Td>
                  <Table.Td ta="right">
                    {mode === 'read' ? (
                      <Radio
                        checked={isSelected}
                        aria-label={t('quotations.selectOption')}
                        onChange={() => onSelect?.(option.id)}
                      />
                    ) : (
                      <Group gap={4} justify="flex-end" wrap="nowrap">
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
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
