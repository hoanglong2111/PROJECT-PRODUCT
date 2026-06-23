import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconAlertTriangle, IconTruck, IconX } from '@tabler/icons-react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  consolidateDomesticTransportOrder,
  createDomesticTransportOrderFromShipment,
} from '@shared/api/domesticTransportOrders';
import type { ShipmentRecord } from '@shared/api/logistics';
import {
  fetchShipmentContainers,
  type ShipmentContainerV1,
} from '@shared/api/shipmentContainers';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { queryKeys } from '@shared/api/queryKeys';

type ContainerRow = ShipmentContainerV1 & { _shipmentNumber: string };

export function CreateDtoFromShipmentModal({
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
        queryKey: queryKeys.suppliers({ page: 1, limit: 100, role: 'TRUCKING_VENDOR', is_active: true }),
        queryFn: () => fetchSuppliers({ page: 1, limit: 100, role: 'TRUCKING_VENDOR', is_active: true }),
      },
    ],
  })[0];
  const truckVendorOptions = (truckVendorsQuery.data?.data ?? []).map((supplier) => ({
    label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
    value: supplier.id,
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
      if (shipments.length === 0) throw new Error('No shipment selected');
      if (podMismatch) {
        throw new Error('Selected shipments must share the same discharge port (POD) to consolidate into one DTO.');
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

  const title = isConsolidation
    ? `Consolidate ${shipments.length} shipments into one DTO`
    : `Create DTO from ${shipments[0]?.shipment_number ?? ''}`;

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
      <Stack gap="md">
        <Alert color={isConsolidation ? 'orange' : 'teal'} icon={<IconTruck size={18} />}>
          {isConsolidation
            ? 'Consolidation: one truck run (one DTO) will serve all selected shipments. This is valid only for LCL cargo arriving at the same discharge port and going to the same warehouse.'
            : 'A Domestic Transport Order arranges last-mile trucking for a customs-cleared shipment. Pick the containers this truck run will haul; leave empty to create the DTO without container allocation.'}
        </Alert>

        {podMismatch && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            The selected shipments have different discharge ports ({distinctPods.join(', ')}). One truck run
            cannot pick up from multiple ports — select shipments that share the same POD.
          </Alert>
        )}

        <div>
          <Text fw={600} size="sm" mb={4}>Containers</Text>
          {containersLoading ? (
            <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">Loading containers...</Text></Group>
          ) : containerRows.length === 0 ? (
            <Text size="sm" c="dimmed">
              No containers on the selected shipment(s). The DTO will be created without container allocation.
            </Text>
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
                          <Badge size="xs" color="gray">Allocated to {container.dto_id}</Badge>
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
        </div>

        <Select
          label="Truck vendor"
          placeholder="Default trucking vendor"
          data={truckVendorOptions}
          value={truckVendorId}
          onChange={setTruckVendorId}
          searchable
          clearable
          nothingFoundMessage={truckVendorsQuery.isLoading ? 'Loading vendors...' : 'No trucking vendor'}
        />

        <Group grow>
          <TextInput
            label="Warehouse"
            value={warehouse}
            onChange={(event) => setWarehouse(event.currentTarget.value)}
          />
          <TextInput
            label="Scheduled pickup"
            type="date"
            value={pickupDate}
            onChange={(event) => setPickupDate(event.currentTarget.value)}
          />
        </Group>

        <Textarea
          label="Note"
          placeholder="Optional dispatch note"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          autosize
          minRows={2}
        />

        {createMutation.isError && (
          <Alert color="red" icon={<IconX size={16} />}>
            {createMutation.error instanceof Error ? createMutation.error.message : 'Could not create DTO'}
          </Alert>
        )}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button
            leftSection={<IconTruck size={16} />}
            loading={createMutation.isPending}
            disabled={podMismatch || shipments.length === 0}
            onClick={() => createMutation.mutate()}
          >
            {isConsolidation ? `Create consolidated DTO (${shipments.length})` : 'Create DTO'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
