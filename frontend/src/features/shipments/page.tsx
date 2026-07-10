import { Button, SimpleGrid, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAnchor, IconCheck, IconClock, IconPlus, IconShield, IconShip } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { Metric } from '@shared/components/Metric';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { fetchShipments } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

import {
  computeShipmentTabCounts,
  filterShipments,
  type ShipmentWorkbench,
} from './model/shipmentModel';
import { useShipmentsUiStore } from './model/shipmentsUiStore';
import { useShipmentMutations } from './hooks/useShipmentMutations';
import { CreateShipmentPanel } from './components/CreateShipmentPanel';
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

  const shipmentsQuery = useQuery({
    queryKey: queryKeys.shipments,
    queryFn: fetchShipments,
  });
  const shipments = shipmentsQuery.data ?? [];
  const isFetching = shipmentsQuery.isFetching;

  const {
    createCostMutation,
    createDocumentMutation,
    deleteCostMutation,
    milestoneMutation,
    updateCostMutation,
    updateDocumentMutation,
  } = useShipmentMutations();

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

  const filteredShipments = useMemo(
    () => filterShipments(shipments, { activeTab, carrierFilter, channelFilter, etdFrom, etdTo, modeFilter, search }),
    [shipments, activeTab, search, modeFilter, carrierFilter, channelFilter, etdFrom, etdTo],
  );

  const tabCounts = useMemo(() => computeShipmentTabCounts(shipments), [shipments]);

  const selectedShipment =
    selectedShpId === null
      ? null
      : filteredShipments.find((s) => s.id === selectedShpId) ??
      shipments.find((s) => s.id === selectedShpId) ??
      null;

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
        <PageHeader
          icon={<IconShip size={20} />}
          title={t('shipments.title')}
          subtitle={t('shipments.subtitle')}
          actions={
            <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>
              {t('shipments.create')}
            </Button>
          }
        />
      ) : null}

      {workbench === 'list' ? (
        <SimpleGrid cols={{ base: 1, sm: 4 }} className="dl-metrics-strip">
          <Metric label={t('shipments.total')} value={shipments.length} color="blue" icon={<IconAnchor size={22} />} />
          <Metric label={t('shipments.inTransit')} value={tabCounts.in_transit} color="orange" icon={<IconClock size={22} />} />
          <Metric label={t('shipments.customsProcessing')} value={tabCounts.customs} color="yellow" icon={<IconShield size={22} />} />
          <Metric label={t('shipments.delivered')} value={tabCounts.delivered} color="teal" icon={<IconCheck size={22} />} />
        </SimpleGrid>
      ) : null}

      {workbench === 'create' ? (
        <CreateShipmentPanel
          onClose={closeWorkbench}
          onCreated={(newShipment) => {
            setSelectedShpId(newShipment.id);
            setWorkbench('detail');
            openShpParam(newShipment.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
          }}
        />
      ) : null}

      {workbench === 'detail' && selectedShipment ? (
        <ShipmentDetailView
          onBack={closeWorkbench}
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
