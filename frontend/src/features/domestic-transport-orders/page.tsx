import { Alert, Badge, Button, Drawer, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconCircleCheck,
  IconClipboardList,
  IconPlus,
  IconRoute,
  IconSearch,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import {
  fetchDomesticTransportOrder,
  fetchDomesticTransportOrders,
  runDomesticTransportOrderAction,
  updateDomesticTransportOrder,
  type DomesticTransportOrderAction,
  type DomesticTransportOrderStatusV1,
} from '@shared/api/domesticTransportOrders';
import { fetchShipments, type ShipmentRecord } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import { CreateDtoFromShipmentModal } from '../shipments/components/CreateDtoFromShipmentModal';

import {
  PAGE_SIZE,
  fromDateTimeInput,
  getErrorMessage,
  initialForm,
  optionalString,
  statusValues,
  toDateTimeInput,
  type FormState,
} from './model/domesticTransportOrderModel';
import { DomesticTransportOrderDetail } from './components/DomesticTransportOrderDetail';
import { DtoListTable } from './components/DtoListTable';
import { Metric } from './components/Metric';

export function DomesticTransportOrders() {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const { close: closeDtoParam, open: openDtoParam, value: focusedDto } = useEntityParam('dto');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DomesticTransportOrderStatusV1 | ''>('');
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedDtoId, setSelectedDtoId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [dtoModalOpen, setDtoModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    setPage(1);
  }, [search, status, vendorFilter]);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      status: status || undefined,
      truck_vendor_id: vendorFilter || undefined,
    }),
    [page, search, status, vendorFilter],
  );

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setVendorFilter(null);
  };
  const ordersQuery = useQuery({
    queryKey: queryKeys.domesticTransportOrdersList(listParams),
    queryFn: () => fetchDomesticTransportOrders(listParams),
    placeholderData: keepPreviousData,
  });
  const orders = ordersQuery.data?.data ?? [];
  const pagination = ordersQuery.data?.meta.pagination;
  const total = ordersQuery.data?.meta.total ?? orders.length;

  useEffect(() => {
    if (!focusedDto) return;
    const match = orders.find((order) => order.dto_no === focusedDto || order.id === focusedDto);
    if (match) {
      setSelectedDtoId(match.id);
    }
  }, [focusedDto, orders]);

  useEffect(() => {
    if (!selectedDtoId || orders.some((order) => order.id === selectedDtoId)) return;
    setSelectedDtoId(null);
  }, [orders, selectedDtoId]);

  const selectedSummary = orders.find((order) => order.id === selectedDtoId) ?? null;
  const detailQuery = useQuery({
    enabled: Boolean(selectedDtoId),
    queryKey: selectedDtoId
      ? queryKeys.domesticTransportOrderDetail(selectedDtoId)
      : queryKeys.domesticTransportOrderDetail('idle'),
    queryFn: () => fetchDomesticTransportOrder(selectedDtoId ?? ''),
  });
  const selectedOrder = detailQuery.data ?? selectedSummary;

  useEffect(() => {
    if (!selectedOrder) {
      setForm(initialForm);
      return;
    }

    setForm({
      actualDeliveryAt: toDateTimeInput(selectedOrder.actual_delivery_at),
      actualPickupAt: toDateTimeInput(selectedOrder.actual_pickup_at),
      destination: selectedOrder.destination ?? '',
      driverName: selectedOrder.driver_name ?? '',
      driverPhone: selectedOrder.driver_phone ?? '',
      note: selectedOrder.note ?? '',
      origin: selectedOrder.origin ?? '',
      podDocumentRef: selectedOrder.pod_document_ref ?? '',
      quoteAmount: selectedOrder.quote_amount != null ? String(selectedOrder.quote_amount) : '',
      quoteCurrency: selectedOrder.quote_currency ?? '',
      scheduledDeliveryAt: toDateTimeInput(selectedOrder.scheduled_delivery_at),
      scheduledPickupAt: toDateTimeInput(selectedOrder.scheduled_pickup_at),
      truckVendorId: selectedOrder.truck_vendor_id,
      vehiclePlate: selectedOrder.vehicle_plate ?? '',
      vehicleType: selectedOrder.vehicle_type ?? '',
      warehouse: selectedOrder.warehouse ?? '',
    });
  }, [selectedOrder]);

  const availableShipmentsQuery = useQuery({
    queryKey: ['dto-create-eligible-shipments'],
    queryFn: fetchShipments,
  });
  const availableShipments: ShipmentRecord[] = useMemo(
    () => (availableShipmentsQuery.data ?? []).filter((shipment) => shipment.status === 'CUSTOMS_CLEARED'),
    [availableShipmentsQuery.data],
  );
  const selectedShipment = availableShipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;

  useEffect(() => {
    if (availableShipmentsQuery.isLoading || selectedShipmentId) return;
    setSelectedShipmentId(availableShipments[0]?.id ?? null);
  }, [availableShipments, availableShipmentsQuery.isLoading, selectedShipmentId]);

  const truckVendorsQuery = useQuery({
    queryKey: queryKeys.suppliers({ page: 1, limit: 100, role: 'TRUCKING_VENDOR', is_active: true }),
    queryFn: () => fetchSuppliers({ page: 1, limit: 100, role: 'TRUCKING_VENDOR', is_active: true }),
  });
  const truckVendors = truckVendorsQuery.data?.data ?? [];
  const truckVendorOptions = truckVendors.map((supplier) => ({
    label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
    value: supplier.id,
  }));
  const statusOptions = useMemo(
    () =>
      statusValues.map((value) => ({
        label: value ? statusLabel(value) : t('common.allStatuses'),
        value,
      })),
    [statusLabel, t],
  );

  const refreshOrder = (id = selectedDtoId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderLists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderDetail(id) });
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrder) throw new Error(t('domesticTransportOrders.selectDtoFirst'));
      return updateDomesticTransportOrder(selectedOrder.id, {
        actual_delivery_at: fromDateTimeInput(form.actualDeliveryAt),
        actual_pickup_at: fromDateTimeInput(form.actualPickupAt),
        destination: optionalString(form.destination),
        driver_name: optionalString(form.driverName),
        driver_phone: optionalString(form.driverPhone),
        note: optionalString(form.note),
        origin: optionalString(form.origin),
        pod_document_ref: optionalString(form.podDocumentRef),
        quote_amount: form.quoteAmount.trim() ? Number(form.quoteAmount) : null,
        quote_currency: optionalString(form.quoteCurrency),
        scheduled_delivery_at: fromDateTimeInput(form.scheduledDeliveryAt),
        scheduled_pickup_at: fromDateTimeInput(form.scheduledPickupAt),
        truck_vendor_id: form.truckVendorId,
        vehicle_plate: optionalString(form.vehiclePlate),
        vehicle_type: optionalString(form.vehicleType),
        warehouse: optionalString(form.warehouse),
      });
    },
    onSuccess: (updated) => refreshOrder(updated.id),
  });

  const actionMutation = useMutation({
    mutationFn: (action: DomesticTransportOrderAction) => {
      if (!selectedOrder) throw new Error(t('domesticTransportOrders.selectDtoFirst'));
      return runDomesticTransportOrderAction(selectedOrder.id, action);
    },
    onSuccess: (updated) => refreshOrder(updated.id),
  });

  const counts = useMemo(
    () => ({
      active: orders.filter((order) => !['CLOSED', 'CANCELLED'].includes(order.status)).length,
      closed: orders.filter((order) => order.status === 'CLOSED').length,
      dispatched: orders.filter((order) => ['DISPATCHED', 'IN_TRANSIT'].includes(order.status)).length,
      total,
    }),
    [orders, total],
  );

  if (ordersQuery.isError) {
    return (
      <PageError
        title={t('domesticTransportOrders.errorTitle')}
        description={t('domesticTransportOrders.errorDescription')}
        error={ordersQuery.error}
        onRetry={() => void ordersQuery.refetch()}
      />
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <PageLoading
        title={t('domesticTransportOrders.title')}
        description={t('domesticTransportOrders.loadingDescription')}
        metricCount={4}
        tableColumns={['DTO', t('domesticTransportOrders.shipment'), t('domesticTransportOrders.vendor'), t('domesticTransportOrders.route'), t('common.status')]}
      />
    );
  }

  return (
    <Stack gap="lg" className="dto-page">
      <Paper withBorder p="lg" className="dto-page-hero">
        <Group justify="space-between" align="flex-start" gap="lg" className="dto-page-header dl-page-header">
          <div className="dto-title-block dl-page-title-block">
            <Badge leftSection={<IconTruckDelivery size={14} />} variant="light" mb="xs">
              {t('domesticTransportOrders.kicker')}
            </Badge>
            <Title order={1} className="dto-page-title">{t('domesticTransportOrders.title')}</Title>
            <Text c="dimmed" mt={6} maw={760}>
              {t('domesticTransportOrders.subtitle')}
            </Text>
          </div>
          <Group gap="xs" className="dto-page-actions dl-page-actions">
            <Button
              leftSection={<IconPlus size={16} />}
              disabled={!selectedShipment || availableShipmentsQuery.isLoading}
              onClick={() => setDtoModalOpen(true)}
            >
              {t('domesticTransportOrders.create')}
            </Button>
          </Group>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} className="dto-metric-grid dl-metrics-strip">
        <Metric label={t('domesticTransportOrders.metricTotal')} value={counts.total} color="gray" icon={<IconClipboardList size={22} />} />
        <Metric label={t('domesticTransportOrders.metricActive')} value={counts.active} color="blue" icon={<IconTruckDelivery size={22} />} />
        <Metric label={t('domesticTransportOrders.metricDispatched')} value={counts.dispatched} color="cyan" icon={<IconRoute size={22} />} />
        <Metric label={t('domesticTransportOrders.metricClosed')} value={counts.closed} color="teal" icon={<IconCircleCheck size={22} />} />
      </SimpleGrid>

      <Paper withBorder p="md" className="dto-filter-panel dl-filter-panel">
        <div className="dto-filter-grid dl-filter-row">
          <TextInput
            className="dto-filter-search dl-filter-search"
            label={t('common.search')}
            placeholder={t('domesticTransportOrders.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label={t('common.status')}
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus((value as DomesticTransportOrderStatusV1 | null) ?? '')}
          />
          <Select
            label={t('domesticTransportOrders.truckVendor')}
            placeholder={t('domesticTransportOrders.allVendors')}
            data={truckVendorOptions}
            value={vendorFilter}
            onChange={setVendorFilter}
            searchable
            clearable
            nothingFoundMessage={truckVendorsQuery.isLoading ? t('domesticTransportOrders.loadingVendors') : t('domesticTransportOrders.noVendor')}
          />
          <Select
            label={t('domesticTransportOrders.createFromShipment')}
            searchable
            data={availableShipments.map((shipment) => ({
              label: `${shipment.shipment_number} - ${shipment.origin_port || '-'} ${t('deliveryOrders.routeConnector')} ${shipment.dest_port || '-'}`,
              value: shipment.id,
            }))}
            value={selectedShipmentId}
            onChange={setSelectedShipmentId}
            nothingFoundMessage={availableShipmentsQuery.isLoading ? t('domesticTransportOrders.loadingShipments') : t('domesticTransportOrders.noCustomsClearedShipment')}
          />
          <Group align="flex-end" gap="xs" className="dto-filter-actions dl-filter-actions">
            <Button
              leftSection={<IconX size={16} />}
              variant="subtle"
              onClick={clearFilters}
            >
              {t('common.clear')}
            </Button>
          </Group>
        </div>
      </Paper>

      <DtoListTable
        onSelect={(order) => {
          setSelectedDtoId(order.id);
          openDtoParam(order.dto_no);
        }}
        orders={orders}
        page={page}
        pageCount={pagination?.totalPages ?? 1}
        selectedDtoId={selectedDtoId}
        setPage={setPage}
        total={total}
      />

      <Drawer
        classNames={{
          body: 'dto-detail-drawer-body',
          content: 'dto-detail-drawer-content',
          header: 'dto-detail-drawer-header',
        }}
        opened={Boolean(selectedDtoId)}
        onClose={() => {
          setSelectedDtoId(null);
          closeDtoParam();
        }}
        position="right"
        size="min(94vw, 58rem)"
        withCloseButton={false}
      >
        {selectedOrder ? (
          <DomesticTransportOrderDetail
            actionPending={actionMutation.isPending}
            form={form}
            isFetching={detailQuery.isFetching}
            onAction={(action) => actionMutation.mutate(action)}
            onChange={setForm}
            onClose={() => {
              setSelectedDtoId(null);
              closeDtoParam();
            }}
            onSave={() => updateMutation.mutate()}
            order={selectedOrder}
            saving={updateMutation.isPending}
            truckVendorOptions={truckVendorOptions}
          />
        ) : null}
      </Drawer>

      {updateMutation.isError || actionMutation.isError ? (
        <Alert color="red" icon={<IconX size={18} />} className="dto-error-alert">
          {getErrorMessage(updateMutation.error ?? actionMutation.error, t('domesticTransportOrders.requestFailed'))}
        </Alert>
      ) : null}

      <CreateDtoFromShipmentModal
        opened={dtoModalOpen}
        shipments={selectedShipment ? [selectedShipment] : []}
        onClose={() => setDtoModalOpen(false)}
        onCreated={() => {
          refreshOrder();
          void ordersQuery.refetch();
          setSelectedShipmentId(null);
        }}
      />
    </Stack>
  );
}
