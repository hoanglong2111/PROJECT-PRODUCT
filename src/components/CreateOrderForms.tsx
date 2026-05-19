import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  Drawer,
  Group,
  NumberInput,
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
  createPurchaseRequest,
  type CreateDeliveryOrderPayload,
  type CreatePurchaseOrderPayload,
  type CreatePurchaseRequestPayload,
  type DeliveryOrder,
  type Priority,
  type PurchaseOrder,
  type PurchaseRequest,
} from '../api/logistics';
import { getApiErrorMessage } from '../api/http';
import { useI18n } from '../i18n';
import { FlowTagBadge } from './FlowTagBadge';

const priorityValues: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const shippingMethodValues: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
const documentOptions = ['Invoice', 'Packing List', 'B/L', 'CO'];

type DrawerProps = {
  onClose: () => void;
  opened: boolean;
};

type PurchaseRequestFormValues = {
  expectedArrivalDate: string;
  itemCode: string;
  itemName: string;
  lineItems: Array<{
    itemCode: string;
    itemName: string;
    productionContractNumber: string;
    quantity: number;
    unit: string;
    warehouseCode: string;
    warehouseDeadlineDate: string;
  }>;
  notes: string;
  priority: Priority;
  productionContractNumber: string;
  quantity: number;
  requestedOrderDate: string;
  supplierExpectedDeliveryDate: string;
  unit: string;
  warehouseCode: string;
  warehouseDeadlineDate: string;
};

