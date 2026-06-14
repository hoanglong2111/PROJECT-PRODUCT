import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconCheck,
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconTruck,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import {
  createDomesticTransportOrderFromShipment,
  fetchDomesticTransportOrder,
  fetchDomesticTransportOrders,
  runDomesticTransportOrderAction,
  updateDomesticTransportOrder,
  type DomesticTransportOrderAction,
  type DomesticTransportOrderStatusV1,
  type DomesticTransportOrderV1,
} from '@shared/api/domesticTransportOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchShipmentsV1 } from '@shared/api/shipments';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { EntityLink } from '@shared/components/EntityLink';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useEntityParam } from '@shared/hooks/useEntityParam';

type FormState = {
  actualDeliveryAt: string;
  actualPickupAt: string;
  destination: string;
  driverName: string;
  driverPhone: string;
  note: string;
  origin: string;
  podDocumentRef: string;
  scheduledDeliveryAt: string;
  scheduledPickupAt: string;
  truckVendorId: string | null;
  vehiclePlate: string;
  vehicleType: string;
  warehouse: string;
};

const statusOptions: Array<{ label: string; value: DomesticTransportOrderStatusV1 | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Quote pending', value: 'QUOTE_PENDING' },
  { label: 'Quoted', value: 'QUOTED' },
  { label: 'Quote confirmed', value: 'QUOTE_CONFIRMED' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'In transit', value: 'IN_TRANSIT' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'POD received', value: 'POD_RECEIVED' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PAGE_SIZE = 20;

const initialForm: FormState = {
  actualDeliveryAt: '',
  actualPickupAt: '',
  destination: '',
  driverName: '',
  driverPhone: '',
  note: '',
  origin: '',
  podDocumentRef: '',
  scheduledDeliveryAt: '',
  scheduledPickupAt: '',
  truckVendorId: null,
  vehiclePlate: '',
  vehicleType: '',
  warehouse: '',
};

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text className="metric-label" size="xs" fw={700} tt="uppercase">
        {label}
      </Text>
      <Title order={1} fw={800} c="teal" style={{ lineHeight: 1.1 }}>
        {value}
      </Title>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" fw={700} tt="uppercase">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}

export function DomesticTransportOrders() {
  const queryClient = useQueryClient();
  const { close: closeDtoParam, open: openDtoParam, value: focusedDto } = useEntityParam('dto');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DomesticTransportOrderStatusV1 | ''>('');
  const [page, setPage] = useState(1);
  const [selectedDtoId, setSelectedDtoId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [createNote, setCreateNote] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const listParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );
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
    queryKey: queryKeys.shipmentsList({ status: 'CUSTOMS_CLEARED', page: 1, limit: 100 }),
    queryFn: () => fetchShipmentsV1({ status: 'CUSTOMS_CLEARED', page: 1, limit: 100 }),
  });
  const availableShipments = availableShipmentsQuery.data?.data ?? [];

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

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedShipmentId) throw new Error('Select a customs-cleared shipment first');
      return createDomesticTransportOrderFromShipment(selectedShipmentId, {
        note: createNote || null,
      });
    },
    onSuccess: (created) => {
      setSelectedDtoId(created.id);
      openDtoParam(created.dto_no);
      setSelectedShipmentId(null);
      setCreateNote('');
      refreshOrder(created.id);
    },
  });

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
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          loading={ordersQuery.isFetching}
          onClick={() => void ordersQuery.refetch()}
        >
          Refresh
        </Button>
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
            label="Create from shipment"
            searchable
            clearable
            data={availableShipments.map((shipment) => ({
              label: `${shipment.shipment_no} - ${shipment.pol ?? '-'} to ${shipment.pod ?? '-'}`,
              value: shipment.id,
            }))}
            value={selectedShipmentId}
            onChange={setSelectedShipmentId}
            nothingFoundMessage={availableShipmentsQuery.isLoading ? 'Loading shipments...' : 'No customs-cleared shipment'}
          />
          <TextInput
            label="Create note"
            placeholder="Optional dispatch note"
            value={createNote}
            onChange={(event) => setCreateNote(event.currentTarget.value)}
          />
          <Group align="flex-end">
            <Button
              leftSection={<IconTruck size={16} />}
              disabled={!selectedShipmentId}
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create DTO
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="lg" style={{ alignItems: 'start' }}>
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={900} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>DTO</Table.Th>
                  <Table.Th>Shipment</Table.Th>
                  <Table.Th>Vendor</Table.Th>
                  <Table.Th>Pickup</Table.Th>
                  <Table.Th>Delivery</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Open</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {orders.map((order) => (
                  <Table.Tr
                    key={order.id}
                    bg={order.id === selectedDtoId ? 'var(--mantine-color-blue-light)' : undefined}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedDtoId(order.id);
                      openDtoParam(order.dto_no);
                    }}
                  >
                    <Table.Td>
                      <Text fw={700}>{order.dto_no}</Text>
                      <Text size="xs" c="dimmed">{order.vehicle_plate ?? order.vehicle_type ?? '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{order.shipment?.shipment_no ?? order.shipment_id}</Text>
                      <Text size="xs" c="dimmed">{formatContainers(order.shipment?.container_no)}</Text>
                    </Table.Td>
                    <Table.Td>{order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-'}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{order.origin ?? '-'}</Text>
                      <Text size="xs" c="dimmed">{formatDateTime(order.scheduled_pickup_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{order.destination ?? '-'}</Text>
                      <Text size="xs" c="dimmed">{formatDateTime(order.scheduled_delivery_at)}</Text>
                    </Table.Td>
                    <Table.Td><StatusBadge status={order.status} /></Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Tooltip label="Open DTO detail">
                          <ActionIcon
                            aria-label="Open DTO detail"
                            variant="subtle"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedDtoId(order.id);
                              openDtoParam(order.dto_no);
                            }}
                          >
                            <IconExternalLink size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <ListPagination
            page={page}
            pageCount={pagination?.totalPages ?? 1}
            pageEnd={Math.min(total, page * PAGE_SIZE)}
            pageStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
            setPage={setPage}
            total={total}
          />
          {orders.length === 0 ? (
            <EmptyState title="No DTO found" description="No domestic transport order matches the current filters." />
          ) : null}
        </Paper>

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

      {createMutation.isError || updateMutation.isError || actionMutation.isError ? (
        <Alert color="red" icon={<IconX size={18} />}>
          {getErrorMessage(createMutation.error ?? updateMutation.error ?? actionMutation.error)}
        </Alert>
      ) : null}
    </Stack>
  );
}

function DomesticTransportOrderDetail({
  actionPending,
  form,
  isFetching,
  onAction,
  onChange,
  onClose,
  onSave,
  order,
  saving,
  truckVendorOptions,
}: {
  actionPending: boolean;
  form: FormState;
  isFetching: boolean;
  onAction: (action: DomesticTransportOrderAction) => void;
  onChange: (form: FormState) => void;
  onClose: () => void;
  onSave: () => void;
  order: DomesticTransportOrderV1;
  saving: boolean;
  truckVendorOptions: Array<{ label: string; value: string }>;
}) {
  const isClosed = ['CLOSED', 'CANCELLED'].includes(order.status);

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Title order={3}>{order.dto_no}</Title>
                <StatusBadge status={order.status} />
                {isFetching ? <Loader size="xs" /> : null}
              </Group>
              <Text size="sm" c="dimmed">
                {order.origin ?? '-'} to {order.destination ?? '-'} · {order.warehouse ?? '-'}
              </Text>
            </div>
            <Group gap="xs">
              {order.shipment ? <EntityLink compact id={order.shipment.shipment_no} type="shp" /> : null}
              <Tooltip label="Close detail">
                <ActionIcon aria-label="Close DTO detail" variant="subtle" onClick={onClose}>
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Info label="Shipment" value={order.shipment?.shipment_no ?? order.shipment_id} />
            <Info label="Truck vendor" value={order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-'} />
            <Info label="Carrier DO" value={order.carrier_delivery_order?.carrier_do_no ?? order.carrier_delivery_order_id ?? '-'} />
            <Info label="Total qty" value={formatNumber(order.total_qty)} />
            <Info label="Gross weight kg" value={formatNumber(order.total_gross_weight_kg)} />
            <Info label="POD" value={order.pod_document_ref ?? '-'} />
          </SimpleGrid>

          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              disabled={isClosed || order.status !== 'DRAFT'}
              loading={actionPending}
              onClick={() => onAction('quote-pending')}
            >
              Quote pending
            </Button>
            <Button
              size="xs"
              variant="light"
              disabled={isClosed || !['QUOTE_PENDING', 'QUOTED'].includes(order.status)}
              loading={actionPending}
              onClick={() => onAction('confirm-quote')}
            >
              Confirm quote
            </Button>
            <Button
              size="xs"
              color="blue"
              disabled={isClosed || order.status !== 'QUOTE_CONFIRMED'}
              loading={actionPending}
              onClick={() => onAction('dispatch')}
            >
              Dispatch
            </Button>
            <Button
              size="xs"
              color="cyan"
              disabled={isClosed || order.status !== 'DISPATCHED'}
              loading={actionPending}
              onClick={() => onAction('start-transit')}
            >
              Start transit
            </Button>
            <Button
              size="xs"
              color="teal"
              disabled={isClosed || order.status !== 'IN_TRANSIT'}
              loading={actionPending}
              onClick={() => onAction('deliver')}
            >
              Deliver
            </Button>
            <Button
              size="xs"
              color="teal"
              variant="light"
              disabled={isClosed || !['DELIVERED', 'POD_RECEIVED'].includes(order.status)}
              loading={actionPending}
              onClick={() => onAction('close')}
            >
              Close
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              disabled={isClosed}
              loading={actionPending}
              onClick={() => onAction('cancel')}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={700}>Dispatch and POD data</Text>
              <Text size="sm" c="dimmed">Update vendor, vehicle, driver, planned/actual delivery, and POD reference.</Text>
            </div>
            <Button leftSection={<IconCheck size={16} />} loading={saving} disabled={isClosed} onClick={onSave}>
              Save
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Select
              label="Truck vendor"
              searchable
              clearable
              data={truckVendorOptions}
              value={form.truckVendorId}
              disabled={isClosed}
              onChange={(value) => onChange({ ...form, truckVendorId: value })}
            />
            <TextInput
              label="Vehicle type"
              value={form.vehicleType}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, vehicleType: event.currentTarget.value })}
            />
            <TextInput
              label="Vehicle plate"
              value={form.vehiclePlate}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, vehiclePlate: event.currentTarget.value })}
            />
            <TextInput
              label="Driver"
              value={form.driverName}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, driverName: event.currentTarget.value })}
            />
            <TextInput
              label="Driver phone"
              value={form.driverPhone}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, driverPhone: event.currentTarget.value })}
            />
            <TextInput
              label="POD document"
              value={form.podDocumentRef}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, podDocumentRef: event.currentTarget.value })}
            />
            <TextInput
              label="Origin"
              value={form.origin}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, origin: event.currentTarget.value })}
            />
            <TextInput
              label="Destination"
              value={form.destination}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, destination: event.currentTarget.value })}
            />
            <TextInput
              label="Warehouse"
              value={form.warehouse}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, warehouse: event.currentTarget.value })}
            />
            <TextInput
              label="Scheduled pickup"
              type="datetime-local"
              value={form.scheduledPickupAt}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, scheduledPickupAt: event.currentTarget.value })}
            />
            <TextInput
              label="Actual pickup"
              type="datetime-local"
              value={form.actualPickupAt}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, actualPickupAt: event.currentTarget.value })}
            />
            <TextInput
              label="Scheduled delivery"
              type="datetime-local"
              value={form.scheduledDeliveryAt}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, scheduledDeliveryAt: event.currentTarget.value })}
            />
            <TextInput
              label="Actual delivery"
              type="datetime-local"
              value={form.actualDeliveryAt}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, actualDeliveryAt: event.currentTarget.value })}
            />
            <TextInput
              label="Note"
              value={form.note}
              disabled={isClosed}
              onChange={(event) => onChange({ ...form, note: event.currentTarget.value })}
            />
          </SimpleGrid>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text fw={700}>DTO lines</Text>
              <Text size="sm" c="dimmed">Lines are copied from shipment lines and enriched by item, PO line, LOT, HS code, and weight.</Text>
            </div>
            <Badge variant="light">{order.lines?.length ?? 0} lines</Badge>
          </Group>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={860} verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item</Table.Th>
                  <Table.Th>LOT</Table.Th>
                  <Table.Th>HS</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>DTO qty</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>PO qty</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Gross kg</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(order.lines ?? []).map((line) => (
                  <Table.Tr key={line.id}>
                    <Table.Td>
                      <Text fw={600}>{line.item_name ?? line.item_description ?? line.item_id ?? '-'}</Text>
                      <Text size="xs" c="dimmed">{line.item_code ?? line.unit ?? '-'}</Text>
                    </Table.Td>
                    <Table.Td>{line.lot_no ?? line.po_lot_id ?? '-'}</Table.Td>
                    <Table.Td>{line.hs_code ?? '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {formatNumber(line.qty)} {line.unit ?? ''}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatNumber(line.qty_ordered)}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{formatNumber(line.gross_weight_kg)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {(order.lines ?? []).length === 0 ? (
            <EmptyState title="No DTO lines" description="This domestic transport order has no copied shipment lines yet." />
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

function optionalString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return number.toLocaleString();
}

function formatContainers(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  return value || '-';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Request failed';
}
