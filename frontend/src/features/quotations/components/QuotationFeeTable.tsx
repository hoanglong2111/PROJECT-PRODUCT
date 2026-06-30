import { ActionIcon, Checkbox, NumberInput, Select, Table, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';

export type ChargeLineState = {
  chargeCode: string | null;
  quantity: number | string;
  unit: string | null;
  unitPrice: number | string;
};

export type FeeRow = {
  key: string;
  label: ReactNode;
  state: ChargeLineState;
  enabled: boolean;
};

type Props = {
  rows: FeeRow[];
  uoms: Uom[];
  chargeCodeOptions: { label: string; value: string }[];
  currency: string | null;
  editableFee?: boolean;
  removable?: boolean;
  onToggle?: (key: string, enabled: boolean) => void;
  onChange: (key: string, patch: Partial<ChargeLineState>) => void;
  onRemove?: (key: string) => void;
};

export function QuotationFeeTable({
  chargeCodeOptions,
  currency,
  editableFee = false,
  onChange,
  onRemove,
  onToggle,
  removable = false,
  rows,
  uoms,
}: Props) {
  const { t } = useI18n();
  const uomOptions = uoms.map((u) => ({
    label: `${u.uom_code} - ${u.uom_name_en}`,
    value: u.uom_code,
  }));
  const showToggle = Boolean(onToggle) && !editableFee;

  return (
    <Table.ScrollContainer minWidth={editableFee ? 780 : 860}>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            {showToggle ? <Table.Th w={44} aria-label={t('quotations.includeFee')} /> : null}
            <Table.Th miw={editableFee ? 220 : 260}>{t('quotations.feeColumn')}</Table.Th>
            <Table.Th w={96} ta="right">
              {t('quotations.quantity')}
            </Table.Th>
            <Table.Th w={142}>{t('quotations.uom')}</Table.Th>
            <Table.Th w={156} ta="right">
              {t('quotations.unitPrice')}
            </Table.Th>
            <Table.Th w={140} ta="right">
              {t('quotations.lineTotal')}
            </Table.Th>
            {removable ? <Table.Th w={44} /> : null}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const total = Number(row.state.quantity) * Number(row.state.unitPrice);
            const showTotal = row.enabled && Number.isFinite(total) && Number(row.state.unitPrice) > 0;
            const formattedTotal = showTotal
              ? `${new Intl.NumberFormat('en-US').format(Math.round(total))}${currency ? ` ${currency}` : ''}`
              : '—';

            return (
              <Table.Tr key={row.key} style={showToggle ? { opacity: row.enabled ? 1 : 0.55 } : undefined}>
                {showToggle ? (
                  <Table.Td>
                    <Checkbox
                      aria-label={`${t('quotations.includeFee')}: ${textLabel(row.label)}`}
                      checked={row.enabled}
                      onChange={(event) => onToggle?.(row.key, event.currentTarget.checked)}
                    />
                  </Table.Td>
                ) : null}
                <Table.Td>
                  {editableFee ? (
                    <Select
                      aria-label={t('quotations.feeColumn')}
                      placeholder={t('quotations.selectChargeToAdd')}
                      data={chargeCodeOptions}
                      value={row.state.chargeCode}
                      onChange={(value) => onChange(row.key, { chargeCode: value })}
                      searchable
                      size="xs"
                    />
                  ) : (
                    <Text size="sm" fw={500}>
                      {row.label}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td className="tabular-nums">
                  <NumberInput
                    aria-label={t('quotations.quantity')}
                    value={row.state.quantity}
                    onChange={(value) => onChange(row.key, { quantity: value })}
                    min={0}
                    disabled={!row.enabled}
                    size="xs"
                    styles={{ input: { textAlign: 'right' } }}
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    aria-label={t('quotations.uom')}
                    data={uomOptions}
                    value={row.state.unit}
                    onChange={(value) => onChange(row.key, { unit: value })}
                    searchable
                    disabled={!row.enabled}
                    size="xs"
                  />
                </Table.Td>
                <Table.Td className="tabular-nums">
                  <NumberInput
                    aria-label={t('quotations.unitPrice')}
                    value={row.state.unitPrice}
                    onChange={(value) => onChange(row.key, { unitPrice: value })}
                    min={0}
                    thousandSeparator=","
                    disabled={!row.enabled}
                    size="xs"
                    styles={{ input: { textAlign: 'right' } }}
                  />
                </Table.Td>
                <Table.Td ta="right" className="tabular-nums">
                  <Text size="sm" fw={500} c={showTotal ? undefined : 'dimmed'}>
                    {formattedTotal}
                  </Text>
                </Table.Td>
                {removable ? (
                  <Table.Td>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => onRemove?.(row.key)}
                      title={t('quotations.removeFee')}
                      aria-label={t('quotations.removeFee')}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                ) : null}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Seed the initial state when a charge code is selected. */
export function seedLineState(chargeCode: ChargeCode | null | undefined): ChargeLineState {
  return {
    chargeCode: chargeCode?.charge_code ?? null,
    quantity: 1,
    unit: chargeCode?.default_uom ?? null,
    unitPrice: '',
  };
}

function textLabel(label: ReactNode) {
  return typeof label === 'string' || typeof label === 'number' ? String(label) : '';
}
