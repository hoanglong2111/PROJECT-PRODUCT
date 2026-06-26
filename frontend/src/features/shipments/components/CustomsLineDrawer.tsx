import { Button, Divider, Drawer, Group, NumberInput, Paper, Select, Stack, Text, TextInput } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  createCustomsDeclarationLine,
  updateCustomsDeclarationLine,
  type CustomsDeclarationLineV1,
} from '@shared/api/customsDeclarations';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchShipmentLines } from '@shared/api/shipments';
import { useI18n } from '@shared/i18n';

import { customsLineTax } from '../model/shipmentModel';

type Mode = 'create' | 'edit';

type NumState = number | string;

const num = (v: NumState): number | null => (v === '' || v == null ? null : Number(v));

export function CustomsLineDrawer({
  opened,
  onClose,
  mode,
  declarationId,
  shipmentId,
  line,
  nextLineNo,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  mode: Mode;
  declarationId: string | null;
  shipmentId: string;
  line: CustomsDeclarationLineV1 | null;
  nextLineNo: number;
  onSaved: () => void;
}) {
  const { t, formatNumber } = useI18n();

  const [shipmentLineId, setShipmentLineId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<NumState>('');
  const [customsValue, setCustomsValue] = useState<NumState>('');
  const [dutyRate, setDutyRate] = useState<NumState>('');
  const [vatRate, setVatRate] = useState<NumState>('');
  const [note, setNote] = useState('');

  const shipmentLinesQuery = useQuery({
    enabled: opened && mode === 'create',
    queryKey: queryKeys.shipmentLines(shipmentId),
    queryFn: () => fetchShipmentLines(shipmentId),
  });
  const shipmentLineOptions = (shipmentLinesQuery.data ?? []).map((sl) => ({
    label: [sl.item_description ?? sl.item_id ?? sl.id, `${Number(sl.qty).toLocaleString()} ${sl.unit ?? ''}`.trim()]
      .filter(Boolean)
      .join(' · '),
    value: sl.id,
  }));

  // Reset the form whenever the drawer opens for a new target.
  useEffect(() => {
    if (!opened) return;
    setShipmentLineId(line?.shipment_line_id ?? null);
    setQuantity(line?.quantity != null ? Number(line.quantity) : '');
    setCustomsValue(line?.customs_value != null ? Number(line.customs_value) : '');
    setDutyRate(line?.import_duty_rate != null ? Number(line.import_duty_rate) : '');
    setVatRate(line?.vat_rate != null ? Number(line.vat_rate) : '');
    setNote(line?.note ?? '');
  }, [opened, line]);

  const preview = useMemo(
    () => customsLineTax({ customs_value: num(customsValue), import_duty_rate: num(dutyRate), vat_rate: num(vatRate) }),
    [customsValue, dutyRate, vatRate],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      if (mode === 'create') {
        if (!declarationId) throw new Error(t('shipments.selectDeclarationFirst'));
        const selected = (shipmentLinesQuery.data ?? []).find((sl) => sl.id === shipmentLineId);
        return createCustomsDeclarationLine(declarationId, {
          shipment_line_id: shipmentLineId,
          item_id: selected?.item_id ?? null,
          item_description: selected?.item_description ?? null,
          unit: selected?.unit ?? null,
          line_no: nextLineNo,
          quantity: num(quantity) ?? undefined,
          customs_value: num(customsValue),
          import_duty_rate: num(dutyRate),
          vat_rate: num(vatRate),
          note: note || null,
        });
      }
      return updateCustomsDeclarationLine(line?.id ?? '', {
        quantity: num(quantity) ?? undefined,
        customs_value: num(customsValue),
        import_duty_rate: num(dutyRate),
        vat_rate: num(vatRate),
        note: note || null,
      });
    },
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const itemLabel = line?.item_description ?? line?.item_id ?? '-';

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        <Text fw={700}>{mode === 'create' ? t('shipments.addLine') : t('shipments.editLine')}</Text>
      }
    >
      <Stack gap="md">
        {mode === 'create' ? (
          <Select
            label={t('shipments.shipmentLine')}
            placeholder={t('shipments.shipmentLine')}
            searchable
            clearable
            data={shipmentLineOptions}
            value={shipmentLineId}
            onChange={setShipmentLineId}
            nothingFoundMessage={
              shipmentLinesQuery.isLoading ? t('shipments.loadingShipmentLines') : t('shipments.noShipmentLine')
            }
          />
        ) : (
          <div>
            <Text size="sm" c="dimmed">{t('common.item')}</Text>
            <Text fw={600}>{itemLabel}</Text>
            {line?.unit ? <Text size="xs" c="dimmed">{line.unit}</Text> : null}
          </div>
        )}

        <Group grow align="flex-start">
          <NumberInput
            label={t('shipments.quantity')}
            value={quantity}
            onChange={setQuantity}
            min={0}
            thousandSeparator=","
            allowNegative={false}
          />
          <NumberInput
            label={t('shipments.value')}
            value={customsValue}
            onChange={setCustomsValue}
            min={0}
            thousandSeparator=","
            allowNegative={false}
          />
        </Group>

        <Group grow align="flex-start">
          <NumberInput
            label={t('shipments.dutyRate')}
            value={dutyRate}
            onChange={setDutyRate}
            min={0}
            max={100}
            suffix="%"
            allowNegative={false}
          />
          <NumberInput
            label={t('shipments.vatRate')}
            value={vatRate}
            onChange={setVatRate}
            min={0}
            max={100}
            suffix="%"
            allowNegative={false}
          />
        </Group>

        <TextInput label={t('shipments.note')} value={note} onChange={(e) => setNote(e.currentTarget.value)} />

        <Paper withBorder p="sm" bg="var(--mantine-color-gray-0)">
          <Text size="xs" c="dimmed" mb={4}>{t('shipments.taxImpact')}</Text>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{t('shipments.estimatedDuty')}</Text>
            <Text size="sm">{formatNumber(Math.round(preview.duty))}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{t('shipments.estimatedVat')}</Text>
            <Text size="sm">{formatNumber(Math.round(preview.vat))}</Text>
          </Group>
          <Divider my={6} />
          <Group justify="space-between">
            <Text size="sm" fw={600}>{t('shipments.estimatedTaxTotal')}</Text>
            <Text size="sm" fw={700}>{formatNumber(Math.round(preview.taxTotal))}</Text>
          </Group>
        </Paper>

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            loading={saveMutation.isPending}
            disabled={mode === 'create' && !shipmentLineId}
            onClick={() => saveMutation.mutate()}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
