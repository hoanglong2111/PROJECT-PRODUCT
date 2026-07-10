import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconAlertTriangle, IconPencil } from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';

import {
  type DeliveryOrder,
  type LogisticsTask,
  type TaskStatus,
  updateDeliveryOrder,
  updateLogisticsTask,
} from '@shared/api/logistics';
import { DateTimeField } from '@shared/components/DateField';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { findSupplierByCode, useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { ModalTitle } from '@shared/components/ModalTitle';

const shippingMethodValues: Array<DeliveryOrder['logistics_shipping']['shipping_method']> = ['SEA', 'AIR', 'ROAD'];
const documentOptions = ['Invoice', 'Packing List', 'B/L', 'CO'];
const taskStatusValues: TaskStatus[] = ['PENDING', 'TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'COMPLETED', 'CANCELLED'];

export function UpdateDeliveryOrderForm({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const queryClient = useQueryClient();
  const { documentLabel, shippingMethodLabel, t } = useI18n();
  const [drawerOpened, { open, close }] = useDisclosure(false);
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
      close();
    },
  });

  const receivedDocuments =
    form.values.documentsList.length > 0 ? form.values.documentsList.map((documentName) => documentLabel(documentName)).join(', ') : '-';

  return (
    <Paper withBorder p="md" className="delivery-order-update-panel">
      <Group justify="space-between" align="flex-start" gap="md" mb="sm" className="delivery-order-update-header">
        <div>
          <Text fw={700}>{t('forms.updateDo')}</Text>
          <Text size="sm" c="dimmed">
            {t('forms.updateDoHint')}
          </Text>
        </div>
        <Button size="xs" variant="light" onClick={open} disabled={locked}>
          {t('common.edit')}
        </Button>
      </Group>

      {locked ? <Alert color="orange" mb="md">{t('deliveryOrders.lockedAfterCompleted')}</Alert> : null}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="delivery-order-update-readonly-grid">
        <UpdateFact label={t('forms.itemCode')} value={form.values.itemCode || '-'} />
        <UpdateFact label={t('forms.supplierName')} value={form.values.supplierName || '-'} />
        <UpdateFact
          label={t('common.route')}
          value={`${form.values.portOfDeparture || '-'} ${t('deliveryOrders.routeConnector')} ${form.values.portOfDestination || '-'}`}
        />
        <UpdateFact label={t('common.documents')} value={receivedDocuments} />
      </SimpleGrid>

      <Drawer
        opened={drawerOpened}
        onClose={close}
        position="right"
        size="lg"
        title={
          <ModalTitle
            feature="delivery-orders"
            icon={<IconPencil size={18} />}
            title={t('forms.updateDo')}
            subtitle={deliveryOrder.order_info.order_number}
          />
        }
      >
        <form
          onSubmit={form.onSubmit(() => {
            mutation.mutate();
          })}
        >
          <Stack gap="md" className="delivery-order-update-form">
            {mutation.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
              </Alert>
            ) : null}

            <SimpleGrid cols={1} spacing="md" className="delivery-order-update-section-grid">
              <Paper withBorder p="md" className="delivery-order-update-section">
                <Text fw={700} mb="sm">
                  {t('deliveryOrders.supplierAllocationHeader')}
                </Text>
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
                </SimpleGrid>
              </Paper>

              <Paper withBorder p="md" className="delivery-order-update-section">
                <Text fw={700} mb="sm">
                  {t('common.route')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select label={t('forms.shippingMethod')} data={shippingMethodOptions} {...form.getInputProps('shippingMethod')} />
                  <TextInput label={t('forms.shippingLine')} {...form.getInputProps('shippingLine')} />
                  <TextInput label={t('forms.portOfDeparture')} {...form.getInputProps('portOfDeparture')} />
                  <TextInput label={t('forms.portOfDestination')} {...form.getInputProps('portOfDestination')} />
                  <DateTimeField label={t('forms.etdPlanned')} {...form.getInputProps('etdPlanned')} />
                  <DateTimeField label={t('forms.etaPlanned')} {...form.getInputProps('etaPlanned')} />
                </SimpleGrid>
              </Paper>

              <Paper withBorder p="md" className="delivery-order-update-section">
                <Text fw={700} mb="sm">
                  {t('forms.warehouse')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <DateTimeField label={t('forms.plannedWarehouseEntry')} {...form.getInputProps('plannedEntryDate')} />
                  <DateTimeField label={t('forms.actualEntryDate')} {...form.getInputProps('actualEntryDate')} />
                  <TextInput label={t('forms.warehouse')} {...form.getInputProps('warehouseCode')} />
                  <DateTimeField label={t('forms.warehouseDeadline')} {...form.getInputProps('warehouseDeadline')} />
                </SimpleGrid>
              </Paper>

              <Paper withBorder p="md" className="delivery-order-update-section">
                <Text fw={700} mb="sm">
                  {t('common.documents')}
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select label={t('forms.incoterms')} data={incotermOptions} searchable clearable {...form.getInputProps('incoterms')} />
                  <TextInput label={t('forms.trackingNumber')} {...form.getInputProps('trackingNumber')} />
                  <NumberInput label={t('forms.importTaxRate')} min={0} decimalScale={2} suffix="%" {...form.getInputProps('importTaxRate')} />
                  <NumberInput label={t('forms.taxAmount')} min={0} thousandSeparator="," {...form.getInputProps('taxAmount')} />
                  <Select label={t('forms.currency')} data={currencyOptions} searchable clearable {...form.getInputProps('currency')} />
                </SimpleGrid>
                <Checkbox.Group label={t('forms.documentsReceived')} mt="md" {...form.getInputProps('documentsList')}>
                  <Group mt="xs" className="delivery-order-document-checks">
                    {documentOptions.map((documentName) => (
                      <Checkbox key={documentName} value={documentName} label={documentLabel(documentName)} />
                    ))}
                  </Group>
                </Checkbox.Group>
              </Paper>
            </SimpleGrid>

            <Textarea label={t('common.notes')} minRows={3} {...form.getInputProps('notes')} />
            <Group justify="flex-end" gap="xs">
              <Button type="button" variant="subtle" size="xs" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" size="xs" loading={mutation.isPending}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Drawer>
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
    <Paper withBorder p="md" className="task-progress-update-panel">
      <Group justify="space-between" align="flex-start" gap="md" mb="sm" className="task-progress-update-header">
        <div>
          <Text fw={700}>{t('forms.updateTask')}</Text>
          <Text size="sm" c="dimmed">
            {t('forms.updateTaskHint')}
          </Text>
        </div>
        <Group gap="xs" wrap="nowrap">
          <Badge variant="light">{task.progress}%</Badge>
          <Button size="xs" variant={editing ? 'default' : 'light'} onClick={() => setEditing(!editing)} disabled={locked}>
            {editing ? t('common.cancel') : t('common.edit')}
          </Button>
        </Group>
      </Group>

      <Progress value={task.progress} size="sm" radius="xl" mb="md" className="task-progress-bar" />

      {locked ? <Alert color="orange">{t('tasks.lockedAfterCompleted')}</Alert> : null}

      {!locked && editing ? (
        <form
          onSubmit={form.onSubmit(() => {
            mutation.mutate();
          })}
        >
          <Stack gap="md" className="task-progress-update-form">
            {mutation.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {getApiErrorMessage(mutation.error, t('forms.apiUnknownError'))}
              </Alert>
            ) : null}

            <SimpleGrid cols={{ base: 1, sm: 2 }} className="task-progress-fields">
              <NumberInput label={t('tasks.progress')} min={0} max={100} suffix="%" {...form.getInputProps('progress')} />
              <Select label={t('common.status')} data={statusOptions} {...form.getInputProps('status')} />
              <DateTimeField label={t('tasks.dueDate')} {...form.getInputProps('dueDate')} />
              <TextInput label={t('tasks.blockedReason')} {...form.getInputProps('blockedReason')} />
            </SimpleGrid>
            <Textarea label={t('common.notes')} minRows={3} {...form.getInputProps('notes')} />
            <Group justify="flex-end">
              <Button type="submit" size="xs" loading={mutation.isPending}>
                {t('common.save')}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" mt={locked ? 'md' : undefined} className="task-progress-readonly-grid">
          <TaskProgressFact label={t('common.status')} value={<Badge variant="light">{statusLabel(task.status)}</Badge>} />
          <TaskProgressFact label={t('tasks.progress')} value={`${task.progress}%`} />
          <TaskProgressFact label={t('tasks.dueDate')} value={task.due_date || '-'} />
          <TaskProgressFact label={t('tasks.blockedReason')} value={task.blocked_reason || '-'} />
        </SimpleGrid>
      )}
    </Paper>
  );
}

function UpdateFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="delivery-order-update-fact">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={600} component="div">
        {value}
      </Text>
    </div>
  );
}

function TaskProgressFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="task-progress-fact">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={600} component="div">
        {value}
      </Text>
    </div>
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
