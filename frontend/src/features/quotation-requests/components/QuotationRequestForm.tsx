import { Alert, Button, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createQuotationRequest,
  type CreateQuotationRequestLinePayload,
  type QuotationRequestV1,
} from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { DateField } from '@shared/components/DateField';
import {
  FormSection,
  OrderLineItemsEditor,
  SummaryTile,
  newOrderLine,
  orderLinesTotal,
  type OrderLineDraft,
} from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import { useRfqMasterData } from '../hooks/useRfqMasterData';
import { rfqModeOptions } from '../model/quotationRequestModel';

type Props = {
  onCancel: () => void;
  onCreated: (request: QuotationRequestV1) => void;
};

const num = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

export function QuotationRequestForm({ onCancel, onCreated }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const masterData = useRfqMasterData();

  const [customerRef, setCustomerRef] = useState('KBI');
  const [customerPoRef, setCustomerPoRef] = useState('');
  const [customerContractRef, setCustomerContractRef] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [incoterm, setIncoterm] = useState<string | null>('FOB');
  const [mode, setMode] = useState<string | null>('SEA_FCL');
  const [currency, setCurrency] = useState<string | null>('USD');
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('Hai Phong (VNHPH)');
  const [readyDate, setReadyDate] = useState<string | null>(null);
  const [volume, setVolume] = useState<number | string>('');
  const [containerType, setContainerType] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<OrderLineDraft[]>([newOrderLine(0)]);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const selectedSupplier = masterData.suppliers.find((supplier) => supplier.id === supplierId);
  const totalWeight = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.gross_weight_kg) || 0), 0),
    [lines],
  );
  const requestTotal = orderLinesTotal(lines);
  const validLineCount = lines.filter((line) => line.item_id && line.qty > 0).length;
  const canSubmit = Boolean(customerRef.trim() && supplierId && incoterm && mode && currency && validLineCount > 0);

  const updateLine = (clientId: string, patch: Partial<OrderLineDraft>) => {
    setLines((current) => current.map((line) => (line.clientId === clientId ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    const next = newOrderLine(lines.length);
    setLines((current) => [...current, next]);
    setActiveLineId(next.clientId);
  };

  const removeLine = (clientId: string) => {
    setLines((current) => {
      if (current.length === 1) return current;
      const next = current
        .filter((line) => line.clientId !== clientId)
        .map((line, index) => ({ ...line, line_no: index + 1 }));
      setActiveLineId((activeId) => (activeId === clientId ? next[0]?.clientId ?? null : activeId));
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createQuotationRequest({
        customer_ref: customerRef.trim() || null,
        customer_po_ref: customerPoRef.trim() || null,
        customer_contract_ref: customerContractRef.trim() || null,
        supplier_id: supplierId,
        incoterm_code: incoterm,
        mode,
        currency_code: currency,
        origin_port: originPort.trim() || null,
        destination_port: destinationPort.trim() || null,
        desired_cargo_ready_date: readyDate,
        gross_weight_kg: totalWeight,
        volume_cbm: num(volume),
        container_type: containerType.trim() || null,
        note: note.trim() || null,
        lines: lines
          .filter((line) => line.item_id && line.qty > 0)
          .map<CreateQuotationRequestLinePayload>((line, index) => ({
            line_no: index + 1,
            item_id: line.item_id,
            item_description: line.item_description || null,
            qty: line.qty,
            unit: line.unit || null,
            unit_price: num(line.unit_price),
            gross_weight_kg: num(line.gross_weight_kg),
            note: line.note || null,
          })),
      }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(request);
    },
  });

  return (
    <form
      className="purchase-order-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) createMutation.mutate();
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700} size="lg">
              {t('quotationRequests.formTitle')}
            </Text>
            <Text c="dimmed" size="sm">
              {t('quotationRequests.formSubtitle')}
            </Text>
          </div>
          <Group gap="xs">
            <Button type="button" variant="subtle" leftSection={<IconX size={16} />} onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || masterData.isLoading}
              disabled={!canSubmit}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Group>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>
            {(createMutation.error as Error).message}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <SummaryTile label={t('quotationRequests.field.customerRef')} value={customerRef || 'KBI'} />
          <SummaryTile label={t('quotationRequests.field.supplier')} value={selectedSupplier?.supplier_name ?? '-'} />
          <SummaryTile label={t('quotationRequests.field.incoterm')} value={incoterm ?? '-'} />
          <SummaryTile
            label={t('quotationRequests.field.weightDerived')}
            value={totalWeight.toLocaleString()}
            tone="accent"
          />
        </SimpleGrid>

        <div className="purchase-order-form-core-grid">
          <FormSection
            title={t('quotationRequests.section.identification')}
            description={t('quotationRequests.section.identificationHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={t('quotationRequests.field.customerRef')}
                value={customerRef}
                onChange={(event) => setCustomerRef(event.currentTarget.value)}
                required
              />
              <TextInput
                label={t('quotationRequests.field.customerPoRef')}
                value={customerPoRef}
                onChange={(event) => setCustomerPoRef(event.currentTarget.value)}
              />
              <TextInput
                label={t('quotationRequests.field.customerContractRef')}
                value={customerContractRef}
                onChange={(event) => setCustomerContractRef(event.currentTarget.value)}
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title={t('quotationRequests.section.commercial')}
            description={t('quotationRequests.section.commercialHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={t('quotationRequests.field.supplier')}
                data={masterData.supplierOptions}
                value={supplierId}
                searchable
                required
                onChange={(value) => {
                  const supplier = masterData.suppliers.find((item) => item.id === value);
                  setSupplierId(value);
                  setCurrency(supplier?.default_currency_code ?? currency);
                  setIncoterm(supplier?.default_incoterm_code ?? incoterm);
                }}
              />
              <Select
                label={t('quotationRequests.field.incoterm')}
                data={masterData.incotermOptions}
                value={incoterm}
                onChange={setIncoterm}
                searchable
                required
              />
              <Select label={t('quotationRequests.field.mode')} data={rfqModeOptions} value={mode} onChange={setMode} required />
              <Select
                label={t('quotations.currency')}
                data={masterData.currencyOptions}
                value={currency}
                onChange={setCurrency}
                searchable
                required
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title={t('quotationRequests.section.logistics')}
            description={t('quotationRequests.section.logisticsHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={t('quotations.originPort')}
                description={`${t('purchaseOrders.originCountry')}: ${selectedSupplier?.country ?? '-'}`}
                value={originPort}
                onChange={(event) => setOriginPort(event.currentTarget.value)}
              />
              <TextInput
                label={t('quotations.destinationPort')}
                description={`${t('purchaseOrders.destinationCountry')}: VN`}
                value={destinationPort}
                onChange={(event) => setDestinationPort(event.currentTarget.value)}
              />
              <DateField label={t('quotationRequests.field.readyDate')} value={readyDate} onChange={setReadyDate} />
              <NumberInput
                label={t('quotationRequests.field.volume')}
                value={volume}
                onChange={setVolume}
                min={0}
                decimalScale={2}
              />
              <TextInput
                label={t('quotationRequests.field.container')}
                value={containerType}
                onChange={(event) => setContainerType(event.currentTarget.value)}
              />
            </SimpleGrid>
            <Textarea
              label={t('quotationRequests.field.note')}
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
              autosize
              minRows={2}
              mt="sm"
            />
          </FormSection>
        </div>

        <Paper withBorder p="sm" className="purchase-order-form-section purchase-order-lines-panel">
          <Group justify="space-between" align="flex-start" mb="sm">
            <div>
              <Text fw={700}>{t('quotationRequests.field.lines')}</Text>
              <Text size="sm" c="dimmed">
                {t('quotationRequests.linesHint')}
              </Text>
            </div>
            <SummaryTile
              label={t('quotationRequests.field.requestTotal')}
              tone="accent"
              value={requestTotal.toLocaleString()}
            />
          </Group>
          <OrderLineItemsEditor
            lines={lines}
            activeId={activeLineId}
            onActiveChange={setActiveLineId}
            onChange={updateLine}
            onAdd={addLine}
            onRemove={removeLine}
            items={masterData.items}
            itemOptions={masterData.itemOptions}
            currencyCode={currency}
            fields={{}}
            onItemSelected={(clientId, item) => {
              if (item?.unit_price_usd != null) {
                updateLine(clientId, { unit_price: Number(item.unit_price_usd) || 0 });
              }
            }}
          />
        </Paper>
      </Stack>
    </form>
  );
}
