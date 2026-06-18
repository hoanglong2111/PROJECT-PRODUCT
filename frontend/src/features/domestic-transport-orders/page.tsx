import { Alert, Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconRefresh, IconSearch, IconTruck, IconX } from '@tabler/icons-react';
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
import { EmptyState } from '@shared/components/EmptyState';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useEntityParam } from '@shared/hooks/useEntityParam';

import { CreateDtoFromShipmentModal } from '../shipments/components/CreateDtoFromShipmentModal';

import {
  PAGE_SIZE,
  fromDateTimeInput,
  getErrorMessage,
  initialForm,
  optionalString,
  statusOptions,
  toDateTimeInput,
  type FormState,
} from './model/domesticTransportOrderModel';
import { DomesticTransportOrderDetail } from './components/DomesticTransportOrderDetail';
import { DtoListTable } from './components/DtoListTable';
import { Metric } from './components/Metric';

export function DomesticTransportOrders() {
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
    if (selectedDtoId && orders.some((order) => order.id === selectedDtoId)) return;
    setSelectedDtoId(orders[0]?.id ?? null);
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

  const refreshOrder = (id = selectedDtoId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderLists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderDetail(id) });
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrder) throw new Error('Select a DTO first');
      return updateDomesticTransportOrder(selectedOrder.id, {
        actual_delivery_at: fromDateTimeInput(form.actualDeliveryAt),
        actual_pickup_at: fromDateTimeInput(form.actualPickupAt),
        destination: optionalString(form.destination),
        driver_name: optionalString(form.driverName),
        driver_phone: optionalString(form.driverPhone),
        note: optionalString(form.note),
        origin: optionalString(form.origin),
        pod_document_ref: optionalString(form.podDocumentRef),
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
      if (!selectedOrder) throw new Error('Select a DTO first');
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
        title="Could not load Domestic Transport Orders"
        description="KBFE could not load DTO data from the mock API."
        error={ordersQuery.error}
        onRetry={() => void ordersQuery.refetch()}
      />
    );
  }

  if (ordersQuery.isLoading) {
    return (
      <PageLoading
        title="Domestic Transport Orders"
        description="Loading inland trucking orders, shipment links, vendor data, and item lines."
        metricCount={4}
        tableColumns={['DTO', 'Shipment', 'Vendor', 'Route', 'Status']}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Domestic Transport Orders</Title>
          <Text c="dimmed" mt={4}>
            Track inland trucking from customs-cleared shipment to warehouse POD and closure.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            leftSection={<IconX size={16} />}
            variant="subtle"
            onClick={clearFilters}
          >
            Clear
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            loading={ordersQuery.isFetching}
            onClick={() => void ordersQuery.refetch()}
          >
            Refresh
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 4 }}>
        <Metric label="Total DTO" value={counts.total} />
        <Metric label="Active" value={counts.active} />
        <Metric label="Dispatched" value={counts.dispatched} />
        <Metric label="Closed" value={counts.closed} />
      </SimpleGrid>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
          <TextInput
            label="Search"
            placeholder="DTO, shipment, vendor, driver, route"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            label="Status"
            data={statusOptions}
            value={status}
            onChange={(value) => setStatus((value as DomesticTransportOrderStatusV1 | null) ?? '')}
          />
          <Select
            label="Truck vendor"
            placeholder="All vendors"
            data={truckVendorOptions}
            value={vendorFilter}
            onChange={setVendorFilter}
            searchable
            clearable
            nothingFoundMessage={truckVendorsQuery.isLoading ? 'Loading vendors...' : 'No vendor'}
          />
          <Select
            label="Create from shipment"
            searchable
            data={availableShipments.map((shipment) => ({
              label: `${shipment.shipment_number} - ${shipment.origin_port || '-'} to ${shipment.dest_port || '-'}`,
              value: shipment.id,
            }))}
            value={selectedShipmentId}
            onChange={setSelectedShipmentId}
            nothingFoundMessage={availableShipmentsQuery.isLoading ? 'Loading shipments...' : 'No customs-cleared shipment'}
          />
          <Group align="flex-end">
            <Button
              leftSection={<IconTruck size={16} />}
              disabled={!selectedShipment || availableShipmentsQuery.isLoading}
              onClick={() => setDtoModalOpen(true)}
            >
              Create DTO
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg" style={{ alignItems: 'start' }}>
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
        ) : (
          <Paper withBorder p="lg">
            <EmptyState title="Select a DTO" description="Choose a domestic transport order to inspect route, vehicle, POD, and item lines." />
          </Paper>
        )}
      </SimpleGrid>

      {updateMutation.isError || actionMutation.isError ? (
        <Alert color="red" icon={<IconX size={18} />}>
          {getErrorMessage(updateMutation.error ?? actionMutation.error)}
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
