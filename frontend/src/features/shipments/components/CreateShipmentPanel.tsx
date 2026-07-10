import { Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { DateField } from '@shared/components/DateField';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { FieldPair } from '@shared/components/FieldPair';
import { createShipment } from '@shared/api/logistics';
import { fetchDeliveryOrdersV1 } from '@shared/api/deliveryOrders';
import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentLoadTypeV1, ShipmentModeV1 } from '@shared/api/shipments';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import {
  inferShipmentModeFromDeliveryOrder,
  isDeliveryOrderShipmentEligible,
  loadTypeForMode,
  shipmentModeOptions,
} from '../model/shipmentModel';

type CreateShipmentPanelProps = {
  onClose: () => void;
  onCreated: (shipment: ShipmentRecord) => void;
};

export function CreateShipmentPanel({ onClose, onCreated }: CreateShipmentPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [newShpNumber, setNewShpNumber] = useState('');
  const [newDeliveryOrderId, setNewDeliveryOrderId] = useState('');
  const [newDoNumber, setNewDoNumber] = useState('');
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newMode, setNewMode] = useState<ShipmentModeV1>('SEA');
  const [newLoadType, setNewLoadType] = useState<ShipmentLoadTypeV1 | null>('FCL');
  const [newCarrier, setNewCarrier] = useState('');
  const [newVoyage, setNewVoyage] = useState('');
  const [newVoyageNo, setNewVoyageNo] = useState('');
  const [newBlAwbNo, setNewBlAwbNo] = useState('');
  const [newOriginPort, setNewOriginPort] = useState('');
  const [newDestPort, setNewDestPort] = useState('');
  const [newEtd, setNewEtd] = useState('');
  const [newEta, setNewEta] = useState('');

  // Reversed flow: quotation no longer gates the DO, so eligible DOs are not one status.
  // Fetch broadly and filter client-side with the shared reversed-flow predicate (matches the
  // backend gate + the DO detail "Create Shipment" button).
  const availableDeliveryOrdersQuery = useQuery({
    queryKey: queryKeys.deliveryOrdersList({ page: 1, limit: 100 }),
    queryFn: () => fetchDeliveryOrdersV1({ page: 1, limit: 100 }),
  });
  const availableDeliveryOrders = (availableDeliveryOrdersQuery.data?.data ?? []).filter(
    isDeliveryOrderShipmentEligible,
  );
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
  const loadTypeOptions = useMemo(
    () =>
      loadTypeForMode(newMode).map((option) => ({
        label: t(option.labelKey),
        value: option.value,
      })),
    [newMode, t],
  );

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: (newShipment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
      onCreated(newShipment);
    },
  });

  const handleDeliveryOrderChange = (value: string | null) => {
    const deliveryOrderId = value ?? '';
    const deliveryOrder = availableDeliveryOrders.find((item) => item.id === deliveryOrderId);
    setNewDeliveryOrderId(deliveryOrderId);
    setNewDoNumber(deliveryOrder?.do_no ?? deliveryOrder?.delivery_order_no ?? '');
    setNewPoNumber(deliveryOrder?.purchase_order?.po_no ?? '');
    const inferredMode = deliveryOrder ? inferShipmentModeFromDeliveryOrder(deliveryOrder) : 'SEA';
    setNewMode(inferredMode);
    setNewLoadType(loadTypeForMode(inferredMode)[0]?.value ?? null);
    setNewOriginPort(deliveryOrder?.origin_address ?? '');
    setNewDestPort(deliveryOrder?.destination_address ?? '');
    setNewEtd(deliveryOrder?.planned_etd?.slice(0, 10) ?? '');
    setNewEta(deliveryOrder?.planned_eta?.slice(0, 10) ?? '');
  };

  const handleModeChange = (value: string | null) => {
    const nextMode = (value as ShipmentModeV1 | null) ?? 'SEA';
    const nextLoadTypes = loadTypeForMode(nextMode);
    setNewMode(nextMode);
    setNewLoadType((current) => (
      current && nextLoadTypes.some((option) => option.value === current)
        ? current
        : nextLoadTypes[0]?.value ?? null
    ));
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
      loadType: newLoadType,
      carrierName: newCarrier || undefined,
      originPort: newOriginPort || undefined,
      vesselVoyage: newVoyage || undefined,
      voyageNo: newVoyageNo || undefined,
    });
  };

  return (
    <Stack gap="sm">
      <FeatureHeaderShell backLabel={t('common.back')} onBack={onClose}>
        <Group justify="space-between" align="flex-start" gap="sm" className="shipment-create-command feature-form-hero feature-hero-layout">
          <div className="feature-hero-identity">
            <Title order={3}>{t('shipments.create')}</Title>
            <Text size="sm" c="dimmed">
              {t('shipments.createHint')}
            </Text>
          </div>
          <Group gap="xs" className="feature-hero-actions">
            <Button
              onClick={handleCreateShipment}
              leftSection={<IconPlus size={16} />}
              disabled={!newDeliveryOrderId}
              loading={createMutation.isPending}
            >
              {t('shipments.create')}
            </Button>
          </Group>
        </Group>
      </FeatureHeaderShell>

      <Paper withBorder p="sm" className="shipment-create-panel">
        <Stack gap="sm">
          <div className="shipment-create-layout">
            <div className="shipment-create-source">
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
              <div className="shipment-create-facts">
                <FieldPair className="shipment-create-fact" label={t('shipments.linkedDo')} value={newDoNumber || '-'} />
                <FieldPair className="shipment-create-fact" label={t('shipments.linkedPo')} value={newPoNumber || t('shipments.poNumberPlaceholder')} />
                <FieldPair
                  className="shipment-create-fact"
                  label={t('shipments.shipmentMode')}
                  value={translatedShipmentModeOptions.find((option) => option.value === newMode)?.label ?? newMode}
                />
              </div>
            </div>

            <div className="shipment-create-fields">
              <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="sm">
                <TextInput
                  label={t('shipments.shipmentNumber')}
                  placeholder={t('shipments.autoGeneratedIfBlank')}
                  value={newShpNumber}
                  onChange={(e) => setNewShpNumber(e.currentTarget.value)}
                />
                <Select
                  label={t('shipments.shipmentMode')}
                  data={translatedShipmentModeOptions}
                  value={newMode}
                  onChange={handleModeChange}
                />
                {loadTypeOptions.length > 0 ? (
                  <Select
                    label={t('shipments.loadType')}
                    data={loadTypeOptions}
                    value={newLoadType}
                    onChange={(value) => setNewLoadType(value as ShipmentLoadTypeV1 | null)}
                  />
                ) : null}
                <TextInput
                  label={t('shipments.carrier')}
                  placeholder={t('shipments.carrierPlaceholder')}
                  value={newCarrier}
                  onChange={(e) => setNewCarrier(e.currentTarget.value)}
                />
                <TextInput
                  label={t('shipments.blAwb')}
                  placeholder={t('shipments.blAwbPlaceholder')}
                  value={newBlAwbNo}
                  onChange={(e) => setNewBlAwbNo(e.currentTarget.value)}
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
                <DateField
                  label={t('shipments.etd')}
                  value={newEtd}
                  onChange={(value) => setNewEtd(value ?? '')}
                />
                <DateField
                  label={t('shipments.eta')}
                  value={newEta}
                  onChange={(value) => setNewEta(value ?? '')}
                />
              </SimpleGrid>
            </div>
          </div>
        </Stack>
      </Paper>
    </Stack>
  );
}
