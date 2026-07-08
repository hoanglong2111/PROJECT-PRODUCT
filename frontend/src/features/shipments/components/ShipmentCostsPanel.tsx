import {
  ActionIcon,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPencil, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import type { ShipmentCost, ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentCostPayload } from '@shared/api/shipments';
import type { Gd1CostType } from '@shared/model/logistics';
import { CopyValue } from '@shared/components/CopyValue';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { convertToBase, currencyDecimalScale, formatMoney } from '@shared/utils/money';

import { landedCostTotal } from '../model/shipmentModel';
import { ShipmentMarginSummary } from './ShipmentMarginSummary';

const BASE_CURRENCY = 'VND';

const COST_TYPES: Gd1CostType[] = [
  'FREIGHT',
  'INSURANCE',
  'CUSTOMS_DUTY',
  'VAT',
  'LOCAL_CHARGES',
  'DEMURRAGE',
  'OTHER',
];

const COST_TYPE_HINT: Partial<Record<Gd1CostType, string>> = {
  FREIGHT: 'glossary.freight',
  INSURANCE: 'glossary.insurance',
  CUSTOMS_DUTY: 'glossary.importDuty',
  LOCAL_CHARGES: 'glossary.localCharges',
};

export function ShipmentCostsPanel({
  isSaving,
  onCreateCost,
  onDeleteCost,
  onUpdateCost,
  shipment,
  t,
}: {
  isSaving: boolean;
  onCreateCost: (payload: ShipmentCostPayload) => void;
  onDeleteCost: (costId: string) => void;
  onUpdateCost: (costId: string, payload: Partial<ShipmentCostPayload>) => void;
  shipment: ShipmentRecord;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { numberSeparators } = useI18n();
  const { currencyOptions } = useTradeMasterDataOptions();
  const costs = shipment.costs;
  const total = landedCostTotal(costs);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [costType, setCostType] = useState<Gd1CostType>('FREIGHT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState<number | string>('');
  const [invoiceRef, setInvoiceRef] = useState('');

  const costTypeOptions = COST_TYPES.map((type) => ({ label: t(`shipments.costTypes.${type}`), value: type }));

  const resetForm = () => {
    setEditingId(null);
    setCostType('FREIGHT');
    setDescription('');
    setAmount('');
    setCurrency('USD');
    setRate('');
    setInvoiceRef('');
  };

  const handleCurrencyChange = (value: string | null) => {
    const next = value ?? BASE_CURRENCY;
    setCurrency(next);
    if (next === BASE_CURRENCY) {
      // The base currency never needs conversion — lock the rate at 1.
      setRate(1);
    } else if (rate === '' || Number(rate) === 1) {
      // Clear the base default so the user consciously enters the real FX rate to VND.
      setRate('');
    }
  };

  // For the base currency the rate is always 1; otherwise a positive FX rate is required
  // so a foreign-currency cost can never be saved with a silent (missing) conversion.
  const isBaseCurrency = currency === BASE_CURRENCY;
  const rateInvalid = !isBaseCurrency && !(Number(rate) > 0);

  const handleSubmit = () => {
    if (amount === '' || Number(amount) <= 0) return;
    if (rateInvalid) return;
    const payload: ShipmentCostPayload = {
      cost_type: costType,
      description: description.trim() || null,
      amount: Number(amount),
      currency_code: currency,
      exchange_rate: isBaseCurrency ? 1 : Number(rate),
      invoice_ref: invoiceRef.trim() || null,
    };
    if (editingId) {
      onUpdateCost(editingId, payload);
    } else {
      onCreateCost(payload);
    }
    resetForm();
  };

  const startEdit = (cost: ShipmentCost) => {
    setEditingId(cost.id);
    setCostType(cost.cost_type);
    setDescription(cost.description ?? '');
    setAmount(cost.amount);
    setCurrency(cost.currency_code);
    setRate(cost.exchange_rate);
    setInvoiceRef(cost.invoice_ref ?? '');
  };

  return (
    <Stack gap="md">
      <ShipmentMarginSummary shipment={shipment} t={t} />

      <Paper withBorder p="md">
        <Group justify="space-between">
          <Text fw={700} size="sm">
            <HeaderLabel label={t('shipments.costs')} hint={t('glossary.landedCost')} />
          </Text>
          <Badge size="lg" color="teal">
            {formatMoney(total, BASE_CURRENCY)}
          </Badge>
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <Select
            label={t('shipments.costType')}
            data={costTypeOptions}
            value={costType}
            onChange={(value) => setCostType((value as Gd1CostType | null) ?? 'OTHER')}
          />
          <TextInput
            label={t('shipments.costDescription')}
            placeholder={t('shipments.costDescriptionPlaceholder')}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <TextInput
            label={t('shipments.costInvoiceRef')}
            placeholder={t('shipments.costInvoiceRefPlaceholder')}
            value={invoiceRef}
            onChange={(event) => setInvoiceRef(event.currentTarget.value)}
          />
          <NumberInput
            label={t('shipments.costAmount')}
            placeholder="0"
            min={0}
            thousandSeparator={numberSeparators.thousandSeparator}
            decimalSeparator={numberSeparators.decimalSeparator}
            decimalScale={currencyDecimalScale(currency)}
            value={amount}
            onChange={setAmount}
          />
          <Select
            label={t('shipments.costCurrency')}
            data={currencyOptions}
            value={currency}
            onChange={handleCurrencyChange}
          />
          <NumberInput
            label={t('shipments.costExchangeRate')}
            min={0}
            thousandSeparator={numberSeparators.thousandSeparator}
            decimalSeparator={numberSeparators.decimalSeparator}
            value={rate}
            onChange={setRate}
            withAsterisk={!isBaseCurrency}
            disabled={isBaseCurrency}
            error={rateInvalid ? t('shipments.costExchangeRateRequired') : undefined}
          />
        </SimpleGrid>
        <Group justify="flex-end" mt="sm" gap="xs">
          {editingId && (
            <Button variant="subtle" leftSection={<IconX size={16} />} onClick={resetForm}>
              {t('common.cancel')}
            </Button>
          )}
          <Button
            leftSection={<IconPlus size={16} />}
            loading={isSaving}
            disabled={amount === '' || Number(amount) <= 0 || rateInvalid}
            onClick={handleSubmit}
          >
            {editingId ? t('shipments.costSave') : t('shipments.addCost')}
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="md">
        {costs.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('shipments.costEmpty')}
          </Text>
        ) : (
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={760} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('shipments.costType')}</Table.Th>
                  <Table.Th>{t('shipments.costDescription')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t('shipments.costAmount')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t('shipments.costBaseEquivalent')}</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>{t('shipments.costActions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {costs.map((cost) => {
                  const hint = COST_TYPE_HINT[cost.cost_type];
                  return (
                    <Table.Tr key={cost.id} bg={editingId === cost.id ? 'var(--kbfe-status-blue-bg)' : undefined}>
                      <Table.Td>
                        <HeaderLabel label={t(`shipments.costTypes.${cost.cost_type}`)} hint={hint ? t(hint) : undefined} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{cost.description || '-'}</Text>
                        {cost.invoice_ref ? (
                          <Text size="xs" c="dimmed">
                            <CopyValue value={cost.invoice_ref}>{cost.invoice_ref}</CopyValue>
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        {formatMoney(cost.amount, cost.currency_code)}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatMoney(convertToBase(cost.amount, cost.exchange_rate), BASE_CURRENCY)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            aria-label={t('common.edit')}
                            onClick={() => startEdit(cost)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label={t('common.delete')}
                            loading={isSaving}
                            onClick={() => onDeleteCost(cost.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>
    </Stack>
  );
}
