import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAnchor,
  IconCalendar,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconFileCheck,
  IconHourglassHigh,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShield,
  IconTrash,
  IconX,
  IconChecklist,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { EntityLink } from '@shared/components/EntityLink';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { FlowTagBadge } from '@shared/components/FlowTagBadge';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import {
  fetchShipments,
  createShipment,
  type ShipmentRecord,
  type ShipmentMilestone,
  type ShipmentDocument,
  type ShipmentPoTask,
} from '@shared/api/logistics';
import { fetchDeliveryOrdersV1, type DeliveryOrderV1 } from '@shared/api/deliveryOrders';
import {
  createShipmentDocument,
  fetchShipmentLines,
  markShipmentMilestoneDone,
  updateShipmentDocument,
  type ShipmentDocumentPayload,
  type ShipmentMilestoneCodeV1,
  type ShipmentModeV1,
} from '@shared/api/shipments';
import {
  cancelCustomsDeclaration,
  clearCustomsDeclaration,
  createCustomsDeclarationFromShipment,
  createCustomsDeclarationLine,
  deleteCustomsDeclarationLine,
  fetchCustomsDeclaration,
  fetchCustomsDeclarationLines,
  fetchCustomsDeclarationsByShipment,
  openCustomsDraft,
  openCustomsOfficial,
  updateCustomsDeclaration,
  updateCustomsDeclarationLine,
  type CustomsDeclarationChannelV1,
  type CustomsDeclarationLineV1,
  type CustomsDeclarationTypeV1,
  type CreateCustomsDeclarationLinePayload,
} from '@shared/api/customsDeclarations';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

type ShipmentTab = 'all' | 'in_transit' | 'customs' | 'delivered';
type ShipmentWorkbench = 'list' | 'create' | 'detail';

const inTransitStatuses = new Set<ShipmentRecord['status']>([
  'BOOKED',
  'BOOKING_PENDING',
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICKED_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'IN_TRANSIT',
  'ARRIVED',
  'ARRIVED_PORT',
]);

const customsStatuses = new Set<ShipmentRecord['status']>([
  'CUSTOMS_DRAFT',
  'CUSTOMS_CLEARED',
  'CUSTOMS_PROCESSING',
]);

const shipmentModeOptions: Array<{ label: string; value: ShipmentModeV1 }> = [
  { label: 'Sea', value: 'SEA' },
  { label: 'Air', value: 'AIR' },
  { label: 'Road', value: 'ROAD' },
  { label: 'Rail', value: 'RAIL' },
  { label: 'Multimodal', value: 'MULTIMODAL' },
  { label: 'Trucking', value: 'TRUCKING' },
  { label: 'Other', value: 'OTHER' },
];

function inferShipmentModeFromDeliveryOrder(deliveryOrder: DeliveryOrderV1): ShipmentModeV1 {
  const modeType = deliveryOrder.transport_mode?.mode_type?.toUpperCase();
  if (modeType === 'AIR') return 'AIR';
  if (modeType === 'ROAD' || modeType === 'TRUCKING') return 'ROAD';
  if (modeType === 'RAIL') return 'RAIL';
  if (modeType === 'MULTIMODAL') return 'MULTIMODAL';
  return 'SEA';
}

function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} style={{ lineHeight: 1.1 }}>
            {value}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}

