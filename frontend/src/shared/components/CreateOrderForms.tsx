import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle, IconFileInvoice, IconPlus, IconShoppingCart, IconTrash, IconTruckDelivery } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import {
  createDeliveryOrder,
  createPurchaseOrder,
  type CreateDeliveryOrderPayload,
  type CreatePurchaseOrderPayload,
  type DeliveryOrder,
  type Priority,
  type PurchaseOrder,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { getItems, getPartners } from '@shared/api/masterDataService';
import { useI18n } from '@shared/i18n';
import { FlowTagBadge } from './FlowTagBadge';

const priorityValues: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const shippingMethodValues: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
const documentOptions = ['Invoice', 'Packing List', 'B/L', 'CO'];

type DrawerProps = {
  onClose: () => void;
  opened: boolean;
};

type PurchaseOrderFormValues = {
  currency: string;
  orderDate: string;
  poNumber: string;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
  sourceLines: Array<{
    classificationCode: string;
    coNote: string;
    declarationType: string;
    dutyRate: number;
    hsCode: string;
    itemSelectKey: string;
    itemId: string;
    itemCode: string;
    itemGroup: string;
    itemName: string;
    quantity: number;
    sourceReference: string;
    tariffCode: string;
    taxNote: string;
    unit: string;
    vatRate: number;
    lotNumber: string;
  }>;
};

type DeliveryOrderFormValues = {
  documentsList: string[];
  etaPlanned: string;
  etdPlanned: string;
  incoterms: string;
  itemCode: string;
  itemName: string;
  notes: string;
  plannedEntryDate: string;
  poNumber: string;
  portOfDeparture: string;
  portOfDestination: string;
  purchaseContractNumber: string;
  quantity: number;
  requestCode: string;
  shippingLine: string;
  shippingMethod: DeliveryOrder['logistics_shipping']['shipping_method'];
  supplierCode: string;
  supplierName: string;
  trackingNumber: string;
  unit: string;
  warehouseCode: string;
  warehouseDeadline: string;
};

type SelectablePoLine = {
  key: string;
  poNumber: string;
  poLineId: string;
  prCode: string;
  label: string;
  remaining: number;
  unit: string;
  supplierCode: string;
  supplierName: string;
  warehouseCode: string;
  warehouseDeadline: string;
};

function emptyPurchaseOrderSourceLine(): PurchaseOrderFormValues['sourceLines'][number] {
  return {
    classificationCode: '',
    coNote: '',
    declarationType: '',
    dutyRate: 0,
    hsCode: '',
    itemSelectKey: '',
    itemId: '',
    itemCode: '',
    itemGroup: '',
    itemName: '',
    quantity: 1,
    sourceReference: '',
    tariffCode: '',
    taxNote: '',
    unit: 'kg',
    vatRate: 0,
    lotNumber: 'Lô 1',
  };
}

export function CreatePurchaseOrderDrawer({
  onClose,
  onCreated,
  opened,
}: DrawerProps & {
  onCreated?: (order: PurchaseOrder) => void;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const itemsList = getItems();
  const itemOptions = itemsList.map((item, index) => ({
    item,
    value: `${item.id}:${index}`,
    label: `${item.item_code} - ${item.hs_code} - ${item.source_reference || item.declaration_type || item.id} - ${item.item_name}`,
  }));
  const partnersList = getPartners().filter((p) => p.type === 'SUPPLIER');

  // Track LOTs in state
  const [lots, setLots] = useState<string[]>(['Lô 1']);

  const form = useForm<PurchaseOrderFormValues>({
    initialValues: {
      currency: 'USD',
      orderDate: todayIso(),
      poNumber: '',
      supplierCode: '',
      supplierName: '',
      totalAmount: 1,
      warehouseCode: 'WH-HCM-01',
      sourceLines: [emptyPurchaseOrderSourceLine()],
    },
    validate: {
      poNumber: requiredField(t('forms.required')),
      supplierCode: requiredField(t('forms.required')),
      supplierName: requiredField(t('forms.required')),
      totalAmount: positiveNumber(t('forms.positiveNumber')),
      warehouseCode: requiredField(t('forms.required')),
      sourceLines: (value) => {
        if (!value || value.length === 0) {
          return t('forms.required');
        }
        return value.some(
          (line) =>
            !line.itemCode || line.itemCode.trim().length === 0 ||
            !line.itemName || line.itemName.trim().length === 0 ||
            !line.unit || line.unit.trim().length === 0 ||
            Number(line.quantity) <= 0,
        )
          ? t('forms.required')
          : null;
      },
    },
  });

  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      form.reset();
      setLots(['Lô 1']);
      onCreated?.(order);
      onClose();
    },
  });

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleAddLot = () => {
    setLots([...lots, `Lô ${lots.length + 1}`]);
  };

  return (
    <Drawer opened={opened} onClose={handleClose} title={t('forms.createPoTitle')} position="right" size="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          const payload: CreatePurchaseOrderPayload = {
            currency: values.currency.trim().toUpperCase(),
            orderDate: values.orderDate,
            poNumber: values.poNumber.trim(),
            sourceLines: values.sourceLines.map((line) => ({
              classificationCode: line.classificationCode.trim(),
              coNote: line.coNote.trim(),
              declarationType: line.declarationType.trim(),
              dutyRate: Number(line.dutyRate) || 0,
              hsCode: line.hsCode.trim(),
              itemId: line.itemId.trim(),
              itemCode: line.itemCode.trim(),
              itemGroup: line.itemGroup.trim(),
              itemName: line.itemName.trim(),
              quantity: Number(line.quantity),
              sourceReference: line.sourceReference.trim(),
              tariffCode: line.tariffCode.trim(),
              taxNote: line.taxNote.trim(),
              unit: line.unit.trim(),
              vatRate: Number(line.vatRate) || 0,
              lotNumber: line.lotNumber || 'Lô 1',
            })),
            supplierCode: values.supplierCode.trim(),
            supplierName: values.supplierName.trim(),
            totalAmount: Number(values.totalAmount),
            warehouseCode: values.warehouseCode.trim(),
          };

          mutation.mutate(payload);
        })}
      >
        <Stack gap="md">
          {mutation.isError ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
            </Alert>
          ) : null}

          {/* Section 1: Source Lines (Items Input) */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={700}>{t('forms.sourceLines')}</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => form.insertListItem('sourceLines', emptyPurchaseOrderSourceLine())}
              >
                {t('common.action')}
              </Button>
            </Group>
            {form.values.sourceLines.map((line, index) => (
              <Stack key={index} gap="xs" p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={700}>
                    Mặt hàng #{index + 1}
                  </Text>
                  <ActionIcon
                    aria-label={t('common.cancel')}
                    color="red"
                    disabled={form.values.sourceLines.length === 1}
                    onClick={() => form.removeListItem('sourceLines', index)}
                    variant="subtle"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label={t('forms.itemCode')}
                    placeholder="Chọn mã vật tư"
                    data={itemOptions.map(({ label, value }) => ({ label, value }))}
                    searchable
                    clearable
                    value={line.itemSelectKey}
                    onChange={(val) => {
                      const matched = itemOptions.find((option) => option.value === val)?.item;
                      form.setFieldValue(`sourceLines.${index}.itemSelectKey`, val || '');
                      form.setFieldValue(`sourceLines.${index}.itemId`, matched?.id || '');
                      form.setFieldValue(`sourceLines.${index}.itemCode`, matched?.item_code || '');
                      form.setFieldValue(`sourceLines.${index}.itemName`, matched?.item_name || '');
                      form.setFieldValue(`sourceLines.${index}.itemGroup`, matched?.item_group || '');
                      form.setFieldValue(`sourceLines.${index}.sourceReference`, matched?.source_reference || '');
                      form.setFieldValue(`sourceLines.${index}.declarationType`, matched?.declaration_type || '');
                      form.setFieldValue(`sourceLines.${index}.hsCode`, matched?.hs_code || '');
                      form.setFieldValue(`sourceLines.${index}.dutyRate`, matched?.duty_rate || 0);
                      form.setFieldValue(`sourceLines.${index}.vatRate`, matched?.vat_rate || 0);
                      form.setFieldValue(`sourceLines.${index}.tariffCode`, matched?.tariff_code || '');
                      form.setFieldValue(`sourceLines.${index}.classificationCode`, matched?.classification_code || '');
                      form.setFieldValue(`sourceLines.${index}.coNote`, matched?.co_note || '');
                      form.setFieldValue(`sourceLines.${index}.taxNote`, matched?.tax_note || '');
                    }}
                    error={form.errors[`sourceLines.${index}.itemCode`]}
                  />
                  <TextInput label={t('forms.itemName')} placeholder={t('forms.itemNamePlaceholder')} {...form.getInputProps(`sourceLines.${index}.itemName`)} />
                  <NumberInput label={t('forms.quantity')} min={1} thousandSeparator="," {...form.getInputProps(`sourceLines.${index}.quantity`)} />
                  <TextInput label={t('forms.unit')} placeholder={t('forms.unitPlaceholder')} {...form.getInputProps(`sourceLines.${index}.unit`)} />
                  <Select
                    label="Phân bổ vào Lô"
                    data={lots.map(l => ({ label: l, value: l }))}
                    value={line.lotNumber}
                    onChange={(val) => form.setFieldValue(`sourceLines.${index}.lotNumber`, val || 'Lô 1')}
                  />
                </SimpleGrid>
              </Stack>
            ))}
          </Stack>

          {/* Section 2: Visual LOT Splitter & Drag and Drop */}
          <Paper withBorder p="md" mt="sm" style={{ backgroundColor: 'var(--mantine-color-dark-8)' }}>
            <Stack gap="xs">
              <Group justify="space-between">
                <div>
                  <Text fw={700}>Chia Lô Hàng (LOT Splitter)</Text>
                  <Text size="xs" c="dimmed">
                    Mặc định tất cả vật tư thuộc Lô 1 (DO 1). Kéo thả vật tư giữa các ô bên dưới để phân chia lô.
                  </Text>
                </div>
                <Button size="xs" onClick={handleAddLot} leftSection={<IconPlus size={14} />}>
                  Tạo Lô mới
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" mt="xs">
                {lots.map((lotName) => {
                  const lotItems = form.values.sourceLines
                    .map((line, idx) => ({ line, idx }))
                    .filter((item) => (item.line.lotNumber || 'Lô 1') === lotName);

                  return (
                    <Paper
                      key={lotName}
                      withBorder
                      p="xs"
                      onDragOver={(e: React.DragEvent) => e.preventDefault()}
                      onDrop={(e: React.DragEvent) => {
                        const origIdx = parseInt(e.dataTransfer.getData('sourceLineIndex'));
                        if (!isNaN(origIdx)) {
                          form.setFieldValue(`sourceLines.${origIdx}.lotNumber`, lotName);
                        }
                      }}
                      style={{
                        minHeight: 120,
                        backgroundColor: 'var(--mantine-color-dark-9)',
                        borderStyle: 'dashed',
                        borderColor: 'var(--mantine-color-blue-outline)',
                      }}
                    >
                      <Group justify="space-between" mb="xs">
                        <Text fw={700} size="sm" c="blue">
                          {lotName}
                        </Text>
                        <Badge size="xs">{lotItems.length} mặt hàng</Badge>
                      </Group>

                      <Stack gap="xs">
                        {lotItems.map((item) => (
                          <Paper
                            key={item.idx}
                            withBorder
                            p="xs"
                            draggable
                            onDragStart={(e: React.DragEvent) => {
                              e.dataTransfer.setData('sourceLineIndex', item.idx.toString());
                            }}
                            style={{
                              cursor: 'grab',
                              backgroundColor: 'var(--mantine-color-dark-7)',
                            }}
                          >
                            <Text size="xs" fw={600} truncate>
                              {item.line.itemCode || `Mặt hàng #${item.idx + 1}`}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {item.line.itemName || 'Chưa đặt tên'}
                            </Text>
                            <Text size="xs" fw={700}>
                              SL: {item.line.quantity} {item.line.unit}
                            </Text>
                          </Paper>
                        ))}
                        {lotItems.length === 0 && (
                          <Text size="xs" c="dimmed" fs="italic" style={{ textAlign: 'center', marginTop: 20 }}>
                            Kéo thả vật tư vào đây
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}
              </SimpleGrid>
            </Stack>
          </Paper>

          {/* Section 3: General Information */}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="PO / Hợp đồng" placeholder="KBI-SDEC-2604" {...form.getInputProps('poNumber')} />
            <Select
              label={t('forms.supplierCode')}
              placeholder="Chọn nhà cung cấp"
              data={partnersList.map((p) => ({ value: p.code, label: `${p.code} - ${p.name}` }))}
              searchable
              clearable
              value={form.values.supplierCode}
              onChange={(val) => {
                form.setFieldValue('supplierCode', val || '');
                const matched = partnersList.find((p) => p.code === val);
                if (matched) {
                  form.setFieldValue('supplierName', matched.name);
                }
              }}
              error={form.errors.supplierCode}
            />
            <TextInput label={t('forms.supplierName')} placeholder={t('forms.supplierNamePlaceholder')} {...form.getInputProps('supplierName')} />
            <TextInput label={t('forms.orderDate')} type="date" {...form.getInputProps('orderDate')} />
            <TextInput label={t('forms.currency')} placeholder="USD" {...form.getInputProps('currency')} />
            <NumberInput label={t('forms.totalAmount')} min={1} thousandSeparator="," {...form.getInputProps('totalAmount')} />
            <TextInput label={t('forms.warehouse')} placeholder="WH-HCM-01" {...form.getInputProps('warehouseCode')} />
          </SimpleGrid>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('forms.createPoHint')}
            </Text>
            <Button
              type="submit"
              loading={mutation.isPending}
              leftSection={<IconShoppingCart size={16} />}
            >
              {t('forms.createPo')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}

export function CreateDeliveryOrderDrawer({
  deliveryOrders,
  onClose,
  onCreated,
  opened,
  purchaseOrders,
}: DrawerProps & {
  deliveryOrders: DeliveryOrder[];
  onCreated?: (order: DeliveryOrder) => void;
  purchaseOrders: PurchaseOrder[];
}) {
  const queryClient = useQueryClient();
  const { documentLabel, shippingMethodLabel, t } = useI18n();
  const selectableLines = useMemo(() => buildSelectablePoLines(purchaseOrders, deliveryOrders), [deliveryOrders, purchaseOrders]);
  const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
  const selectedLineKeys = Object.keys(selectedLines).filter((key) => selectedLines[key] > 0);
  const shippingMethodOptions = shippingMethodValues.map((method) => ({ label: shippingMethodLabel(method), value: method }));
  const form = useForm<DeliveryOrderFormValues>({
    initialValues: {
      documentsList: ['Invoice', 'Packing List'],
      etaPlanned: '',
      etdPlanned: '',
      incoterms: 'FOB',
      itemCode: '',
      itemName: '',
      notes: '',
      plannedEntryDate: '',
      poNumber: '',
      portOfDeparture: '',
      portOfDestination: 'VNSGN - Cat Lai',
      purchaseContractNumber: '',
      quantity: 1,
      requestCode: '',
      shippingLine: '',
      shippingMethod: 'SEA',
      supplierCode: '',
      supplierName: '',
      trackingNumber: '',
      unit: 'kg',
      warehouseCode: 'WH-HCM-01',
      warehouseDeadline: '',
    },
    validate: {
      portOfDestination: requiredField(t('forms.required')),
      quantity: positiveNumber(t('forms.positiveNumber')),
      warehouseCode: requiredField(t('forms.required')),
      warehouseDeadline: requiredField(t('forms.required')),
    },
  });
  const mutation = useMutation({
    mutationFn: createDeliveryOrder,
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      form.reset();
      setSelectedLines({});
      onCreated?.(order);
      onClose();
    },
  });

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  return (
    <Drawer opened={opened} onClose={handleClose} title={t('forms.createDoTitle')} position="right" size="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          const payload: CreateDeliveryOrderPayload = {
            documentsList: values.documentsList,
            etaPlanned: toNullable(values.etaPlanned),
            etdPlanned: toNullable(values.etdPlanned),
            incoterms: values.incoterms.trim(),
            itemCode: values.itemCode.trim(),
            itemName: values.itemName.trim(),
            notes: values.notes.trim(),
            plannedEntryDate: toNullable(values.plannedEntryDate),
            poNumber: values.poNumber,
            portOfDeparture: values.portOfDeparture.trim(),
            portOfDestination: values.portOfDestination.trim(),
            purchaseContractNumber: values.purchaseContractNumber.trim(),
            quantity: Number(values.quantity),
            requestCode: values.requestCode,
            shippingLine: toNullable(values.shippingLine),
            shippingMethod: values.shippingMethod,
            supplierCode: toNullable(values.supplierCode),
            supplierName: toNullable(values.supplierName),
            trackingNumber: toNullable(values.trackingNumber),
            unit: values.unit.trim(),
            warehouseCode: values.warehouseCode.trim(),
            warehouseDeadline: values.warehouseDeadline,
            sourceLines: selectedLineKeys.map((key) => {
              const line = selectableLines.find((item) => item.key === key);
              return {
                poNumber: line?.poNumber ?? '',
                poLineId: line?.poLineId ?? '',
                quantity: selectedLines[key],
              };
            }),
          };

          if (payload.sourceLines?.length === 0) {
            mutation.reset();
            return;
          }

          mutation.mutate(payload);
        })}
      >
        <Stack gap="md">
          {selectableLines.length === 0 ? (
            <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
              {t('forms.noPoForDo')}
            </Alert>
          ) : null}
          {mutation.isError ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
            </Alert>
          ) : null}

          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={700}>{t('forms.sourceLines')}</Text>
              <FlowTagBadge
                compact
                tags={
                  new Set(selectedLineKeys.map((key) => selectableLines.find((line) => line.key === key)?.poNumber)).size > 1
                    ? ['CONTAINER_CONSOLIDATION']
                    : selectedLineKeys.length > 0
                      ? ['PARTIAL_DELIVERY']
                      : ['LINEAR']
                }
              />
            </Group>
            {selectableLines.map((line) => (
              <Group key={line.key} align="end" justify="space-between">
                <Checkbox
                  checked={selectedLineKeys.includes(line.key)}
                  label={`${line.label} - ${t('common.remaining')} ${line.remaining.toLocaleString()} ${line.unit}`}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelectedLines((current) => {
                      const next = { ...current };
                      if (checked) {
                        next[line.key] = line.remaining;
                      } else {
                        delete next[line.key];
                      }
                      return next;
                    });
                    form.setFieldValue('poNumber', line.poNumber);
                    form.setFieldValue('requestCode', line.prCode);
                    form.setFieldValue('supplierCode', line.supplierCode);
                    form.setFieldValue('supplierName', line.supplierName);
                    form.setFieldValue('warehouseCode', line.warehouseCode);
                    form.setFieldValue('warehouseDeadline', line.warehouseDeadline);
                    form.setFieldValue('quantity', line.remaining);
                    form.setFieldValue('unit', line.unit);
                  }}
                />
                <NumberInput
                  aria-label={line.label}
                  disabled={!selectedLineKeys.includes(line.key)}
                  max={line.remaining}
                  min={1}
                  value={selectedLines[line.key] ?? line.remaining}
                  w={150}
                  onChange={(value) =>
                    setSelectedLines((current) => ({ ...current, [line.key]: Math.min(Number(value) || 1, line.remaining) }))
                  }
                />
              </Group>
            ))}
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('forms.sourcePr')} {...form.getInputProps('requestCode')} />
            <TextInput label={t('forms.purchaseContract')} {...form.getInputProps('purchaseContractNumber')} />
            <TextInput label={t('forms.itemCode')} {...form.getInputProps('itemCode')} />
            <TextInput label={t('forms.itemName')} {...form.getInputProps('itemName')} />
            <NumberInput label={t('forms.quantity')} min={1} thousandSeparator="," {...form.getInputProps('quantity')} />
            <TextInput label={t('forms.unit')} {...form.getInputProps('unit')} />
            <TextInput label={t('forms.supplierCode')} {...form.getInputProps('supplierCode')} />
            <TextInput label={t('forms.supplierName')} {...form.getInputProps('supplierName')} />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label={t('forms.shippingMethod')} data={shippingMethodOptions} {...form.getInputProps('shippingMethod')} />
            <TextInput label={t('forms.incoterms')} {...form.getInputProps('incoterms')} />
            <TextInput label={t('forms.shippingLine')} {...form.getInputProps('shippingLine')} />
            <TextInput label={t('forms.trackingNumber')} {...form.getInputProps('trackingNumber')} />
            <TextInput label={t('forms.portOfDeparture')} {...form.getInputProps('portOfDeparture')} />
            <TextInput label={t('forms.portOfDestination')} {...form.getInputProps('portOfDestination')} />
            <TextInput label={t('forms.etdPlanned')} type="date" {...form.getInputProps('etdPlanned')} />
            <TextInput label={t('forms.etaPlanned')} type="date" {...form.getInputProps('etaPlanned')} />
            <TextInput label={t('forms.plannedWarehouseEntry')} type="date" {...form.getInputProps('plannedEntryDate')} />
            <TextInput label={t('forms.warehouseDeadline')} type="date" {...form.getInputProps('warehouseDeadline')} />
            <TextInput label={t('forms.warehouse')} {...form.getInputProps('warehouseCode')} />
          </SimpleGrid>

          <Checkbox.Group label={t('forms.documentsReceived')} {...form.getInputProps('documentsList')}>
            <Group mt="xs">
              {documentOptions.map((documentName) => (
                <Checkbox key={documentName} value={documentName} label={documentLabel(documentName)} />
              ))}
            </Group>
          </Checkbox.Group>

          <Textarea label={t('common.notes')} minRows={3} placeholder={t('forms.shipmentNotesPlaceholder')} {...form.getInputProps('notes')} />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('forms.createDoHint')}
            </Text>
            <Button
              type="submit"
              disabled={selectableLines.length === 0 || selectedLineKeys.length === 0}
              loading={mutation.isPending}
              leftSection={<IconTruckDelivery size={16} />}
            >
              {t('forms.createDo')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}

