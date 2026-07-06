import { Alert, Button, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
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
import { useI18n } from '@shared/i18n';

import { useRfqMasterData } from '../hooks/useRfqMasterData';
import { rfqModeOptions, rfqTotalWeight } from '../model/quotationRequestModel';
import { createEmptyLine, QuotationRequestLineEditor } from './QuotationRequestLineEditor';

type QuotationRequestFormProps = {
  onCancel: () => void;
  onCreated: (request: QuotationRequestV1) => void;
};

export function QuotationRequestForm({ onCancel, onCreated }: QuotationRequestFormProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const masterData = useRfqMasterData();

  const [customerRef, setCustomerRef] = useState('KBI');
  const [customerPoRef, setCustomerPoRef] = useState('');
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
  const [lines, setLines] = useState<CreateQuotationRequestLinePayload[]>([createEmptyLine(0)]);

  const selectedSupplier = masterData.suppliers.find((supplier) => supplier.id === supplierId);
  const totalWeight = useMemo(() => rfqTotalWeight(lines), [lines]);
  const validLineCount = lines.filter((line) => line.item_id && Number(line.qty ?? 0) > 0).length;
  const canSubmit = Boolean(customerRef.trim() && supplierId && incoterm && mode && currency && validLineCount > 0);

  const createMutation = useMutation({
    mutationFn: () =>
      createQuotationRequest({
        customer_ref: customerRef.trim() || null,
        customer_po_ref: customerPoRef.trim() || null,
        supplier_id: supplierId,
        incoterm_code: incoterm,
        mode,
        currency_code: currency,
        origin_port: originPort.trim() || null,
        destination_port: destinationPort.trim() || null,
        desired_cargo_ready_date: readyDate,
        gross_weight_kg: totalWeight,
        volume_cbm: numberOrNull(volume),
        container_type: containerType.trim() || null,
        lines: lines
          .filter((line) => line.item_id && Number(line.qty ?? 0) > 0)
          .map((line, index) => ({ ...line, line_no: index + 1 })),
        note: note.trim() || null,
      }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(request);
    },
  });

  return (
    <Paper withBorder p="lg" className="rfq-detail">
      <Stack gap="lg">
        <div>
          <Title order={3}>{t('quotationRequests.formTitle')}</Title>
          <Text c="dimmed" size="sm">{t('quotationRequests.formSubtitle')}</Text>
        </div>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>
            {(createMutation.error as Error).message}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, md: 3 }}>
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
          <Select
            label={t('quotationRequests.field.supplier')}
            data={masterData.supplierOptions}
            value={supplierId}
            onChange={(value) => {
              const supplier = masterData.suppliers.find((item) => item.id === value);
              setSupplierId(value);
              setCurrency(supplier?.default_currency_code ?? currency);
              setIncoterm(supplier?.default_incoterm_code ?? incoterm);
            }}
            searchable
            required
          />
          <Select label={t('quotationRequests.field.incoterm')} data={masterData.incotermOptions} value={incoterm} onChange={setIncoterm} searchable required />
          <Select label={t('quotationRequests.field.mode')} data={rfqModeOptions} value={mode} onChange={setMode} required />
          <Select label={t('quotations.currency')} data={masterData.currencyOptions} value={currency} onChange={setCurrency} searchable required />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, md: 3 }}>
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
          <NumberInput label={t('quotationRequests.field.weightDerived')} value={totalWeight} thousandSeparator="," readOnly />
          <NumberInput label={t('quotationRequests.field.volume')} value={volume} onChange={setVolume} min={0} decimalScale={2} />
          <TextInput label={t('quotationRequests.field.container')} value={containerType} onChange={(event) => setContainerType(event.currentTarget.value)} />
        </SimpleGrid>

        <QuotationRequestLineEditor items={masterData.items} lines={lines} onChange={setLines} />

        <Textarea label={t('quotationRequests.field.note')} value={note} onChange={(event) => setNote(event.currentTarget.value)} minRows={3} />

        <Group justify="flex-end">
          <Button variant="subtle" leftSection={<IconX size={16} />} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={createMutation.isPending || masterData.isLoading}
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function numberOrNull(value: number | string): number | null {
  if (value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
