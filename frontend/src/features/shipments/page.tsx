import {
  Badge,
  Button,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconAnchor, IconCheck, IconClock, IconPlus, IconShield, IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { fetchShipments, createShipment } from '@shared/api/logistics';
import { fetchDeliveryOrdersV1 } from '@shared/api/deliveryOrders';
import {
  createShipmentCost,
  createShipmentDocument,
  deleteShipmentCost,
  markShipmentMilestoneDone,
  updateShipmentCost,
  updateShipmentDocument,
  type ShipmentCostPayload,
  type ShipmentDocumentPayload,
  type ShipmentMilestoneCodeV1,
  type ShipmentModeV1,
} from '@shared/api/shipments';
import { queryKeys } from '@shared/api/queryKeys';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import {
  customsStatuses,
  inTransitStatuses,
  inferShipmentModeFromDeliveryOrder,
  shipmentModeOptions,
  type ShipmentWorkbench,
} from './model/shipmentModel';
import { useShipmentsUiStore } from './model/shipmentsUiStore';
import { Metric } from './components/Metric';
import { ShipmentDetailView } from './components/ShipmentDetailView';
import { ShipmentListView } from './components/ShipmentListView';

export function Shipments() {
  const { t } = useI18n();
  const { close: closeShpParam, open: openShpParam, value: focusedShp } = useEntityParam('shp');
  const [selectedShpId, setSelectedShpId] = useState<string | null>(null);
  const [workbench, setWorkbench] = useState<ShipmentWorkbench>('list');
  const activeTab = useShipmentsUiStore((s) => s.activeTab);
  const search = useShipmentsUiStore((s) => s.search);
  const modeFilter = useShipmentsUiStore((s) => s.modeFilter);
  const carrierFilter = useShipmentsUiStore((s) => s.carrierFilter);
  const channelFilter = useShipmentsUiStore((s) => s.channelFilter);
  const etdFrom = useShipmentsUiStore((s) => s.etdFrom);
  const etdTo = useShipmentsUiStore((s) => s.etdTo);

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
  const translatedShipmentModeOptions = shipmentModeOptions.map((option) => ({
    label: t(option.labelKey),
    value: option.value,
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

  const carrierOptions = useMemo(
    () =>
      Array.from(new Set(shipments.map((shp) => shp.carrier_name).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((carrier) => ({ label: carrier, value: carrier })),
    [shipments],
  );

  const filteredShipments = useMemo(() => {
    const query = search.toLowerCase().trim();
    return shipments.filter((shp) => {
      const statusMatches =
        activeTab === 'all' ||
        (activeTab === 'in_transit' && inTransitStatuses.has(shp.status)) ||
        (activeTab === 'customs' && customsStatuses.has(shp.status)) ||
        (activeTab === 'delivered' && shp.status === 'DELIVERED');

      const matchesMode = modeFilter === 'all' || shp.shipping_mode === modeFilter;
      const matchesCarrier = !carrierFilter || shp.carrier_name === carrierFilter;
      const matchesChannel =
        channelFilter === 'all' || (shp.customs.lane_status !== '' && shp.customs.stream === channelFilter);
      const matchesEtdFrom = !etdFrom || (shp.etd !== '' && shp.etd >= etdFrom);
      const matchesEtdTo = !etdTo || (shp.etd !== '' && shp.etd <= etdTo);

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

      return (
        statusMatches &&
        matchesMode &&
        matchesCarrier &&
        matchesChannel &&
        matchesEtdFrom &&
        matchesEtdTo &&
        matchesSearch
      );
    });
  }, [shipments, activeTab, search, modeFilter, carrierFilter, channelFilter, etdFrom, etdTo]);

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentLists });
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

  const createCostMutation = useMutation({
    mutationFn: ({ payload, shipmentId }: { payload: ShipmentCostPayload; shipmentId: string }) =>
      createShipmentCost(shipmentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: ({ costId, payload }: { costId: string; payload: Partial<ShipmentCostPayload> }) =>
      updateShipmentCost(costId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: (costId: string) => deleteShipmentCost(costId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    },
  });

  const handleDeliveryOrderChange = (value: string | null) => {
    const deliveryOrderId = value ?? '';
    const deliveryOrder = availableDeliveryOrders.find((item) => item.id === deliveryOrderId);
    setNewDeliveryOrderId(deliveryOrderId);
    setNewDoNumber(deliveryOrder?.do_no ?? deliveryOrder?.delivery_order_no ?? '');
    setNewPoNumber(deliveryOrder?.purchase_order?.po_no ?? '');
    setNewMode(deliveryOrder ? inferShipmentModeFromDeliveryOrder(deliveryOrder) : 'SEA');
    setNewOriginPort(deliveryOrder?.origin_address ?? '');
    setNewDestPort(deliveryOrder?.destination_address ?? '');
    setNewEtd(deliveryOrder?.planned_etd?.slice(0, 10) ?? '');
    setNewEta(deliveryOrder?.planned_eta?.slice(0, 10) ?? '');
  };

  const handleCreateShipment = () => {
    if (!newDeliveryOrderId) return;
    createMutation.mutate({
      blAwbNo: newBlAwbNo || undefined,
      deliveryOrderId: newDeliveryOrderId,
      destPort: newDestPort || undefined,
      eta: newEta || undefined,
      etd: newEtd || undefined,
      shipmentNumber: newShpNumber || undefined,
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
          t('shipments.links'),
          t('common.carrier'),
          t('common.route'),
          t('shipments.etd'),
          t('shipments.eta'),
          t('common.status'),
          t('shipments.channel'),
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
                  disabled={!newDeliveryOrderId}
                  loading={createMutation.isPending}
                >
                  {t('shipments.create')}
                </Button>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <TextInput
                label={t('shipments.shipmentNumber')}
                placeholder={t('shipments.autoGeneratedIfBlank')}
                value={newShpNumber}
                onChange={(e) => setNewShpNumber(e.currentTarget.value)}
              />
              <Select
                label={t('shipments.linkedDo')}
                placeholder={t('shipments.selectConfirmedDo')}
                data={deliveryOrderOptions}
                value={newDeliveryOrderId || null}
                onChange={handleDeliveryOrderChange}
                searchable
                nothingFoundMessage={
                  availableDeliveryOrdersQuery.isLoading
                    ? t('shipments.loadingDeliveryOrders')
                    : t('shipments.noConfirmedDo')
                }
                required
              />
              <TextInput
                label={t('shipments.linkedPo')}
                placeholder={t('shipments.poNumberPlaceholder')}
                value={newPoNumber}
                readOnly
              />
              <Select
                label={t('shipments.shipmentMode')}
                data={translatedShipmentModeOptions}
                value={newMode}
                onChange={(value) => setNewMode((value as ShipmentModeV1 | null) ?? 'SEA')}
              />
              <TextInput
                label={t('shipments.carrier')}
                placeholder={t('shipments.carrierPlaceholder')}
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
                label={t('shipments.voyageNumber')}
                placeholder={t('shipments.voyageNumberPlaceholder')}
                value={newVoyageNo}
                onChange={(e) => setNewVoyageNo(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.blAwb')}
                placeholder={t('shipments.blAwbPlaceholder')}
                value={newBlAwbNo}
                onChange={(e) => setNewBlAwbNo(e.currentTarget.value)}
              />
              <TextInput
                label="POL"
                placeholder={t('shipments.portOfLoading')}
                value={newOriginPort}
                onChange={(e) => setNewOriginPort(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.portOfDischarge')}
                placeholder={t('shipments.portOfDischarge')}
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
        <ShipmentDetailView
          shipment={selectedShipment}
          isMilestoneSaving={milestoneMutation.isPending}
          onMarkMilestone={(milestoneCode, payload) => {
            milestoneMutation.mutate({
              actualAt: payload.actualAt,
              milestoneCode,
              notes: payload.notes,
              shipmentId: selectedShipment.id,
            });
          }}
          isDocumentSaving={updateDocumentMutation.isPending || createDocumentMutation.isPending}
          onCreateDocument={(payload) => {
            createDocumentMutation.mutate({ payload, shipmentId: selectedShipment.id });
          }}
          onUpdateDocument={(documentId, payload) => {
            updateDocumentMutation.mutate({ documentId, payload });
          }}
          isCostSaving={createCostMutation.isPending || updateCostMutation.isPending || deleteCostMutation.isPending}
          onCreateCost={(payload) => {
            createCostMutation.mutate({ payload, shipmentId: selectedShipment.id });
          }}
          onUpdateCost={(costId, payload) => {
            updateCostMutation.mutate({ costId, payload });
          }}
          onDeleteCost={(costId) => {
            deleteCostMutation.mutate(costId);
          }}
          t={t}
        />
      ) : null}

      {workbench === 'list' ? (
        <ShipmentListView
          carrierOptions={carrierOptions}
          filteredShipments={filteredShipments}
          isFetching={isFetching}
          onSelectShipment={(shp) => {
            setSelectedShpId(shp.id);
            setWorkbench('detail');
            openShpParam(shp.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
          }}
          tabCounts={tabCounts}
        />
      ) : null}
    </Stack>
  );
}