function requiredField(message: string) {
  return (value: string) => (value.trim().length > 0 ? null : message);
}

function positiveNumber(message: string) {
  return (value: number) => (Number(value) > 0 ? null : message);
}



function buildSelectablePoLines(purchaseOrders: PurchaseOrder[], deliveryOrders: DeliveryOrder[]): SelectablePoLine[] {
  return purchaseOrders
    .flatMap((order) =>
      order.line_items.map((line) => {
        const delivered = deliveryOrders.reduce(
          (total, deliveryOrder) =>
            total +
            deliveryOrder.source_lines
              .filter((sourceLine) => sourceLine.po_number === order.po_number && sourceLine.po_line_id === line.id)
              .reduce((lineTotal, sourceLine) => lineTotal + sourceLine.quantity, 0),
          0,
        );
        const remaining = Math.max(0, line.quantity - delivered);

        return {
          key: `${order.po_number}:${line.id}`,
          label: `${order.po_number} - ${line.item_code} - ${line.item_name}`,
          poLineId: line.id,
          poNumber: order.po_number,
          prCode: '',
          remaining,
          supplierCode: order.supplier_code,
          supplierName: order.supplier_name,
          unit: line.unit,
          warehouseCode: order.warehouse_code,
          warehouseDeadline: line.warehouse_deadline_date,
        };
      }),
    )
    .filter((line) => line.remaining > 0);
}

function toNullable(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