export function Shipments() {
  const { t } = useI18n();
  const { close: closeShpParam, open: openShpParam, value: focusedShp } = useEntityParam('shp');
  const [selectedShpId, setSelectedShpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShipmentTab>('all');
  const [workbench, setWorkbench] = useState<ShipmentWorkbench>('list');
  const [search, setSearch] = useState('');

  // Create form states
  const [newShpNumber, setNewShpNumber] = useState('');
  const [newDeliveryOrderId, setNewDeliveryOrderId] = useState('');
  const [newDoNumber, setNewDoNumber] = useState('');
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newMode, setNewMode] = useState<ShipmentModeV1>('SEA');
  const [newCarrier, setNewCarrier] = useState('');
  const [newVoyage, setNewVoyage] = useState('');
  const [newVoyageNo, setNewVoyageNo] = useState('');
  const [newBlAwbNo, setNewBlAwbNo] = useState('');
  const [newOriginPort, setNewOriginPort] = useState('');
  const [newDestPort, setNewDestPort] = useState('');
  const [newEtd, setNewEtd] = useState('');
  const [newEta, setNewEta] = useState('');

  const queryClient = useQueryClient();

  const shipmentsQuery = useQuery({
    queryKey: queryKeys.shipments,
    queryFn: fetchShipments,
  });
  const shipments = shipmentsQuery.data ?? [];
  const isFetching = shipmentsQuery.isFetching;
  const availableDeliveryOrdersQuery = useQuery({
    enabled: workbench === 'create',
    queryKey: queryKeys.deliveryOrdersList({ status: 'QUOTATION_CONFIRMED', page: 1, limit: 100 }),
    queryFn: () => fetchDeliveryOrdersV1({ status: 'QUOTATION_CONFIRMED', page: 1, limit: 100 }),
  });
  const availableDeliveryOrders = availableDeliveryOrdersQuery.data?.data ?? [];
  const deliveryOrderOptions = availableDeliveryOrders.map((deliveryOrder) => ({
    label: [
      deliveryOrder.do_no,
      deliveryOrder.purchase_order?.po_no,
      deliveryOrder.transport_mode?.mode_name,
    ].filter(Boolean).join(' · '),
    value: deliveryOrder.id,
  }));

  useEffect(() => {
    if (!focusedShp) {
      if (workbench === 'detail') {
        setSelectedShpId(null);
        setWorkbench('list');
      }
      return;
    }

    if (shipments.length === 0) return;

    const matched = shipments.find((s) => s.shipment_number === focusedShp);
    if (matched) {
      setSelectedShpId(matched.id);
      setWorkbench('detail');
    }
  }, [focusedShp, shipments, workbench]);

  const filteredShipments = useMemo(() => {
    const query = search.toLowerCase().trim();
    return shipments.filter((shp) => {
      const statusMatches =
        activeTab === 'all' ||
        (activeTab === 'in_transit' && inTransitStatuses.has(shp.status)) ||
        (activeTab === 'customs' && customsStatuses.has(shp.status)) ||
        (activeTab === 'delivered' && shp.status === 'DELIVERED');

      const matchesSearch = [
        shp.shipment_number,
        shp.do_number,
        shp.po_number,
        shp.carrier_name,
        shp.vessel_voyage,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);

      return statusMatches && matchesSearch;
    });
  }, [shipments, activeTab, search]);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleShipments,
  } = useListPagination(filteredShipments, [activeTab, search]);

  const tabCounts = useMemo(
    () => ({
      all: shipments.length,
      in_transit: shipments.filter((s) => inTransitStatuses.has(s.status)).length,
      customs: shipments.filter((s) => customsStatuses.has(s.status)).length,
      delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
    }),
    [shipments]
  );

  const selectedShipment =
    selectedShpId === null
      ? null
      : filteredShipments.find((s) => s.id === selectedShpId) ??
        shipments.find((s) => s.id === selectedShpId) ??
        null;

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: (newShipment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
      setNewShpNumber('');
      setNewDeliveryOrderId('');
      setNewDoNumber('');
      setNewPoNumber('');
      setNewMode('SEA');
      setNewCarrier('');
      setNewVoyage('');
      setNewVoyageNo('');
      setNewBlAwbNo('');
      setNewOriginPort('');
      setNewDestPort('');
      setNewEtd('');
      setNewEta('');
      setSelectedShpId(newShipment.id);
      setWorkbench('detail');
      openShpParam(newShipment.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
    },
  });

  const milestoneMutation = useMutation({
    mutationFn: ({
      actualAt,
      milestoneCode,
      notes,
      shipmentId,
    }: {
      actualAt: string;
      milestoneCode: ShipmentMilestoneCodeV1;
      notes?: string | null;
      shipmentId: string;
    }) => markShipmentMilestoneDone(shipmentId, milestoneCode, { actual_at: actualAt, notes }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: Partial<ShipmentDocumentPayload> }) =>
      updateShipmentDocument(documentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: ({ payload, shipmentId }: { payload: ShipmentDocumentPayload; shipmentId: string }) =>
      createShipmentDocument(shipmentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const handleDeliveryOrderChange = (value: string | null) => {
    const deliveryOrderId = value ?? '';
    const deliveryOrder = availableDeliveryOrders.find((item) => item.id === deliveryOrderId);
    setNewDeliveryOrderId(deliveryOrderId);
    setNewDoNumber(deliveryOrder?.do_no ?? '');
    setNewPoNumber(deliveryOrder?.purchase_order?.po_no ?? '');
    setNewMode(deliveryOrder ? inferShipmentModeFromDeliveryOrder(deliveryOrder) : 'SEA');
    setNewOriginPort(deliveryOrder?.origin_address ?? '');
    setNewDestPort(deliveryOrder?.destination_address ?? '');
    setNewEtd(deliveryOrder?.planned_etd?.slice(0, 10) ?? '');
    setNewEta(deliveryOrder?.planned_eta?.slice(0, 10) ?? '');
  };

  const handleCreateShipment = () => {
    if (!newShpNumber || !newDeliveryOrderId) return;
    createMutation.mutate({
      blAwbNo: newBlAwbNo || undefined,
      deliveryOrderId: newDeliveryOrderId,
      destPort: newDestPort || undefined,
      eta: newEta || undefined,
      etd: newEtd || undefined,
      shipmentNumber: newShpNumber,
      doNumber: newDoNumber,
      poNumber: newPoNumber,
      shippingMode: newMode,
      carrierName: newCarrier || undefined,
      originPort: newOriginPort || undefined,
      vesselVoyage: newVoyage || undefined,
      voyageNo: newVoyageNo || undefined,
    });
  };

  const closeWorkbench = () => {
    setWorkbench('list');
    setSelectedShpId(null);
    closeShpParam({ clear: ['pr', 'po', 'do', 'task'] });
  };

  const openCreate = () => {
    setSelectedShpId(null);
    setWorkbench('create');
    closeShpParam({ clear: ['pr', 'po', 'do', 'task'] });
  };

  if (shipmentsQuery.isError) {
    return (
      <PageError
        title={t('shipments.errorTitle')}
        description={t('shipments.errorDescription')}
        error={shipmentsQuery.error}
        onRetry={() => {
          void shipmentsQuery.refetch();
        }}
      />
    );
  }

  if (shipmentsQuery.isLoading) {
    return (
      <PageLoading
        title={t('shipments.title')}
        description={t('shipments.loadingDescription')}
        tableColumns={[
          t('shipments.shipmentNumber'),
          t('shipments.linkedDo'),
          t('common.carrier'),
          t('common.route'),
          t('shipments.etd'),
          t('shipments.eta'),
          t('common.status'),
        ]}
      />
    );
  }

  return (
    <Stack gap="lg">
      {workbench === 'list' ? (
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Title order={1}>{t('shipments.title')}</Title>
            <Text c="dimmed" mt={4}>
              {t('shipments.subtitle')}
            </Text>
          </div>
          <Group gap="xs">
            <Button onClick={openCreate} leftSection={<IconPlus size={16} />} variant="light">
              {t('shipments.create')}
            </Button>
            <Badge leftSection={<IconAnchor size={14} />} size="lg" variant="light">
              {t('shell.poDo')}
            </Badge>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" align="center" gap="md">
          <Group gap="xs" align="center">
            <Button onClick={closeWorkbench} leftSection={<IconX size={16} />} variant="subtle" size="sm">
              {t('common.backToList')}
            </Button>
            <Text c="dimmed" size="sm">·</Text>
            <Text fw={600} size="sm">
              {workbench === 'create' ? t('shipments.create') : selectedShipment?.shipment_number ?? ''}
            </Text>
          </Group>
          <Badge leftSection={<IconAnchor size={14} />} size="md" variant="light">
            {t('shell.poDo')}
          </Badge>
        </Group>
      )}

      {workbench === 'list' ? (
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <Metric label={t('shipments.total')} value={shipments.length} color="blue" icon={<IconAnchor size={22} />} />
          <Metric label={t('shipments.inTransit')} value={tabCounts.in_transit} color="orange" icon={<IconClock size={22} />} />
          <Metric label={t('shipments.customsProcessing')} value={tabCounts.customs} color="yellow" icon={<IconShield size={22} />} />
          <Metric label={t('shipments.delivered')} value={tabCounts.delivered} color="teal" icon={<IconCheck size={22} />} />
        </SimpleGrid>
      ) : null}

      {workbench === 'create' ? (
        <Paper withBorder p="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3}>{t('shipments.create')}</Title>
                <Text size="sm" c="dimmed">
                  {t('shipments.createHint')}
                </Text>
              </div>
              <Group gap="xs">
                <Button variant="subtle" onClick={closeWorkbench} leftSection={<IconX size={16} />}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateShipment}
                  leftSection={<IconAnchor size={16} />}
                  disabled={!newShpNumber || !newDeliveryOrderId}
                  loading={createMutation.isPending}
                >
                  {t('shipments.create')}
                </Button>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <TextInput
                label={t('shipments.shipmentNumber')}
                placeholder="VD: SHP-2026-0001"
                value={newShpNumber}
                onChange={(e) => setNewShpNumber(e.currentTarget.value)}
                required
              />
              <Select
                label={t('shipments.linkedDo')}
                placeholder="Select quotation-confirmed DO"
                data={deliveryOrderOptions}
                value={newDeliveryOrderId || null}
                onChange={handleDeliveryOrderChange}
                searchable
                nothingFoundMessage={
                  availableDeliveryOrdersQuery.isLoading
                    ? 'Loading delivery orders...'
                    : 'No quotation-confirmed DO'
                }
                required
              />
              <TextInput
                label={t('shipments.linkedPo')}
                placeholder="PO-2026-XXXX"
                value={newPoNumber}
                readOnly
              />
              <Select
                label={t('shipments.shipmentMode')}
                data={shipmentModeOptions}
                value={newMode}
                onChange={(value) => setNewMode((value as ShipmentModeV1 | null) ?? 'SEA')}
              />
              <TextInput
                label={t('shipments.carrier')}
                placeholder="Hapag Lloyd, Maersk..."
                value={newCarrier}
                onChange={(e) => setNewCarrier(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.vessel')}
                placeholder={t('shipments.vessel')}
                value={newVoyage}
                onChange={(e) => setNewVoyage(e.currentTarget.value)}
              />
              <TextInput
                label="Voyage no."
                placeholder="001E"
                value={newVoyageNo}
                onChange={(e) => setNewVoyageNo(e.currentTarget.value)}
              />
              <TextInput
                label="BL/AWB"
                placeholder="BL123456"
                value={newBlAwbNo}
                onChange={(e) => setNewBlAwbNo(e.currentTarget.value)}
              />
              <TextInput
                label="POL"
                placeholder="Shanghai"
                value={newOriginPort}
                onChange={(e) => setNewOriginPort(e.currentTarget.value)}
              />
              <TextInput
                label="POD"
                placeholder="Cat Lai"
                value={newDestPort}
                onChange={(e) => setNewDestPort(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.etd')}
                type="date"
                value={newEtd}
                onChange={(e) => setNewEtd(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.eta')}
                type="date"
                value={newEta}
                onChange={(e) => setNewEta(e.currentTarget.value)}
              />
            </SimpleGrid>
          </Stack>
        </Paper>
      ) : null}

      {workbench === 'detail' && selectedShipment ? (
        <Stack gap="lg">
          {/* Identity card */}
          <Paper withBorder p="lg" className="workbench-section">
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap="xs" mb={4} wrap="nowrap">
                  <Title order={3}>{selectedShipment.shipment_number}</Title>
                  <StatusBadge status={selectedShipment.status} />
                </Group>
                <Text c="dimmed" size="sm">
                  {selectedShipment.carrier_name} · {selectedShipment.vessel_voyage}
                </Text>
              </div>
              <Group gap="xs">
                <EntityLink type="do" id={selectedShipment.do_number} />
                <EntityLink type="po" id={selectedShipment.po_number} />
              </Group>
            </Group>
          </Paper>

          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconAnchor size={14} />}>
                {t('shipments.overview')}
              </Tabs.Tab>
              <Tabs.Tab value="milestones" leftSection={<IconCalendar size={14} />}>
                {t('shipments.milestones')}
              </Tabs.Tab>
              <Tabs.Tab value="documents" leftSection={<IconFileCheck size={14} />}>
                {t('shipments.documents')}
              </Tabs.Tab>
              <Tabs.Tab value="customs" leftSection={<IconShield size={14} />}>
                {t('shipments.customs')}
              </Tabs.Tab>
              <Tabs.Tab value="costs" leftSection={<IconHourglassHigh size={14} />}>
                {t('shipments.costs')}
              </Tabs.Tab>
              <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>
                {t('shipments.tasks')}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <SimpleGrid cols={{ base: 1, sm: 4 }}>
                <Info label={t('shipments.carrier')} value={selectedShipment.carrier_name} />
                <Info label={t('shipments.vessel')} value={selectedShipment.vessel_voyage} />
                <Info label="POL" value={selectedShipment.origin_port} />
                <Info label="POD" value={selectedShipment.dest_port} />
                <Info label={t('shipments.etd')} value={selectedShipment.etd} />
                <Info label={t('shipments.eta')} value={selectedShipment.eta} />
                <Info label="Customs Stream" value={selectedShipment.customs.stream} />
                <Info label="Tasks Completed" value={`${selectedShipment.po_tasks.filter((t) => t.status === 'COMPLETED').length}/${selectedShipment.po_tasks.length}`} />
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="milestones" pt="md">
              <ShipmentMilestonesPanel
                shipment={selectedShipment}
                isSaving={milestoneMutation.isPending}
                onMarkDone={(milestoneCode, payload) => {
                  milestoneMutation.mutate({
                    actualAt: payload.actualAt,
                    milestoneCode,
                    notes: payload.notes,
                    shipmentId: selectedShipment.id,
                  });
                }}
                t={t}
              />
            </Tabs.Panel>

            <Tabs.Panel value="documents" pt="md">
              <ShipmentDocumentsPanel
                shipment={selectedShipment}
                isSaving={updateDocumentMutation.isPending || createDocumentMutation.isPending}
                onCreateDocument={(payload) => {
                  createDocumentMutation.mutate({ payload, shipmentId: selectedShipment.id });
                }}
                onUpdateDocument={(documentId, payload) => {
                  updateDocumentMutation.mutate({ documentId, payload });
                }}
                t={t}
              />
            </Tabs.Panel>

            <Tabs.Panel value="customs" pt="md">
              <ShipmentCustomsPanel shipment={selectedShipment} />
            </Tabs.Panel>

            <Tabs.Panel value="costs" pt="md">
              <ShipmentCostsPanel shippingMode={selectedShipment.shipping_mode} />
            </Tabs.Panel>

            <Tabs.Panel value="tasks" pt="md">
              <ShipmentTasksPanel tasks={selectedShipment.po_tasks} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      ) : null}

      {workbench === 'list' ? (
        <>
          <FilterToolbar
            activeTab={activeTab}
            isFetching={isFetching}
            onTabChange={setActiveTab}
            shown={filteredShipments.length}
            tabs={[
              { label: t('common.all'), value: 'all', count: tabCounts.all },
              { label: t('shipments.inTransit'), value: 'in_transit', count: tabCounts.in_transit },
              { label: t('shipments.customsProcessing'), value: 'customs', count: tabCounts.customs },
              { label: t('shipments.delivered'), value: 'delivered', count: tabCounts.delivered },
            ]}
          >
            <TextInput
              label={t('common.search')}
              placeholder={t('shipments.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={{ base: '100%', sm: 360 }}
            />
          </FilterToolbar>

          <Paper withBorder p={0}>
            {filteredShipments.length === 0 ? (
              <EmptyState title={t('shipments.emptyTitle')} description={t('shipments.emptyDescription')} />
            ) : (
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1180} verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('shipments.shipmentNumber')}</Table.Th>
                      <Table.Th>{t('shipments.linkedDo')}</Table.Th>
                      <Table.Th>{t('common.carrier')}</Table.Th>
                      <Table.Th>{t('shipments.vessel')}</Table.Th>
                      <Table.Th>{t('common.route')}</Table.Th>
                      <Table.Th>{t('shipments.etd')}</Table.Th>
                      <Table.Th>{t('shipments.eta')}</Table.Th>
                      <Table.Th>{t('common.status')}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visibleShipments.map((shp) => (
                      <Table.Tr
                        key={shp.id}
                        onClick={() => {
                          setSelectedShpId(shp.id);
                          setWorkbench('detail');
                          openShpParam(shp.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          <Text fw={700}>{shp.shipment_number}</Text>
                          <FlowTagBadge tags={[]} />
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <EntityLink type="do" id={shp.do_number} compact />
                            <EntityLink type="po" id={shp.po_number} compact />
                          </Group>
                        </Table.Td>
                        <Table.Td>{shp.carrier_name}</Table.Td>
                        <Table.Td>{shp.vessel_voyage}</Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600}>{shp.origin_port}</Text>
                          <Text size="xs" c="dimmed">{shp.dest_port}</Text>
                        </Table.Td>
                        <Table.Td>{shp.etd}</Table.Td>
                        <Table.Td>{shp.eta}</Table.Td>
                        <Table.Td>
                          <StatusBadge status={shp.status} />
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={t('shipments.inTransit')}>
                            <ActionIcon
                              variant="subtle"
                              aria-label={t('common.view')}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedShpId(shp.id);
                                setWorkbench('detail');
                                openShpParam(shp.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
                              }}
                            >
                              <IconExternalLink size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
            <ListPagination
              page={page}
              pageCount={pageCount}
              pageEnd={pageEnd}
              pageStart={pageStart}
              setPage={setPage}
              total={filteredShipments.length}
            />
          </Paper>
        </>
      ) : null}
    </Stack>
  );
}

function ShipmentMilestonesPanel({
  isSaving,
  onMarkDone,
  shipment,
  t,
}: {
  isSaving: boolean;
  onMarkDone: (milestoneCode: ShipmentMilestoneCodeV1, payload: { actualAt: string; notes?: string | null }) => void;
  shipment: ShipmentRecord;
  t: (key: string) => string;
}) {
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneSource, setMilestoneSource] = useState<'MANUAL' | 'API' | 'EMAIL'>('MANUAL');
  const [milestoneNote, setMilestoneNote] = useState('');

  const milestoneLabels: Record<string, string> = {
    BOOKING_CONFIRMED: '1. Booking Confirmed',
    CARGO_READY: '2. Cargo Ready',
    PICKED_UP: '3. Picked up',
    BL_ISSUED: '4. B/L Issued',
    GATE_IN_POL: '5. Gate in POL',
    ATD: '6. ATD',
    CUSTOMS_DRAFT: '7. Customs Draft',
    ARRIVAL_NOTICE: '8. Arrival Notice',
    CUSTOMS_CLEARED: '9. Customs Cleared',
    DELIVERED: '10. Delivered',
  };

  const renderedMilestones = useMemo(() => {
    const sequence = [
      'BOOKING_CONFIRMED',
      'CARGO_READY',
      'PICKED_UP',
      'BL_ISSUED',
      'GATE_IN_POL',
      'ATD',
      'CUSTOMS_DRAFT',
      'ARRIVAL_NOTICE',
      'CUSTOMS_CLEARED',
      'DELIVERED',
    ];
    return sequence.map((code) => {
      const found = shipment.milestones.find((m) => m.milestone_code === code);
      return found ?? {
        id: `m-dummy-${code}`,
        milestone_code: code as any,
        planned_date: null,
        actual_date: null,
        source: 'MANUAL' as const,
        note: null,
      };
    });
  }, [shipment.milestones]);

  const handleUpdateMilestone = (milestoneId: string) => {
    const milestone = renderedMilestones.find((item) => item.id === milestoneId);
    if (!milestone) return;
    const actualAt = milestoneDate ? new Date(milestoneDate).toISOString() : new Date().toISOString();
    onMarkDone(milestone.milestone_code as ShipmentMilestoneCodeV1, {
      actualAt,
      notes: milestoneNote || null,
    });
    setEditingMilestoneId(null);
    setMilestoneDate('');
    setMilestoneNote('');
  };

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconCalendar size={18} />}>
        Track 10 logistics milestones for international shipping.
      </Alert>
      <Paper withBorder p="md">
        <Stack gap="xs">
          {renderedMilestones.map((m, idx) => {
            const label = milestoneLabels[m.milestone_code] || m.milestone_code;
            const isCompleted = !!m.actual_date;
            const isNested = m.milestone_code === 'PICKED_UP' || m.milestone_code === 'GATE_IN_POL';

            return (
              <div
                key={m.id}
                style={{
                  paddingLeft: isNested ? '24px' : '0px',
                  borderLeft: isNested ? '2px dashed var(--mantine-color-blue-light)' : 'none',
                  marginLeft: isNested ? '12px' : '0px',
                }}
              >
                <Paper
                  withBorder
                  p="xs"
                  mb="xs"
                  style={{
                    backgroundColor: isCompleted ? 'var(--mantine-color-teal-light)' : 'transparent',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={isCompleted ? 700 : 400}>
                      {label}
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      color={isCompleted ? 'teal' : 'blue'}
                      loading={isSaving && editingMilestoneId === m.id}
                      onClick={() => {
                        setEditingMilestoneId(m.id);
                        setMilestoneDate(m.actual_date ? m.actual_date.slice(0, 10) : '');
                        setMilestoneSource(m.source);
                        setMilestoneNote(m.note || '');
                      }}
                    >
                      {isCompleted ? 'Update' : 'Mark done'}
                    </Button>
                  </Group>
                  {isCompleted ? (
                    <Text size="xs" c="teal">
                      Completed: {m.actual_date} ({m.source}) · {m.note || 'No note'}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Planned: {m.planned_date || '-'}
                    </Text>
                  )}
                </Paper>

                {editingMilestoneId === m.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label="Actual date"
                        type="date"
                        value={milestoneDate}
                        onChange={(e) => setMilestoneDate(e.currentTarget.value)}
                        size="xs"
                      />
                      <Select
                        label="Source"
                        value={milestoneSource}
                        onChange={(val) => setMilestoneSource((val as any) || 'MANUAL')}
                        data={['MANUAL', 'API', 'EMAIL']}
                        size="xs"
                      />
                      <TextInput
                        label="Note"
                        value={milestoneNote}
                        onChange={(e) => setMilestoneNote(e.currentTarget.value)}
size="xs"
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="subtle" onClick={() => setEditingMilestoneId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="xs" color="blue" onClick={() => handleUpdateMilestone(m.id)}>
                          {t('common.save')}
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </div>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ShipmentDocumentsPanel({
  isSaving,
  onCreateDocument,
  onUpdateDocument,
  shipment,
  t,
}: {
  isSaving: boolean;
  onCreateDocument: (payload: ShipmentDocumentPayload) => void;
  onUpdateDocument: (documentId: string, payload: Partial<ShipmentDocumentPayload>) => void;
  shipment: ShipmentRecord;
  t: (key: string) => string;
}) {
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newDocumentType, setNewDocumentType] = useState<ShipmentDocumentPayload['document_type']>('BILL_OF_LADING');
  const [newDocumentNo, setNewDocumentNo] = useState('');

  const documentTypeOptions: Array<{ label: string; value: ShipmentDocumentPayload['document_type'] }> = [
    { label: 'Commercial invoice', value: 'COMMERCIAL_INVOICE' },
    { label: 'Packing list', value: 'PACKING_LIST' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Booking confirmation', value: 'BOOKING_CONFIRMATION' },
    { label: 'Bill of lading', value: 'BILL_OF_LADING' },
    { label: 'Air waybill', value: 'AIR_WAYBILL' },
    { label: 'Arrival notice', value: 'ARRIVAL_NOTICE' },
    { label: 'Certificate of origin', value: 'CERTIFICATE_OF_ORIGIN' },
    { label: 'Insurance', value: 'INSURANCE' },
    { label: 'Customs declaration', value: 'CUSTOMS_DECLARATION' },
    { label: 'eDO', value: 'EDO' },
    { label: 'POD', value: 'POD' },
    { label: 'Other', value: 'OTHER' },
  ];

  const getStatusColor = (status: ShipmentDocument['status']) => {
    switch (status) {
      case 'APPROVED':
      case 'VERIFIED': return 'green';
      case 'RECEIVED':
      case 'WAITING_REVIEW': return 'orange';
      case 'REJECTED': return 'red';
      case 'CANCELLED': return 'gray';
      default: return 'gray';
    }
  };

  const handleDocumentApprove = (docId: string) => {
    onUpdateDocument(docId, { status: 'VERIFIED' });
  };

  const handleDocumentReject = (docId: string) => {
    if (!rejectReason) return;
    onUpdateDocument(docId, { notes: rejectReason, status: 'REJECTED' });
    setRejectingDocId(null);
    setRejectReason('');
  };

  const handleDocumentUpload = (docId: string, file: File | null) => {
    if (!file) return;
    onUpdateDocument(docId, {
      file_name: file.name,
      mime_type: file.type || null,
      received_at: new Date().toISOString(),
      status: 'RECEIVED',
    });
  };

  const handleCreateDocument = () => {
    onCreateDocument({
      document_no: newDocumentNo || null,
      document_type: newDocumentType,
      status: 'DRAFT',
    });
    setNewDocumentNo('');
  };

  return (
    <Stack gap="md">
      <Alert color="orange" icon={<IconHourglassHigh size={18} />}>
        Draft B/L SLA: 2-hour review window for cross-check.
      </Alert>
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <Select
            label="Document type"
            data={documentTypeOptions}
            value={newDocumentType}
            onChange={(value) => setNewDocumentType((value as ShipmentDocumentPayload['document_type'] | null) ?? 'OTHER')}
          />
          <TextInput
            label="Document no."
            placeholder="BL123456"
            value={newDocumentNo}
            onChange={(event) => setNewDocumentNo(event.currentTarget.value)}
          />
          <Group align="flex-end">
            <Button
              fullWidth
              leftSection={<IconPlus size={16} />}
              loading={isSaving}
              onClick={handleCreateDocument}
            >
              Add document
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {shipment.documents.map((doc) => {
          const isWaitingReview = doc.status === 'WAITING_REVIEW' || doc.status === 'RECEIVED';
          const hasFile = !!doc.file_name;

          return (
            <Paper key={doc.id} withBorder p="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700} size="sm">
                    {doc.document_type}
                  </Text>
                  <Badge color={getStatusColor(doc.status)}>{doc.status}</Badge>
                </Group>

                {hasFile ? (
                  <Text size="xs" c="blue" style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    {doc.file_name}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" fs="italic">
                    No file uploaded.
                  </Text>
                )}

                {isWaitingReview && doc.review_due_at && (
                  <Group justify="space-between">
                    <Text size="xs" fw={700}>SLA Review Timeleft:</Text>
                    <Badge color="orange" variant="filled">
                      2h SLA
                    </Badge>
                  </Group>
                )}

                {doc.reject_reason && (
                  <Text size="xs" c="red" fw={600}>
                    Rejected: {doc.reject_reason}
                  </Text>
                )}

                <Group gap="xs" justify="flex-end" mt="xs">
                  <FileInput
                    placeholder="Upload..."
                    size="xs"
                    onChange={(file) => handleDocumentUpload(doc.id, file)}
                    style={{ maxWidth: 120 }}
                  />
                  {isWaitingReview && (
                    <>
                      <Button size="xs" color="green" loading={isSaving} onClick={() => handleDocumentApprove(doc.id)}>
                        Approve
                      </Button>
                      <Button size="xs" color="red" variant="light" onClick={() => setRejectingDocId(doc.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                </Group>

                {rejectingDocId === doc.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label="Reject reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                        size="xs"
                        required
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="subtle" onClick={() => setRejectingDocId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          disabled={!rejectReason}
                          loading={isSaving}
                          onClick={() => handleDocumentReject(doc.id)}
                        >
                          Confirm reject
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function ShipmentCustomsPanel({ shipment }: { shipment: ShipmentRecord }) {
  const queryClient = useQueryClient();
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null);
  const [newCustomsType, setNewCustomsType] = useState<CustomsDeclarationTypeV1>('IMPORT');
  const [newCustomsChannel, setNewCustomsChannel] = useState<CustomsDeclarationChannelV1 | null>(null);
  const [newBrokerId, setNewBrokerId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [declarationNo, setDeclarationNo] = useState('');
  const [customsType, setCustomsType] = useState<CustomsDeclarationTypeV1>('IMPORT');
  const [customsChannel, setCustomsChannel] = useState<CustomsDeclarationChannelV1 | null>(null);
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState('');
  const [headerNote, setHeaderNote] = useState('');
  const [officialNo, setOfficialNo] = useState('');
  const [officialChannel, setOfficialChannel] = useState<CustomsDeclarationChannelV1>('YELLOW');
  const [clearNote, setClearNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [newShipmentLineId, setNewShipmentLineId] = useState<string | null>(null);
  const [newLineNo, setNewLineNo] = useState('');
  const [newLineQuantity, setNewLineQuantity] = useState('');
  const [newLineCustomsValue, setNewLineCustomsValue] = useState('');
  const [newLineNote, setNewLineNote] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineQuantity, setLineQuantity] = useState('');
  const [lineCustomsValue, setLineCustomsValue] = useState('');
  const [lineDutyRate, setLineDutyRate] = useState('');
  const [lineVatRate, setLineVatRate] = useState('');
  const [lineNote, setLineNote] = useState('');

  const declarationListQuery = useQuery({
    queryKey: queryKeys.customsDeclarationsByShipment(shipment.id),
    queryFn: () => fetchCustomsDeclarationsByShipment(shipment.id),
  });
  const declarations = declarationListQuery.data ?? [];

  useEffect(() => {
    if (selectedDeclarationId && declarations.some((item) => item.id === selectedDeclarationId)) return;
    setSelectedDeclarationId(declarations[0]?.id ?? null);
  }, [declarations, selectedDeclarationId]);

  const declarationSummary = declarations.find((item) => item.id === selectedDeclarationId) ?? null;
  const declarationDetailQuery = useQuery({
    enabled: Boolean(selectedDeclarationId),
    queryKey: selectedDeclarationId
      ? queryKeys.customsDeclarationDetail(selectedDeclarationId)
      : queryKeys.customsDeclarationDetail('idle'),
    queryFn: () => fetchCustomsDeclaration(selectedDeclarationId ?? ''),
  });
  const declaration = declarationDetailQuery.data ?? declarationSummary;
  const declarationId = declaration?.id ?? null;
  const declarationLinesQuery = useQuery({
    enabled: Boolean(declarationId),
    queryKey: declarationId ? queryKeys.customsDeclarationLines(declarationId) : queryKeys.customsDeclarationLines('idle'),
    queryFn: () => fetchCustomsDeclarationLines(declarationId ?? ''),
  });
  const lines = declarationLinesQuery.data ?? declaration?.lines ?? [];
  const shipmentLinesQuery = useQuery({
    queryKey: queryKeys.shipmentLines(shipment.id),
    queryFn: () => fetchShipmentLines(shipment.id),
  });
  const brokersQuery = useQuery({
    queryKey: queryKeys.suppliers({ page: 1, limit: 100 }),
    queryFn: () => fetchSuppliers({ page: 1, limit: 100 }),
  });

  useEffect(() => {
    if (!declaration) return;
    setDeclarationNo(declaration.declaration_no ?? '');
    setCustomsType(declaration.customs_type);
    setCustomsChannel(declaration.customs_channel);
    setBrokerId(declaration.broker_id);
    setSubmittedAt(declaration.submitted_at?.slice(0, 16) ?? '');
    setHeaderNote(declaration.note ?? '');
    setOfficialNo(declaration.declaration_no ?? '');
    setOfficialChannel(declaration.customs_channel ?? 'YELLOW');
  }, [declaration]);

  useEffect(() => {
    if (lines.length === 0 && !newLineNo) {
      setNewLineNo('1');
      return;
    }
    if (!newLineNo) {
      setNewLineNo(String(Math.max(...lines.map((line) => line.line_no), 0) + 1));
    }
  }, [lines, newLineNo]);

  const refreshCustoms = (id = declarationId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationsByShipment(shipment.id) });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationDetail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationLines(id) });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
  };

  const createDeclarationMutation = useMutation({
    mutationFn: () =>
      createCustomsDeclarationFromShipment(shipment.id, {
        broker_id: newBrokerId,
        customs_channel: newCustomsChannel,
        customs_type: newCustomsType,
        note: newNote || null,
      }),
    onSuccess: (created) => {
      setSelectedDeclarationId(created.id);
      setNewBrokerId(null);
      setNewCustomsChannel(null);
      setNewCustomsType('IMPORT');
      setNewNote('');
      refreshCustoms(created.id);
    },
  });

  const updateDeclarationMutation = useMutation({
    mutationFn: () =>
      updateCustomsDeclaration(declarationId ?? '', {
        broker_id: brokerId,
        customs_channel: customsChannel,
        customs_type: customsType,
        declaration_no: declarationNo || null,
        note: headerNote || null,
        submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
      }),
    onSuccess: (updated) => refreshCustoms(updated.id),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: 'open-draft' | 'open-official' | 'clear' | 'cancel') => {
      if (!declarationId) throw new Error('Select a declaration first');
      if (action === 'open-draft') {
        return openCustomsDraft(declarationId, { opened_at: new Date().toISOString() });
      }
      if (action === 'open-official') {
        return openCustomsOfficial(declarationId, {
          customs_channel: officialChannel,
          declaration_no: officialNo,
          opened_at: new Date().toISOString(),
        });
      }
      if (action === 'clear') {
        return clearCustomsDeclaration(declarationId, {
          cleared_at: new Date().toISOString(),
          note: clearNote || null,
        });
      }
      return cancelCustomsDeclaration(declarationId, {
        cancel_reason: cancelReason,
        note: cancelReason,
      });
    },
    onSuccess: (updated) => {
      setCancelReason('');
      setClearNote('');
      refreshCustoms(updated.id);
    },
  });

  const createLineMutation = useMutation({
    mutationFn: () => {
      if (!declarationId) throw new Error('Select a declaration first');
      const payload: CreateCustomsDeclarationLinePayload = {
        customs_value: newLineCustomsValue ? Number(newLineCustomsValue) : null,
        line_no: Number(newLineNo),
        note: newLineNote || null,
        quantity: newLineQuantity ? Number(newLineQuantity) : undefined,
        shipment_line_id: newShipmentLineId,
      };
      return createCustomsDeclarationLine(declarationId, payload);
    },
    onSuccess: () => {
      setNewShipmentLineId(null);
      setNewLineCustomsValue('');
      setNewLineQuantity('');
      setNewLineNote('');
      setNewLineNo(String(Math.max(...lines.map((line) => line.line_no), 0) + 2));
      refreshCustoms();
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: () =>
      updateCustomsDeclarationLine(editingLineId ?? '', {
        customs_value: lineCustomsValue ? Number(lineCustomsValue) : null,
        import_duty_rate: lineDutyRate ? Number(lineDutyRate) : null,
        note: lineNote || null,
        quantity: lineQuantity ? Number(lineQuantity) : undefined,
        vat_rate: lineVatRate ? Number(lineVatRate) : null,
      }),
    onSuccess: () => {
      setEditingLineId(null);
      refreshCustoms();
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => deleteCustomsDeclarationLine(lineId),
    onSuccess: () => refreshCustoms(),
  });

  const typeOptions: Array<{ label: string; value: CustomsDeclarationTypeV1 }> = [
    { label: 'Import', value: 'IMPORT' },
    { label: 'Temporary import', value: 'TEMP_IMPORT' },
    { label: 'Re-import', value: 'RE_IMPORT' },
    { label: 'Other', value: 'OTHER' },
  ];
  const channelOptions: Array<{ label: string; value: CustomsDeclarationChannelV1 }> = [
    { label: 'Green', value: 'GREEN' },
    { label: 'Yellow', value: 'YELLOW' },
    { label: 'Red', value: 'RED' },
  ];
  const brokerOptions = (brokersQuery.data?.data ?? []).map((broker) => ({
    label: `${broker.supplier_code} - ${broker.supplier_name}`,
    value: broker.id,
  }));
  const shipmentLineOptions = (shipmentLinesQuery.data ?? []).map((line) => ({
    label: [
      line.item_description ?? line.item_id ?? line.id,
      `${Number(line.qty).toLocaleString()} ${line.unit ?? ''}`.trim(),
    ].join(' - '),
    value: line.id,
  }));
  const isLocked = declaration?.status === 'CLEARED' || declaration?.status === 'CANCELLED';
  const startEditingLine = (line: CustomsDeclarationLineV1) => {
    setEditingLineId(line.id);
    setLineQuantity(String(line.quantity ?? ''));
    setLineCustomsValue(String(line.customs_value ?? ''));
    setLineDutyRate(String(line.import_duty_rate ?? ''));
    setLineVatRate(String(line.vat_rate ?? ''));
    setLineNote(line.note ?? '');
  };

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconShield size={18} />}>
        Customs declaration is created from active shipment lines and drives shipment status to CUSTOMS_DRAFT.
      </Alert>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={700}>Customs declarations</Text>
              <Text size="sm" c="dimmed">
                Create one declaration per shipment, then open draft/official and clear customs.
              </Text>
            </div>
            {declarations.length > 0 ? (
              <Select
                label="Active declaration"
                data={declarations.map((item) => ({
                  label: item.declaration_no ?? `${item.customs_type} - ${item.status}`,
                  value: item.id,
                }))}
                value={selectedDeclarationId}
                onChange={setSelectedDeclarationId}
                w={{ base: '100%', sm: 280 }}
              />
            ) : null}
          </Group>

          {declarationListQuery.isLoading ? (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading customs declarations...</Text>
            </Group>
          ) : declarations.length === 0 ? (
            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <Select
                label="Customs type"
                data={typeOptions}
                value={newCustomsType}
                onChange={(value) => setNewCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
              />
              <Select
                label="Channel"
                clearable
                data={channelOptions}
                value={newCustomsChannel}
                onChange={(value) => setNewCustomsChannel(value as CustomsDeclarationChannelV1 | null)}
              />
              <Select
                label="Broker"
                clearable
                searchable
                data={brokerOptions}
                value={newBrokerId}
                onChange={setNewBrokerId}
                nothingFoundMessage={brokersQuery.isLoading ? 'Loading brokers...' : 'No supplier found'}
              />
              <TextInput
                label="Note"
                placeholder="Create draft customs declaration"
                value={newNote}
                onChange={(event) => setNewNote(event.currentTarget.value)}
              />
              <Group align="flex-end">
                <Button
                  leftSection={<IconPlus size={16} />}
                  loading={createDeclarationMutation.isPending}
                  onClick={() => createDeclarationMutation.mutate()}
                >
                  Create declaration
                </Button>
              </Group>
            </SimpleGrid>
          ) : null}
        </Stack>
      </Paper>

      {declaration ? (
        <>
          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Group gap="xs">
                    <Text fw={700}>{declaration.declaration_no ?? 'Draft declaration'}</Text>
                    <StatusBadge status={declaration.status} />
                    {declaration.customs_channel ? (
                      <Badge color={channelColor(declaration.customs_channel)}>{declaration.customs_channel}</Badge>
                    ) : null}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {declaration.broker?.supplier_name ?? 'No broker'} · {declaration.note ?? 'No note'}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    disabled={isLocked || declaration.status !== 'DRAFT'}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('open-draft')}
                  >
                    Open draft
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    disabled={isLocked || !officialNo || !['DRAFT', 'DRAFT_OPENED'].includes(declaration.status)}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('open-official')}
                  >
                    Open official
                  </Button>
                  <Button
                    size="xs"
                    color="teal"
                    disabled={!['OFFICIAL_OPENED', 'SUBMITTED', 'INSPECTION'].includes(declaration.status)}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('clear')}
                  >
                    Clear
                  </Button>
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
                <TextInput
                  label="Declaration no."
                  value={declarationNo}
                  disabled={isLocked}
                  onChange={(event) => {
                    setDeclarationNo(event.currentTarget.value);
                    setOfficialNo(event.currentTarget.value);
                  }}
                />
                <Select
                  label="Customs type"
                  data={typeOptions}
                  value={customsType}
                  disabled={isLocked}
                  onChange={(value) => setCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
                />
                <Select
                  label="Channel"
                  clearable
                  data={channelOptions}
                  value={customsChannel}
                  disabled={isLocked}
                  onChange={(value) => {
                    setCustomsChannel(value as CustomsDeclarationChannelV1 | null);
                    if (value) setOfficialChannel(value as CustomsDeclarationChannelV1);
                  }}
                />
                <Select
                  label="Broker"
                  clearable
                  searchable
                  data={brokerOptions}
                  value={brokerId}
                  disabled={isLocked}
                  onChange={setBrokerId}
                />
                <TextInput
                  label="Submitted at"
                  type="datetime-local"
                  value={submittedAt}
                  disabled={isLocked}
                  onChange={(event) => setSubmittedAt(event.currentTarget.value)}
                />
                <TextInput
                  label="Official no."
                  value={officialNo}
                  disabled={isLocked}
                  onChange={(event) => setOfficialNo(event.currentTarget.value)}
                />
                <Select
                  label="Official channel"
                  data={channelOptions}
                  value={officialChannel}
                  disabled={isLocked}
                  onChange={(value) => setOfficialChannel((value as CustomsDeclarationChannelV1 | null) ?? 'YELLOW')}
                />
                <TextInput
                  label="Clear note"
                  value={clearNote}
                  disabled={declaration.status === 'CLEARED' || declaration.status === 'CANCELLED'}
                  onChange={(event) => setClearNote(event.currentTarget.value)}
                />
                <TextInput
                  label="Header note"
                  value={headerNote}
                  disabled={isLocked}
                  onChange={(event) => setHeaderNote(event.currentTarget.value)}
                />
                <TextInput
                  label="Cancel reason"
                  value={cancelReason}
                  disabled={isLocked}
                  onChange={(event) => setCancelReason(event.currentTarget.value)}
                />
              </SimpleGrid>

              <Group justify="flex-end" gap="xs">
                <Button
                  variant="light"
                  disabled={isLocked}
                  loading={updateDeclarationMutation.isPending}
                  onClick={() => updateDeclarationMutation.mutate()}
                >
                  Save declaration
                </Button>
                <Button
                  color="red"
                  variant="light"
                  disabled={isLocked || !cancelReason}
                  loading={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('cancel')}
                >
                  Cancel declaration
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={700}>Declaration lines</Text>
                  <Text size="sm" c="dimmed">
                    Lines are copied from shipment lines when a declaration is created.
                  </Text>
                </div>
                {declarationLinesQuery.isFetching ? <Loader size="sm" /> : null}
              </Group>

              {!isLocked ? (
                <SimpleGrid cols={{ base: 1, md: 5 }} spacing="sm">
                  <Select
                    label="Shipment line"
                    searchable
                    clearable
                    data={shipmentLineOptions}
                    value={newShipmentLineId}
                    onChange={setNewShipmentLineId}
                    nothingFoundMessage={shipmentLinesQuery.isLoading ? 'Loading shipment lines...' : 'No shipment line'}
                  />
                  <TextInput
                    label="Line no."
                    type="number"
                    value={newLineNo}
                    onChange={(event) => setNewLineNo(event.currentTarget.value)}
                  />
                  <TextInput
                    label="Quantity"
                    type="number"
                    value={newLineQuantity}
                    onChange={(event) => setNewLineQuantity(event.currentTarget.value)}
                  />
                  <TextInput
                    label="Customs value"
                    type="number"
                    value={newLineCustomsValue}
                    onChange={(event) => setNewLineCustomsValue(event.currentTarget.value)}
                  />
                  <TextInput
                    label="Line note"
                    value={newLineNote}
                    onChange={(event) => setNewLineNote(event.currentTarget.value)}
                  />
                  <Group align="flex-end">
                    <Button
                      size="sm"
                      leftSection={<IconPlus size={16} />}
                      disabled={!newLineNo}
                      loading={createLineMutation.isPending}
                      onClick={() => createLineMutation.mutate()}
                    >
                      Add line
                    </Button>
                  </Group>
                </SimpleGrid>
              ) : null}

              <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={980} verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>No.</Table.Th>
                      <Table.Th>Item</Table.Th>
                      <Table.Th>HS</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Value</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Duty %</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>VAT %</Table.Th>
                      <Table.Th>Note</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {lines.map((line) => {
                      const isEditing = editingLineId === line.id;
                      return (
                        <Table.Tr key={line.id}>
                          <Table.Td>{line.line_no}</Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>{line.item_description ?? line.item_id ?? '-'}</Text>
                            <Text size="xs" c="dimmed">{line.unit ?? '-'}</Text>
                          </Table.Td>
                          <Table.Td>{line.hs_code ?? '-'}</Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <TextInput
                                type="number"
                                size="xs"
                                value={lineQuantity}
                                onChange={(event) => setLineQuantity(event.currentTarget.value)}
                              />
                            ) : (
                              Number(line.quantity).toLocaleString()
                            )}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <TextInput
                                type="number"
                                size="xs"
                                value={lineCustomsValue}
                                onChange={(event) => setLineCustomsValue(event.currentTarget.value)}
                              />
                            ) : (
                              line.customs_value ? Number(line.customs_value).toLocaleString() : '-'
                            )}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <TextInput
                                type="number"
                                size="xs"
                                value={lineDutyRate}
                                onChange={(event) => setLineDutyRate(event.currentTarget.value)}
                              />
                            ) : (
                              line.import_duty_rate ?? '-'
                            )}
                          </Table.Td>
                          <Table.Td style={{ textAlign: 'right' }}>
                            {isEditing ? (
                              <TextInput
                                type="number"
                                size="xs"
                                value={lineVatRate}
                                onChange={(event) => setLineVatRate(event.currentTarget.value)}
                              />
                            ) : (
                              line.vat_rate ?? '-'
                            )}
                          </Table.Td>
                          <Table.Td>
                            {isEditing ? (
                              <TextInput
                                size="xs"
                                value={lineNote}
                                onChange={(event) => setLineNote(event.currentTarget.value)}
                              />
                            ) : (
                              line.note ?? '-'
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Group justify="flex-end" gap="xs" wrap="nowrap">
                              {isEditing ? (
                                <>
                                  <Button size="xs" variant="subtle" onClick={() => setEditingLineId(null)}>
                                    Cancel
                                  </Button>
                                  <Button size="xs" loading={updateLineMutation.isPending} onClick={() => updateLineMutation.mutate()}>
                                    Save
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="xs" variant="light" disabled={isLocked} onClick={() => startEditingLine(line)}>
                                    Edit
                                  </Button>
                                  <Tooltip label="Delete line">
                                    <ActionIcon
                                      aria-label="Delete line"
                                      color="red"
                                      variant="subtle"
                                      disabled={isLocked}
                                      loading={deleteLineMutation.isPending}
                                      onClick={() => deleteLineMutation.mutate(line.id)}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                </>
                              )}
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              {lines.length === 0 ? (
                <EmptyState title="No customs lines" description="Create a declaration from shipment lines or add a line manually." />
              ) : null}
            </Stack>
          </Paper>
        </>
      ) : null}

      {declarationListQuery.isError ? (
        <Alert color="red" icon={<IconX size={18} />}>
          {(declarationListQuery.error as Error).message}
        </Alert>
      ) : null}
    </Stack>
  );
}

function channelColor(channel: CustomsDeclarationChannelV1) {
  if (channel === 'GREEN') return 'teal';
  if (channel === 'YELLOW') return 'yellow';
  return 'red';
}

function ShipmentCostsPanel({ shippingMode }: { shippingMode: ShipmentRecord['shipping_mode'] }) {
  const freight = shippingMode === 'SEA' ? 4200 : 8800;
  const costs = [
    { code: 'FREIGHT', label: 'Freight', amount: freight, currency: 'USD' },
    { code: 'INSURANCE', label: 'Insurance', amount: 360, currency: 'USD' },
    { code: 'CUSTOMS', label: 'Customs clearance', amount: 220, currency: 'USD' },
    { code: 'LOCAL', label: 'Local charges', amount: 680, currency: 'USD' },
    { code: 'DUTY', label: 'Import duty estimate', amount: 950, currency: 'USD' },
  ];
  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="sm">Landed Cost</Text>
          <Badge size="lg" color="teal">
            {total.toLocaleString()} USD
          </Badge>
        </Group>
        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={680} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Charge</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {costs.map((cost) => (
                <Table.Tr key={cost.code}>
                  <Table.Td>{cost.code}</Table.Td>
                  <Table.Td>{cost.label}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {cost.amount.toLocaleString()} {cost.currency}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}

function ShipmentTasksPanel({ tasks }: { tasks: ShipmentPoTask[] }) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={700} size="sm">
          PO Stage Closure Tasks
        </Text>
        <Text size="xs" c="dimmed">
          Tasks must be completed before shipment can proceed to next stage.
        </Text>
        <Stack mt="sm" gap="xs">
          {tasks.map((task) => (
            <Paper key={task.id} withBorder p="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <Checkbox checked={task.status === 'COMPLETED'} readOnly />
                  <Text size="sm" fw={task.status === 'COMPLETED' ? 500 : 600} style={{ textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                    {task.task_name}
                  </Text>
                </Group>
                <Badge color="gray">{task.assignee_role}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
