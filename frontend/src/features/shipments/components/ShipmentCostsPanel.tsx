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
import { HeaderLabel } from '@shared/components/HeaderLabel';

import { landedCostTotal } from '../model/shipmentModel';

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

// Default exchange rate to the base currency (VND), aligned with the seed currencies.
const CURRENCY_RATES: Record<string, number> = { VND: 1, USD: 25000, CNY: 3500, EUR: 27000 };
const CURRENCIES = Object.keys(CURRENCY_RATES);

const COST_TYPE_HINT: Partial<Record<Gd1CostType, string>> = {
  FREIGHT: 'glossary.freight',
  INSURANCE: 'glossary.insurance',
  CUSTOMS_DUTY: 'glossary.importDuty',
  LOCAL_CHARGES: 'glossary.localCharges',
};

function formatBase(value: number) {
  return `${Math.round(value).toLocaleString()} ${BASE_CURRENCY}`;
}

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
  t: (key: string) => string;
}) {
  const costs = shipment.costs;
  const total = landedCostTotal(costs);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [costType, setCostType] = useState<Gd1CostType>('FREIGHT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState<number | string>(CURRENCY_RATES.USD);
  const [invoiceRef, setInvoiceRef] = useState('');

  const costTypeOptions = COST_TYPES.map((type) => ({ label: t(`shipments.costTypes.${type}`), value: type }));
  const currencyOptions = CURRENCIES.map((code) => ({ label: code, value: code }));

  const resetForm = () => {
    setEditingId(null);
    setCostType('FREIGHT');
    setDescription('');
    setAmount('');
    setCurrency('USD');
    setRate(CURRENCY_RATES.USD);
    setInvoiceRef('');
  };

  const handleCurrencyChange = (value: string | null) => {
    const next = value ?? BASE_CURRENCY;
    setCurrency(next);
    if (next in CURRENCY_RATES) setRate(CURRENCY_RATES[next]);
  };

  const handleSubmit = () => {
    if (amount === '' || Number(amount) <= 0) return;
    const payload: ShipmentCostPayload = {
      cost_type: costType,
      description: description.trim() || null,
      amount: Number(amount),
      currency_code: currency,
      exchange_rate: rate === '' ? 1 : Number(rate),
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
      <Paper withBorder p="md">
        <Group justify="space-between">
          <Text fw={700} size="sm">
            <HeaderLabel label={t('shipments.costs')} hint={t('glossary.landedCost')} />
          </Text>
          <Badge size="lg" color="teal">
            {formatBase(total)}
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
            placeholder="Ocean freight, fumigation fee..."
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <TextInput
            label={t('shipments.costInvoiceRef')}
            placeholder="FRT-001"
            value={invoiceRef}
            onChange={(event) => setInvoiceRef(event.currentTarget.value)}
          />
          <NumberInput
            label={t('shipments.costAmount')}
            placeholder="0"
            min={0}
            thousandSeparator=","
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
            thousandSeparator=","
            value={rate}
            onChange={setRate}
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
            disabled={amount === '' || Number(amount) <= 0}
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
                    <Table.Tr key={cost.id} bg={editingId === cost.id ? 'var(--mantine-color-blue-light)' : undefined}>
                      <Table.Td>
                        <HeaderLabel label={t(`shipments.costTypes.${cost.cost_type}`)} hint={hint ? t(hint) : undefined} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{cost.description || '-'}</Text>
                        {cost.invoice_ref ? (
                          <Text size="xs" c="dimmed">
                            {cost.invoice_ref}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        {cost.amount.toLocaleString()} {cost.currency_code}
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{formatBase(cost.amount * cost.exchange_rate)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            aria-label="edit"
                            onClick={() => startEdit(cost)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="delete"
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