type PurchaseOrderFormValues = {
  currency: string;
  orderDate: string;
  supplierCode: string;
  supplierName: string;
  totalAmount: number;
  warehouseCode: string;
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

type SelectablePrLine = {
  key: string;
  prCode: string;
  prLineId: string;
  label: string;
  remaining: number;
  unit: string;
  warehouseCode: string;
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

export function CreatePurchaseRequestDrawer({
  onClose,
  onCreated,
  opened,
}: DrawerProps & { onCreated?: (request: PurchaseRequest) => void }) {
  const queryClient = useQueryClient();
  const { priorityLabel, t } = useI18n();
  const priorityOptions = priorityValues.map((priority) => ({ label: priorityLabel(priority), value: priority }));
  const form = useForm<PurchaseRequestFormValues>({
    initialValues: {
      expectedArrivalDate: '',
      itemCode: '',
      itemName: '',
      lineItems: [
        {
          itemCode: '',
          itemName: '',
          productionContractNumber: 'PC-2026-HCM-100',
          quantity: 1,
          unit: 'kg',
          warehouseCode: 'WH-HCM-01',
          warehouseDeadlineDate: addDays(todayIso(), 14),
        },
      ],
      notes: '',
      priority: 'MEDIUM',
      productionContractNumber: '',
      quantity: 1,
      requestedOrderDate: todayIso(),
      supplierExpectedDeliveryDate: '',
      unit: 'kg',
      warehouseCode: 'WH-HCM-01',
      warehouseDeadlineDate: addDays(todayIso(), 14),
    },
    validate: {
      lineItems: (value) => {
        if (value.length === 0) {
          return t('forms.required');
        }

        return value.some(
          (line) =>
            line.itemCode.trim().length === 0 ||
            line.itemName.trim().length === 0 ||
            line.productionContractNumber.trim().length === 0 ||
            line.unit.trim().length === 0 ||
            line.warehouseCode.trim().length === 0 ||
            line.warehouseDeadlineDate.trim().length === 0 ||
            Number(line.quantity) <= 0,
        )
          ? t('forms.required')
          : null;
      },
    },
  });
  const mutation = useMutation({
    mutationFn: createPurchaseRequest,
    onSuccess: async (request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['global-search'] }),
      ]);
      form.reset();
      onCreated?.(request);
      onClose();
    },
  });

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  return (
    <Drawer opened={opened} onClose={handleClose} title={t('forms.createPrTitle')} position="right" size="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          const primaryLine = values.lineItems[0];
          const payload: CreatePurchaseRequestPayload = {
            expectedArrivalDate: toNullable(values.expectedArrivalDate),
            itemCode: primaryLine.itemCode.trim(),
            itemName: primaryLine.itemName.trim(),
            lineItems: values.lineItems.map((line) => ({
              itemCode: line.itemCode.trim(),
              itemName: line.itemName.trim(),
              productionContractNumber: line.productionContractNumber.trim(),
              quantity: Number(line.quantity),
              unit: line.unit.trim(),
              warehouseCode: line.warehouseCode.trim(),
              warehouseDeadlineDate: line.warehouseDeadlineDate,
            })),
            notes: values.notes.trim(),
            priority: values.priority,
            productionContractNumber: primaryLine.productionContractNumber.trim(),
            quantity: values.lineItems.reduce((total, line) => total + Number(line.quantity), 0),
            requestedOrderDate: values.requestedOrderDate,
            supplierExpectedDeliveryDate: toNullable(values.supplierExpectedDeliveryDate),
            unit: primaryLine.unit.trim(),
            warehouseCode: primaryLine.warehouseCode.trim(),
            warehouseDeadlineDate: primaryLine.warehouseDeadlineDate,
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

          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={700}>{t('forms.sourceLines')}</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() =>
                  form.insertListItem('lineItems', {
                    itemCode: '',
                    itemName: '',
                    productionContractNumber: 'PC-2026-HCM-100',
                    quantity: 1,
                    unit: 'kg',
                    warehouseCode: 'WH-HCM-01',
                    warehouseDeadlineDate: addDays(todayIso(), 14),
                  })
                }
              >
                {t('common.action')}
              </Button>
            </Group>
            {form.values.lineItems.map((line, index) => (
              <Stack key={index} gap="xs" p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8 }}>
                <Group justify="space-between">
                  <Text size="sm" fw={700}>
                    #{index + 1}
                  </Text>
                  <ActionIcon
                    aria-label={t('common.cancel')}
                    color="red"
                    disabled={form.values.lineItems.length === 1}
                    onClick={() => form.removeListItem('lineItems', index)}
                    variant="subtle"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label={t('forms.itemCode')} placeholder="RM-ALU-6061-T6" {...form.getInputProps(`lineItems.${index}.itemCode`)} />
                  <TextInput label={t('forms.itemName')} placeholder={t('forms.itemNamePlaceholder')} {...form.getInputProps(`lineItems.${index}.itemName`)} />
                  <NumberInput label={t('forms.quantity')} min={1} thousandSeparator="," {...form.getInputProps(`lineItems.${index}.quantity`)} />
                  <TextInput label={t('forms.unit')} placeholder={t('forms.unitPlaceholder')} {...form.getInputProps(`lineItems.${index}.unit`)} />
                  <TextInput label={t('forms.warehouse')} placeholder="WH-HCM-01" {...form.getInputProps(`lineItems.${index}.warehouseCode`)} />
                  <TextInput label={t('forms.warehouseDeadline')} type="date" {...form.getInputProps(`lineItems.${index}.warehouseDeadlineDate`)} />
                  <TextInput label={t('forms.productionContract')} placeholder="PC-2026-HCM-100" {...form.getInputProps(`lineItems.${index}.productionContractNumber`)} />
                </SimpleGrid>
              </Stack>
            ))}
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label={t('forms.priority')} data={priorityOptions} {...form.getInputProps('priority')} />
            <TextInput label={t('forms.requestedDate')} type="date" {...form.getInputProps('requestedOrderDate')} />
            <TextInput label={t('forms.supplierExpectedDelivery')} type="date" {...form.getInputProps('supplierExpectedDeliveryDate')} />
            <TextInput label={t('forms.expectedArrival')} type="date" {...form.getInputProps('expectedArrivalDate')} />
          </SimpleGrid>
          <Textarea label={t('common.notes')} minRows={3} placeholder={t('common.notes')} {...form.getInputProps('notes')} />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {t('forms.createPrHint')}
            </Text>
            <Button type="submit" loading={mutation.isPending} leftSection={<IconFileInvoice size={16} />}>
              {t('forms.createPr')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}

