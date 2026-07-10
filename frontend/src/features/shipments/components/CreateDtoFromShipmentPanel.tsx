import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconBox, IconTruck, IconX } from '@tabler/icons-react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  consolidateDomesticTransportOrder,
  createDomesticTransportOrderFromShipment,
} from '@shared/api/domesticTransportOrders';
import { DateTimeField } from '@shared/components/DateField';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import type { ShipmentRecord } from '@shared/api/logistics';
import { fetchShipmentContainers, type ShipmentContainerV1 } from '@shared/api/shipmentContainers';
import { fetchForwarders } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { ContainerDraftForm, SectionHeading } from './ContainerDraftForm';

type ContainerRow = ShipmentContainerV1 & { _shipmentNumber: string };

export function CreateDtoFromShipmentPanel({
  onClose,
  onCreated,
  opened,
  shipments,
}: {
  onClose: () => void;
  onCreated?: () => void;
  opened: boolean;
  shipments: ShipmentRecord[];
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);
  const [truckVendorId, setTruckVendorId] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState('KBI Main Warehouse');
  const [pickupDate, setPickupDate] = useState('');
  const [note, setNote] = useState('');

  const isConsolidation = shipments.length > 1;
  const distinctPods = useMemo(
    () => Array.from(new Set(shipments.map((shipment) => shipment.dest_port || '—'))),
    [shipments],
  );
  const podMismatch = isConsolidation && distinctPods.length > 1;

  const containerQueries = useQueries({
    queries: shipments.map((shipment) => ({
      enabled: opened,
      queryKey: queryKeys.shipmentContainers(shipment.id),
      queryFn: () => fetchShipmentContainers(shipment.id),
    })),
  });
  const containersLoading = containerQueries.some((query) => query.isLoading);

  const containerRows: ContainerRow[] = useMemo(() => {
    return shipments.flatMap((shipment, index) =>
      (containerQueries[index]?.data ?? []).map((container) => ({
        ...container,
        _shipmentNumber: shipment.shipment_number,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipments, containerQueries.map((query) => query.dataUpdatedAt).join(',')]);

  const truckVendorsQuery = useQueries({
    queries: [
      {
        enabled: opened,
        queryKey: queryKeys.forwarders({ page: 1, limit: 100, is_active: true }),
        queryFn: () => fetchForwarders({ page: 1, limit: 100, is_active: true }),
      },
    ],
  })[0];
  const truckVendorOptions = (truckVendorsQuery.data?.data ?? [])
    .filter((forwarder) => forwarder.forwarder_type === 'TRUCKING' || forwarder.forwarder_type === 'MULTI')
    .map((forwarder) => ({
      label: `${forwarder.forwarder_code} - ${forwarder.forwarder_name}`,
      value: forwarder.id,
    }));

  useEffect(() => {
    if (opened) {
      setSelectedContainerIds([]);
      setTruckVendorId(null);
      setWarehouse('KBI Main Warehouse');
      setPickupDate('');
      setNote('');
    }
  }, [opened, shipments.map((shipment) => shipment.id).join(',')]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (shipments.length === 0) throw new Error(t('shipments.noShipmentSelected'));
      if (podMismatch) {
        throw new Error(t('shipments.selectedShipmentsSamePod'));
      }

      const [primary, ...others] = shipments;
      const containerIds = selectedContainerIds.length ? selectedContainerIds : undefined;

      // Single shipment: existing one-shot create endpoint.
      if (others.length === 0) {
        return createDomesticTransportOrderFromShipment(primary.id, {
          container_ids: containerIds,
          truck_vendor_id: truckVendorId || undefined,
          warehouse: warehouse || undefined,
          scheduled_pickup_at: pickupDate ? `${pickupDate}T01:00:00.000Z` : undefined,
          note: note || undefined,
        });
      }

      // Multiple shipments: one atomic consolidate endpoint (server handles link + container reassign).
      return consolidateDomesticTransportOrder({
        shipment_ids: shipments.map((shipment) => shipment.id),
        primary_shipment_id: primary.id,
        container_ids: containerIds,
        truck_vendor_id: truckVendorId || undefined,
        warehouse: warehouse || undefined,
        scheduled_pickup_at: pickupDate ? `${pickupDate}T01:00:00.000Z` : undefined,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      shipments.forEach((shipment) => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentDtos(shipment.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentContainers(shipment.id) });
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderLists });
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
      onCreated?.();
      onClose();
    },
  });

  const content = (
    <Stack gap="md">
      <Alert color={isConsolidation ? 'orange' : 'teal'} icon={<IconTruck size={18} />}>
        {isConsolidation
          ? t('shipments.dtoConsolidationInfo')
          : t('shipments.dtoCreateInfo')}
      </Alert>

      {podMismatch && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {t('shipments.podMismatch', { ports: distinctPods.join(', ') })}
        </Alert>
      )}

      <div>
        <SectionHeading icon={<IconBox size={16} />} title={t('shipments.containers')} />
        <Divider my="xs" />
        {containersLoading ? (
          <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">{t('shipments.loadingContainers')}</Text></Group>
        ) : containerRows.length === 0 ? (
          <Alert color="gray" variant="light" icon={<IconBox size={16} />}>
            {t('shipments.dtoNoContainers')}
          </Alert>
        ) : (
          <Checkbox.Group value={selectedContainerIds} onChange={setSelectedContainerIds}>
            <Stack gap="xs">
              {containerRows.map((container) => (
                <Checkbox
                  key={container.id}
                  value={container.id}
                  disabled={!!container.dto_id}
                  label={
                    <Group gap="xs">
                      <Text fw={600} size="sm">{container.container_no}</Text>
                      <Badge size="xs" variant="light">{container.container_type ?? '-'}</Badge>
                      {isConsolidation && (
                        <Badge size="xs" variant="outline" color="gray">{container._shipmentNumber}</Badge>
                      )}
                      {container.dto_id ? (
                        <Badge size="xs" color="gray">{t('shipments.allocatedToDto', { dto: container.dto_id })}</Badge>
                      ) : (
                        <Badge size="xs" color="teal" variant="light">{container.status}</Badge>
                      )}
                    </Group>
                  }
                />
              ))}
            </Stack>
          </Checkbox.Group>
        )}

        <ContainerDraftForm
          isConsolidation={isConsolidation}
          onContainerCreated={(containerId) => setSelectedContainerIds((prev) => [...prev, containerId])}
          podMismatch={podMismatch}
          shipments={shipments}
        />
      </div>

      <div>
        <SectionHeading icon={<IconTruck size={16} />} title={t('shipments.dispatchDetails')} />
        <Divider my="xs" />
      </div>

      <div className="shipment-dto-dispatch-grid">
        <Select
          label={t('shipments.truckVendor')}
          placeholder={t('shipments.truckVendorDefault')}
          data={truckVendorOptions}
          value={truckVendorId}
          onChange={setTruckVendorId}
          searchable
          clearable
          nothingFoundMessage={truckVendorsQuery.isLoading ? t('domesticTransportOrders.loadingVendors') : t('domesticTransportOrders.noVendor')}
        />
        <TextInput
          label={t('shipments.warehouse')}
          value={warehouse}
          onChange={(event) => setWarehouse(event.currentTarget.value)}
        />
        <DateTimeField
          label={t('shipments.scheduledPickup')}
          value={pickupDate}
          onChange={(value) => setPickupDate(value ?? '')}
        />
      </div>

      <Textarea
        label={t('shipments.note')}
        placeholder={t('shipments.optionalDispatchNote')}
        value={note}
        onChange={(event) => setNote(event.currentTarget.value)}
        autosize
        minRows={2}
      />

      {createMutation.isError && (
        <Alert color="red" icon={<IconX size={16} />}>
          {createMutation.error instanceof Error ? createMutation.error.message : t('shipments.dtosPanel.operationFailed')}
        </Alert>
      )}

      <Group justify="flex-end" gap="xs">
        <Button variant="subtle" onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          leftSection={<IconTruck size={16} />}
          loading={createMutation.isPending}
          disabled={podMismatch || shipments.length === 0}
          onClick={() => createMutation.mutate()}
        >
          {isConsolidation ? t('shipments.createConsolidatedDto', { count: shipments.length }) : t('shipments.createDto')}
        </Button>
      </Group>
    </Stack>
  );

  if (!opened) return null;

  return (
    <Stack gap="sm">
      <FeatureHeaderShell backLabel={t('common.back')} onBack={onClose}>
        <div className="feature-form-hero feature-hero-layout">
          <div className="feature-hero-identity">
            <Title order={3}>
              {isConsolidation
                ? t('shipments.createDtoTitle', { count: shipments.length })
                : t('shipments.createDtoFromShipment', { shipmentNumber: shipments[0]?.shipment_number ?? '' })}
            </Title>
          </div>
        </div>
      </FeatureHeaderShell>
      <Paper withBorder p="lg" className="shipment-dto-create-panel">
        {content}
      </Paper>
    </Stack>
  );
}
