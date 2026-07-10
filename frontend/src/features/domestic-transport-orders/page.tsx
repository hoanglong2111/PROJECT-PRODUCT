import { Button, Drawer, Group, Paper, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
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
  fetchDomesticTransportOrders,
  type DomesticTransportOrderStatusV1,
} from '@shared/api/domesticTransportOrders';
import { fetchShipments, type ShipmentRecord } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchForwarders } from '@shared/api/forwarders';
import { Metric } from '@shared/components/Metric';
import { ModalTitle } from '@shared/components/ModalTitle';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import { CreateDtoFromShipmentPanel } from '../shipments/components/CreateDtoFromShipmentPanel';

import { PAGE_SIZE, statusValues } from './model/domesticTransportOrderModel';
import { DtoDetailDrawer } from './components/DtoDetailDrawer';
import { DtoListTable } from './components/DtoListTable';

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
    queryKey: queryKeys.forwarders({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchForwarders({ page: 1, limit: 100, is_active: true }),
  });
  const truckVendors = (truckVendorsQuery.data?.data ?? []).filter(
    (forwarder) => forwarder.forwarder_type === 'TRUCKING' || forwarder.forwarder_type === 'MULTI',
  );
  const truckVendorOptions = truckVendors.map((forwarder) => ({
    label: `${forwarder.forwarder_code} - ${forwarder.forwarder_name}`,
    value: forwarder.id,
  }));
  const statusOptions = useMemo(
    () =>
      statusValues.map((value) => ({
        label: value ? statusLabel(value) : t('common.allStatuses'),
        value,
      })),
    [statusLabel, t],
  );

  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderLists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders });
  };

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
      <PageHeader
        className="dto-page-header"
        titleClassName="dto-title-block"
        actionsClassName="dto-page-actions"
        icon={<IconTruckDelivery size={20} />}
        title={t('domesticTransportOrders.title')}
        subtitle={t('domesticTransportOrders.subtitle')}
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            disabled={!selectedShipment || availableShipmentsQuery.isLoading}
            onClick={() => setDtoModalOpen(true)}
          >
            {t('domesticTransportOrders.create')}
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} className="dto-metric-grid dl-metrics-strip">
        <Metric className="dto-metric-card dto-metric-card-gray" valueClassName="dto-metric-value" label={t('domesticTransportOrders.metricTotal')} value={counts.total} color="gray" icon={<IconClipboardList size={22} />} />
        <Metric className="dto-metric-card dto-metric-card-blue" valueClassName="dto-metric-value" label={t('domesticTransportOrders.metricActive')} value={counts.active} color="blue" icon={<IconTruckDelivery size={22} />} />
        <Metric className="dto-metric-card dto-metric-card-cyan" valueClassName="dto-metric-value" label={t('domesticTransportOrders.metricDispatched')} value={counts.dispatched} color="cyan" icon={<IconRoute size={22} />} />
        <Metric className="dto-metric-card dto-metric-card-teal" valueClassName="dto-metric-value" label={t('domesticTransportOrders.metricClosed')} value={counts.closed} color="teal" icon={<IconCircleCheck size={22} />} />
      </SimpleGrid>

      <Paper withBorder p="md" className="dto-filter-panel dl-filter-panel">
        <div className="dto-filter-grid dl-filter-row">
          <TextInput
            className="dto-filter-search dl-filter-search kbfe-search-input"
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
        opened={dtoModalOpen}
        onClose={() => setDtoModalOpen(false)}
        position="right"
        size="xl"
        title={
          <ModalTitle
            feature="dto"
            title={
              selectedShipment
                ? t('shipments.createDtoFromShipment', { shipmentNumber: selectedShipment.shipment_number })
                : t('domesticTransportOrders.create')
            }
            subtitle={selectedShipment?.shipment_number}
          />
        }
      >
        <CreateDtoFromShipmentPanel
          opened={dtoModalOpen}
          shipments={selectedShipment ? [selectedShipment] : []}
          onClose={() => setDtoModalOpen(false)}
          onCreated={() => {
            refreshLists();
            void ordersQuery.refetch();
            setSelectedShipmentId(null);
          }}
        />
      </Drawer>

      <DtoDetailDrawer
        dtoId={selectedDtoId}
        onClose={() => {
          setSelectedDtoId(null);
          closeDtoParam();
        }}
        summary={selectedSummary}
        truckVendorOptions={truckVendorOptions}
      />
    </Stack>
  );
}