export function CreatePurchaseOrderDrawer({
  onClose,
  onCreated,
  opened,
  purchaseOrders,
  purchaseRequests,
}: DrawerProps & {
  onCreated?: (order: PurchaseOrder) => void;
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
}) {
  const selectableLines = useMemo(() => buildSelectablePrLines(purchaseRequests, purchaseOrders), [purchaseOrders, purchaseRequests]);
  const [selectedLines, setSelectedLines] = useState<Record<string, number>>({});
  const selectedLineKeys = Object.keys(selectedLines).filter((key) => selectedLines[key] > 0);
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const form = useForm<PurchaseOrderFormValues>({
    initialValues: {
      currency: 'USD',
      orderDate: todayIso(),
      supplierCode: '',
      supplierName: '',
      totalAmount: 1,
      warehouseCode: 'WH-HCM-01',
    },
    validate: {
      supplierCode: requiredField(t('forms.required')),
      supplierName: requiredField(t('forms.required')),
      totalAmount: positiveNumber(t('forms.positiveNumber')),
      warehouseCode: requiredField(t('forms.required')),
    },
  });
  const mutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async (order) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['global-search'] }),
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
    <Drawer opened={opened} onClose={handleClose} title={t('forms.createPoTitle')} position="right" size="xl">
      <form
        onSubmit={form.onSubmit((values) => {
          const payload: CreatePurchaseOrderPayload = {
            currency: values.currency.trim().toUpperCase(),
            orderDate: values.orderDate,
            sourceLines: selectedLineKeys.map((key) => {
              const line = selectableLines.find((item) => item.key === key);
              return {
                prCode: line?.prCode ?? '',
                prLineId: line?.prLineId ?? '',
                quantity: selectedLines[key],
              };
            }),
            supplierCode: values.supplierCode.trim(),
            supplierName: values.supplierName.trim(),
            totalAmount: Number(values.totalAmount),
            warehouseCode: values.warehouseCode.trim(),
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
              {t('forms.noApprovedPr')}
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
                tags={selectedLineKeys.length > 1 ? ['BULK_PURCHASE'] : ['LINEAR']}
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
                    form.setFieldValue('warehouseCode', line.warehouseCode);
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
            <TextInput label={t('forms.supplierCode')} placeholder="SUP-CN-0007" {...form.getInputProps('supplierCode')} />
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
              disabled={selectableLines.length === 0 || selectedLineKeys.length === 0}
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
  purchaseRequests,
}: DrawerProps & {
  deliveryOrders: DeliveryOrder[];
  onCreated?: (order: DeliveryOrder) => void;
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
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
        queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['purchase-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['global-search'] }),
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

function buildSelectablePrLines(purchaseRequests: PurchaseRequest[], purchaseOrders: PurchaseOrder[]): SelectablePrLine[] {
  return purchaseRequests
    .filter((request) => request.status === 'APPROVED' || request.status === 'CONVERTED_TO_PO')
    .flatMap((request) =>
      request.line_items.map((line) => {
        const ordered = purchaseOrders.reduce(
          (total, order) =>
            total +
            order.line_items
              .filter((orderLine) => orderLine.source_pr_code === request.requested_order_id && orderLine.source_pr_line_id === line.id)
              .reduce((lineTotal, orderLine) => lineTotal + orderLine.quantity, 0),
          0,
        );
        const remaining = Math.max(0, line.quantity - ordered);

        return {
          key: `${request.requested_order_id}:${line.id}`,
          label: `${request.requested_order_id} - ${line.item_code} - ${line.item_name}`,
          prCode: request.requested_order_id,
          prLineId: line.id,
          remaining,
          unit: line.unit,
          warehouseCode: line.warehouse_code,
        };
      }),
    )
    .filter((line) => line.remaining > 0);
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
          label: `${order.po_number} - ${line.source_pr_code} - ${line.item_code} - ${line.item_name}`,
          poLineId: line.id,
          poNumber: order.po_number,
          prCode: line.source_pr_code,
          remaining,
          supplierCode: order.supplier_code,
          supplierName: order.supplier_name,
          unit: line.unit,
          warehouseCode: line.warehouse_code,
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
