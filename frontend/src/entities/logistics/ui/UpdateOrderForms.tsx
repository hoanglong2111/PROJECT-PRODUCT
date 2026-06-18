import {
  Alert,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import {
  type DeliveryOrder,
  type LogisticsTask,
  type Priority,
  type TaskStatus,
  updateDeliveryOrder,
  updateLogisticsTask,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { findSupplierByCode, useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';

const priorityValues: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const shippingMethodValues: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
const documentOptions = ['Invoice', 'Packing List', 'B/L', 'CO'];
const taskStatusValues: TaskStatus[] = ['PENDING', 'TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

export function UpdateDeliveryOrderForm({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const queryClient = useQueryClient();
  const { documentLabel, shippingMethodLabel, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const locked = deliveryOrder.order_info.status === 'DELIVERED';
  const {
    currencyOptions,
    incotermOptions,
    shippingMethodOptions: apiShippingMethodOptions,
    supplierOptions,
    suppliers,
  } = useTradeMasterDataOptions();
  const shippingMethodOptions =
    apiShippingMethodOptions.length > 0
      ? apiShippingMethodOptions
      : shippingMethodValues.map((method) => ({ label: shippingMethodLabel(method), value: method }));

  const form = useForm({
    initialValues: {
      actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date ?? '',
      currency: deliveryOrder.finance_tax.currency,
      documentsList: deliveryOrder.logistics_shipping.documents_list,
      etaPlanned: deliveryOrder.logistics_shipping.eta_planned ?? '',
      etdPlanned: deliveryOrder.logistics_shipping.etd_planned ?? '',
      importTaxRate: deliveryOrder.finance_tax.import_tax_rate ?? 0,
      incoterms: deliveryOrder.logistics_shipping.incoterms,
      itemCode: deliveryOrder.sap_integration.actual_item_code ?? '',
      itemName: deliveryOrder.product_details.item_name_requested,
      notes: deliveryOrder.order_info.notes,
      plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date ?? '',
      portOfDeparture: deliveryOrder.logistics_shipping.port_of_departure,
      portOfDestination: deliveryOrder.logistics_shipping.port_of_destination,
      quantity: deliveryOrder.product_details.quantity,
      shippingLine: deliveryOrder.logistics_shipping.shipping_line ?? '',
      shippingMethod: deliveryOrder.logistics_shipping.shipping_method,
      supplierCode: deliveryOrder.sap_integration.supplier_code ?? '',
      supplierName: deliveryOrder.sap_integration.supplier_name ?? '',
      taxAmount: deliveryOrder.finance_tax.tax_amount ?? 0,
      trackingNumber: deliveryOrder.order_info.tracking_number ?? '',
      unit: deliveryOrder.product_details.unit,
      warehouseCode: deliveryOrder.warehouse_tracking.warehouse_code,
      warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
    },
    validate: {
      incoterms: requiredField(t('forms.required')),
      itemCode: requiredField(t('forms.required')),
      itemName: requiredField(t('forms.required')),
      portOfDeparture: requiredField(t('forms.required')),
      portOfDestination: requiredField(t('forms.required')),
      quantity: positiveNumber(t('forms.positiveNumber')),
      unit: requiredField(t('forms.required')),
      warehouseCode: requiredField(t('forms.required')),
      warehouseDeadline: requiredField(t('forms.required')),
    },
  });

  useEffect(() => {
    form.setValues({
      actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date ?? '',
      currency: deliveryOrder.finance_tax.currency,
      documentsList: deliveryOrder.logistics_shipping.documents_list,
      etaPlanned: deliveryOrder.logistics_shipping.eta_planned ?? '',
      etdPlanned: deliveryOrder.logistics_shipping.etd_planned ?? '',
      importTaxRate: deliveryOrder.finance_tax.import_tax_rate ?? 0,
      incoterms: deliveryOrder.logistics_shipping.incoterms,
      itemCode: deliveryOrder.sap_integration.actual_item_code ?? '',
      itemName: deliveryOrder.product_details.item_name_requested,
      notes: deliveryOrder.order_info.notes,
      plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date ?? '',
      portOfDeparture: deliveryOrder.logistics_shipping.port_of_departure,
      portOfDestination: deliveryOrder.logistics_shipping.port_of_destination,
      quantity: deliveryOrder.product_details.quantity,
      shippingLine: deliveryOrder.logistics_shipping.shipping_line ?? '',
      shippingMethod: deliveryOrder.logistics_shipping.shipping_method,
      supplierCode: deliveryOrder.sap_integration.supplier_code ?? '',
      supplierName: deliveryOrder.sap_integration.supplier_name ?? '',
      taxAmount: deliveryOrder.finance_tax.tax_amount ?? 0,
      trackingNumber: deliveryOrder.order_info.tracking_number ?? '',
      unit: deliveryOrder.product_details.unit,
      warehouseCode: deliveryOrder.warehouse_tracking.warehouse_code,
      warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
    });
  }, [deliveryOrder]);

  const mutation = useMutation({
    mutationFn: () =>
      updateDeliveryOrder(deliveryOrder.order_info.order_number, {
        actualEntryDate: toNullable(form.values.actualEntryDate),
        currency: form.values.currency.trim().toUpperCase(),
        documentsList: form.values.documentsList,
        etaPlanned: toNullable(form.values.etaPlanned),
        etdPlanned: toNullable(form.values.etdPlanned),
        importTaxRate: Number(form.values.importTaxRate) || 0,
        incoterms: form.values.incoterms.trim(),
        itemCode: form.values.itemCode.trim(),
        itemName: form.values.itemName.trim(),
        notes: form.values.notes.trim(),
        plannedEntryDate: toNullable(form.values.plannedEntryDate),
        portOfDeparture: form.values.portOfDeparture.trim(),
        portOfDestination: form.values.portOfDestination.trim(),
        quantity: Number(form.values.quantity),
        shippingLine: toNullable(form.values.shippingLine),
        shippingMethod: form.values.shippingMethod,
        supplierCode: toNullable(form.values.supplierCode),
        supplierName: toNullable(form.values.supplierName),
        taxAmount: Number(form.values.taxAmount) || 0,
        trackingNumber: toNullable(form.values.trackingNumber),
        unit: form.values.unit.trim(),
        warehouseCode: form.values.warehouseCode.trim(),
        warehouseDeadline: form.values.warehouseDeadline,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      setEditing(false);
    },
  });

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>{t('forms.updateDo')}</Text>
        <Button size="xs" variant={editing ? 'default' : 'light'} onClick={() => setEditing((value) => !value)} disabled={locked}>
          {editing ? t('common.cancel') : t('common.edit')}
        </Button>
      </Group>

      {locked ? (
        <Alert color="orange">{t('deliveryOrders.lockedAfterCompleted')}</Alert>
      ) : editing ? (
        <form
          onSubmit={form.onSubmit(() => {
            mutation.mutate();
          })}
        >
          <Stack gap="md">
            {mutation.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
              </Alert>
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label={t('forms.itemCode')} {...form.getInputProps('itemCode')} />
              <TextInput label={t('forms.itemName')} {...form.getInputProps('itemName')} />
              <NumberInput label={t('forms.quantity')} min={1} thousandSeparator="," {...form.getInputProps('quantity')} />
              <TextInput label={t('forms.unit')} {...form.getInputProps('unit')} />
              <Select
                label={t('forms.supplierCode')}
                data={supplierOptions}
                searchable
                clearable
                value={form.values.supplierCode}
                onChange={(value) => {
                  const matched = findSupplierByCode(suppliers, value);
                  form.setFieldValue('supplierCode', value || '');
                  if (matched) {
                    form.setFieldValue('supplierName', matched.supplier_name);
                    if (matched.default_currency_code) {
                      form.setFieldValue('currency', matched.default_currency_code);
                    }
                  }
                }}
              />
              <TextInput label={t('forms.supplierName')} {...form.getInputProps('supplierName')} />
              <Select label={t('forms.shippingMethod')} data={shippingMethodOptions} {...form.getInputProps('shippingMethod')} />
              <TextInput label={t('forms.shippingLine')} {...form.getInputProps('shippingLine')} />
              <TextInput label={t('forms.portOfDeparture')} {...form.getInputProps('portOfDeparture')} />
              <TextInput label={t('forms.portOfDestination')} {...form.getInputProps('portOfDestination')} />
              <TextInput label={t('forms.etdPlanned')} type="date" {...form.getInputProps('etdPlanned')} />
              <TextInput label={t('forms.etaPlanned')} type="date" {...form.getInputProps('etaPlanned')} />
              <TextInput label={t('forms.plannedWarehouseEntry')} type="date" {...form.getInputProps('plannedEntryDate')} />
              <TextInput label={t('forms.actualEntryDate')} type="date" {...form.getInputProps('actualEntryDate')} />
              <TextInput label={t('forms.warehouse')} {...form.getInputProps('warehouseCode')} />
              <TextInput label={t('forms.warehouseDeadline')} type="date" {...form.getInputProps('warehouseDeadline')} />
              <Select label={t('forms.incoterms')} data={incotermOptions} searchable clearable {...form.getInputProps('incoterms')} />
              <TextInput label={t('forms.trackingNumber')} {...form.getInputProps('trackingNumber')} />
              <NumberInput label={t('forms.importTaxRate')} min={0} decimalScale={2} suffix="%" {...form.getInputProps('importTaxRate')} />
              <NumberInput label={t('forms.taxAmount')} min={0} thousandSeparator="," {...form.getInputProps('taxAmount')} />
              <Select label={t('forms.currency')} data={currencyOptions} searchable clearable {...form.getInputProps('currency')} />
            </SimpleGrid>

            <Checkbox.Group label={t('forms.documentsReceived')} {...form.getInputProps('documentsList')}>
              <Group mt="xs">
                {documentOptions.map((documentName) => (
                  <Checkbox key={documentName} value={documentName} label={documentLabel(documentName)} />
                ))}
              </Group>
            </Checkbox.Group>

            <Textarea label={t('common.notes')} minRows={3} {...form.getInputProps('notes')} />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t('forms.updateDoHint')}
              </Text>
              <Button type="submit" size="xs" loading={mutation.isPending}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Text size="sm" c="dimmed">
          {t('forms.updateDoHint')}
        </Text>
      )}
    </Paper>
  );
}

export function UpdateTaskProgressForm({
  onUpdated,
  task,
}: {
  onUpdated?: (task: LogisticsTask) => void;
  task: LogisticsTask;
}) {
  const queryClient = useQueryClient();
  const { statusLabel, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const locked = task.status === 'COMPLETED';
  const statusOptions = taskStatusValues.map((status) => ({ label: statusLabel(status), value: status }));

  const form = useForm({
    initialValues: {
      blockedReason: task.blocked_reason ?? '',
      dueDate: task.due_date,
      notes: task.notes,
      progress: task.progress,
      status: task.status,
    },
    validate: {
      dueDate: requiredField(t('forms.required')),
      progress: (value) => (Number(value) >= 0 && Number(value) <= 100 ? null : '0 - 100'),
      status: requiredField(t('forms.required')),
      blockedReason: (value, values) =>
        values.status === 'BLOCKED' && value.trim().length === 0 ? t('forms.required') : null,
    },
  });

  useEffect(() => {
    form.setValues({
      blockedReason: task.blocked_reason ?? '',
      dueDate: task.due_date,
      notes: task.notes,
      progress: task.progress,
      status: task.status,
    });
  }, [task]);

  const mutation = useMutation({
    mutationFn: () =>
      updateLogisticsTask(task.task_id, {
        blockedReason: form.values.blockedReason.trim() || null,
        dueDate: form.values.dueDate,
        notes: form.values.notes.trim(),
        progress: Number(form.values.progress),
        status: form.values.status,
      }),
    onSuccess: async (updatedTask) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalPoStageTasks }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
      ]);
      onUpdated?.(updatedTask);
      setEditing(false);
    },
  });

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Text fw={700}>{t('forms.updateTask')}</Text>
        <Button size="xs" variant={editing ? 'default' : 'light'} onClick={() => setEditing((value) => !value)} disabled={locked}>
          {editing ? t('common.cancel') : t('common.edit')}
        </Button>
      </Group>

      {locked ? (
        <Alert color="orange">{t('tasks.lockedAfterCompleted')}</Alert>
      ) : editing ? (
        <form
          onSubmit={form.onSubmit(() => {
            mutation.mutate();
          })}
        >
          <Stack gap="md">
            {mutation.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
              </Alert>
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <NumberInput label={t('tasks.progress')} min={0} max={100} suffix="%" {...form.getInputProps('progress')} />
              <Select label={t('common.status')} data={statusOptions} {...form.getInputProps('status')} />
              <TextInput label={t('tasks.dueDate')} type="date" {...form.getInputProps('dueDate')} />
              <TextInput label={t('tasks.blockedReason')} {...form.getInputProps('blockedReason')} />
            </SimpleGrid>
            <Textarea label={t('common.notes')} minRows={3} {...form.getInputProps('notes')} />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {t('forms.updateTaskHint')}
              </Text>
              <Button type="submit" size="xs" loading={mutation.isPending}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Text size="sm" c="dimmed">
          {t('forms.updateTaskHint')}
        </Text>
      )}
    </Paper>
  );
}

function requiredField(message: string) {
  return (value: string) => (value.trim().length > 0 ? null : message);
}

function positiveNumber(message: string) {
  return (value: number) => (Number(value) > 0 ? null : message);
}

function toNullable(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}
