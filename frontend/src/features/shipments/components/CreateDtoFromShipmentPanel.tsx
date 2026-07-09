import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconBox, IconInfoCircle, IconPlus, IconTruck, IconX } from '@tabler/icons-react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  containerTypeSelectOptions,
  fetchContainerTypes,
  findContainerType,
} from '@shared/api/containerTypes';
import {
  consolidateDomesticTransportOrder,
  createDomesticTransportOrderFromShipment,
} from '@shared/api/domesticTransportOrders';
import { DateTimeField } from '@shared/components/DateField';
import type { ShipmentRecord } from '@shared/api/logistics';
import {
  createShipmentContainer,
  fetchShipmentContainers,
  type ShipmentContainerV1,
} from '@shared/api/shipmentContainers';
import { fetchForwarders } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

type ContainerRow = ShipmentContainerV1 & { _shipmentNumber: string };

function formatSpecValue(value: number | null | undefined, suffix: string) {
  return value === null || value === undefined ? '-' : `${value.toLocaleString()} ${suffix}`;
}

function SectionHeading({ icon, title, caption }: { icon: ReactNode; title: string; caption?: string }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" size="md" radius="md">
        {icon}
      </ThemeIcon>
      <div>
        <Text fw={700} size="sm">{title}</Text>
        {caption ? <Text size="xs" c="dimmed">{caption}</Text> : null}
      </div>
    </Group>
  );
}

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
  const [newContainerNo, setNewContainerNo] = useState('');
  const [newContainerType, setNewContainerType] = useState<string | null>('40HC');
  const [newSeal, setNewSeal] = useState('');
  const [newGross, setNewGross] = useState<number | string>('');
  const [newCbm, setNewCbm] = useState<number | string>('');
  const [grossEdited, setGrossEdited] = useState(false);
  const [cbmEdited, setCbmEdited] = useState(false);
  const [addTargetShipmentId, setAddTargetShipmentId] = useState<string | null>(shipments[0]?.id ?? null);

  const isConsolidation = shipments.length > 1;
  const distinctPods = useMemo(
    () => Array.from(new Set(shipments.map((shipment) => shipment.dest_port || '—'))),
    [shipments],
  );
  const podMismatch = isConsolidation && distinctPods.length > 1;
  const shipmentTargetOptions = shipments.map((shipment) => ({
    label: shipment.shipment_number,
    value: shipment.id,
  }));
  // Which shipment a newly-added container attaches to. For a single shipment it is implicit;
  // when consolidating, the user picks via the target Select (defaults to the primary shipment).
  const addTargetId = isConsolidation
    ? addTargetShipmentId ?? shipments[0]?.id ?? null
    : shipments[0]?.id ?? null;

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

  const containerTypesQuery = useQuery({
    enabled: opened,
    queryKey: queryKeys.containerTypes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchContainerTypes({ page: 1, limit: 100, is_active: true }),
  });
  const containerTypes = containerTypesQuery.data?.data ?? [];
  const containerTypeOptions = useMemo(() => containerTypeSelectOptions(containerTypes), [containerTypes]);
  const selectedContainerType = findContainerType(containerTypes, newContainerType);

  useEffect(() => {
    if (opened) {
      setSelectedContainerIds([]);
      setTruckVendorId(null);
      setWarehouse('KBI Main Warehouse');
      setPickupDate('');
      setNote('');
      setNewContainerNo('');
      setNewContainerType('40HC');
      setNewSeal('');
      setNewGross('');
      setNewCbm('');
      setGrossEdited(false);
      setCbmEdited(false);
      setAddTargetShipmentId(shipments[0]?.id ?? null);
    }
  }, [opened, shipments.map((shipment) => shipment.id).join(',')]);

  useEffect(() => {
    if (!opened || containerTypeOptions.length === 0) return;
    if (newContainerType && containerTypeOptions.some((option) => option.value === newContainerType)) return;
    setNewContainerType(containerTypeOptions.some((option) => option.value === '40HC') ? '40HC' : containerTypeOptions[0].value);
  }, [containerTypeOptions, newContainerType, opened]);

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

  const addContainerMutation = useMutation({
    mutationFn: () => {
      if (!addTargetId) throw new Error(t('shipments.noShipmentSelected'));
      return createShipmentContainer(addTargetId, {
        container_no: newContainerNo.trim(),
        container_type: newContainerType,
        seal_no: newSeal || null,
        gross_weight_kg: newGross === '' ? null : Number(newGross),
        volume_cbm: newCbm === '' ? null : Number(newCbm),
        status: 'PLANNED',
      });
    },
    onSuccess: (created) => {
      if (addTargetId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentContainers(addTargetId) });
      }
      // Auto-select the container the user just added — that is why they added it.
      if (created?.id) setSelectedContainerIds((prev) => [...prev, created.id]);
      setNewContainerNo('');
      setNewSeal('');
      setNewGross('');
      setNewCbm('');
      setGrossEdited(false);
      setCbmEdited(false);
    },
  });

  const handleAddContainer = () => {
    if (!newContainerNo.trim()) return;
    addContainerMutation.mutate();
  };

  const handleContainerTypeChange = (value: string | null) => {
    setNewContainerType(value);
    const selected = findContainerType(containerTypes, value);
    if (!selected) return;
    if (!grossEdited && selected.gross_kg !== null) setNewGross(selected.gross_kg);
    if (!cbmEdited && selected.capacity_cbm !== null) setNewCbm(selected.capacity_cbm);
  };

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

        <Paper withBorder p="md" mt="sm" radius="md" className="shipment-dto-container-composer">
          <Stack gap="sm">
            <SectionHeading
              icon={<IconPlus size={16} />}
              title={t('shipments.addContainer')}
              caption={t('shipments.dtoAddContainerHint')}
            />
            <div className="shipment-dto-container-form">
              {isConsolidation && (
                <Select
                  className="shipment-dto-field-target"
                  label={t('shipments.dtoAddContainerTarget')}
                  data={shipmentTargetOptions}
                  value={addTargetShipmentId}
                  onChange={setAddTargetShipmentId}
                  allowDeselect={false}
                />
              )}
              <TextInput
                className="shipment-dto-field-container-no"
                label={t('shipments.containerNumber')}
                placeholder={t('shipments.containerNumberPlaceholder')}
                value={newContainerNo}
                onChange={(event) => setNewContainerNo(event.currentTarget.value)}
              />
              <Select
                className="shipment-dto-field-type"
                label={
                  <Group gap={4} wrap="nowrap">
                    <span>{t('shipments.containerType')}</span>
                    {selectedContainerType ? (
                      <Tooltip
                        multiline
                        w={220}
                        withArrow
                        label={
                          <Stack gap={2}>
                            <Text size="xs">Tare: {formatSpecValue(selectedContainerType.tare_kg, 'kg')}</Text>
                            <Text size="xs">Max gross: {formatSpecValue(selectedContainerType.gross_kg, 'kg')}</Text>
                            <Text size="xs">Capacity: {formatSpecValue(selectedContainerType.capacity_cbm, 'CBM')}</Text>
                          </Stack>
                        }
                      >
                        <IconInfoCircle size={14} style={{ cursor: 'help' }} />
                      </Tooltip>
                    ) : null}
                  </Group>
                }
                data={containerTypeOptions}
                value={newContainerType}
                onChange={handleContainerTypeChange}
                allowDeselect={false}
                searchable
                nothingFoundMessage={containerTypesQuery.isLoading ? t('masterData.loadingReferenceData') : t('masterData.noContainerTypes')}
              />
              <TextInput
                className="shipment-dto-field-seal"
                label={t('shipments.sealNumber')}
                placeholder={t('shipments.sealNumberPlaceholder')}
                value={newSeal}
                onChange={(event) => setNewSeal(event.currentTarget.value)}
              />
              <NumberInput
                className="shipment-dto-field-gross"
                label={t('shipments.grossWeightKg')}
                placeholder="0"
                value={newGross}
                onChange={(value) => {
                  setGrossEdited(true);
                  setNewGross(value);
                }}
                min={0}
              />
              <NumberInput
                className="shipment-dto-field-cbm"
                label={t('shipments.volumeCbm')}
                placeholder="0"
                value={newCbm}
                onChange={(value) => {
                  setCbmEdited(true);
                  setNewCbm(value);
                }}
                min={0}
              />
              <Button
                className="shipment-dto-container-add"
                variant="light"
                leftSection={<IconPlus size={16} />}
                loading={addContainerMutation.isPending}
                disabled={!newContainerNo.trim() || podMismatch}
                onClick={handleAddContainer}
              >
                {t('shipments.addContainer')}
              </Button>
            </div>
            {addContainerMutation.isError && (
              <Text size="xs" c="red">
                {addContainerMutation.error instanceof Error
                  ? addContainerMutation.error.message
                  : t('shipments.dtosPanel.operationFailed')}
              </Text>
            )}
          </Stack>
        </Paper>
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
    <Paper withBorder p="lg" className="shipment-dto-create-panel">
      {content}
    </Paper>
  );
}
