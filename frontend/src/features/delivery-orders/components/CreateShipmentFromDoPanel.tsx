import { Alert, Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconAnchor } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DateField } from '@shared/components/DateField';
import type { DeliveryOrder } from '@shared/api/logistics';
import { createShipment } from '@shared/api/logistics';
import type { ShipmentLoadTypeV1, ShipmentModeV1 } from '@shared/api/shipments';
import { queryKeys } from '@shared/api/queryKeys';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';
import { loadTypeForMode } from '@features/shipments/model/shipmentModel';

function inferMode(shippingMethod: DeliveryOrder['logistics_shipping']['shipping_method']): ShipmentModeV1 {
  if (shippingMethod === 'AIR') return 'AIR';
  if (shippingMethod === 'ROAD') return 'ROAD';
  return 'SEA';
}

export function CreateShipmentFromDoPanel({
  deliveryOrder,
  onClose,
  opened,
}: {
  deliveryOrder: DeliveryOrder;
  onClose: () => void;
  opened: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { transportModes } = useTradeMasterDataOptions();

  const shipping = deliveryOrder.logistics_shipping;
  const doNumber = deliveryOrder.order_info.order_number;
  const poNumber = deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number ?? '';

  const [shipmentNumber, setShipmentNumber] = useState('');
  const [mode, setMode] = useState<ShipmentModeV1>(inferMode(shipping.shipping_method));
  const [loadType, setLoadType] = useState<ShipmentLoadTypeV1 | null>(loadTypeForMode(inferMode(shipping.shipping_method))[0]?.value ?? null);
  const [carrier, setCarrier] = useState('');
  const [vesselVoyage, setVesselVoyage] = useState('');
  const [blAwbNo, setBlAwbNo] = useState('');
  const [originPort, setOriginPort] = useState(shipping.port_of_departure ?? '');
  const [destPort, setDestPort] = useState(shipping.port_of_destination ?? '');
  const [etd, setEtd] = useState(shipping.etd_planned ?? '');
  const [eta, setEta] = useState(shipping.eta_planned ?? '');
  const validShipmentModes = new Set(['SEA', 'AIR', 'ROAD', 'RAIL', 'MULTIMODAL', 'TRUCKING', 'OTHER']);
  const currentMode = inferMode(shipping.shipping_method);
  const shipmentModeOptions = transportModes
    .filter((transportMode) => validShipmentModes.has(transportMode.mode_code))
    .map((transportMode) => ({
      label: `${transportMode.mode_code} - ${transportMode.mode_name}`,
      value: transportMode.mode_code as ShipmentModeV1,
    }));
  if (!shipmentModeOptions.some((option) => option.value === currentMode)) {
    shipmentModeOptions.unshift({ label: t(`shipments.mode${currentMode.slice(0, 1)}${currentMode.slice(1).toLowerCase()}`), value: currentMode });
  }
  const loadTypeOptions = loadTypeForMode(mode).map((option) => ({
    label: t(option.labelKey),
    value: option.value,
  }));

  // Re-seed the form from the DO every time the panel opens so prefilled
  // route/date values follow the currently selected delivery order.
  useEffect(() => {
    if (!opened) return;
    setShipmentNumber('');
    const inferredMode = inferMode(shipping.shipping_method);
    setMode(inferredMode);
    setLoadType(loadTypeForMode(inferredMode)[0]?.value ?? null);
    setCarrier('');
    setVesselVoyage('');
    setBlAwbNo('');
    setOriginPort(shipping.port_of_departure ?? '');
    setDestPort(shipping.port_of_destination ?? '');
    setEtd(shipping.etd_planned ?? '');
    setEta(shipping.eta_planned ?? '');
  }, [opened, shipping]);

  const createMutation = useMutation({
    mutationFn: () =>
      createShipment({
        deliveryOrderId: deliveryOrder.id,
        doNumber,
        poNumber: poNumber || undefined,
        shipmentNumber: shipmentNumber.trim() || undefined,
        shippingMode: mode,
        loadType,
        carrierName: carrier.trim() || undefined,
        vesselVoyage: vesselVoyage.trim() || undefined,
        blAwbNo: blAwbNo.trim() || undefined,
        originPort: originPort.trim() || undefined,
        destPort: destPort.trim() || undefined,
        etd: etd || undefined,
        eta: eta || undefined,
      }),
    onSuccess: (shipment) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentLists });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders });
      onClose();
      navigate(`/shipments?shp=${encodeURIComponent(shipment.shipment_number)}`);
    },
  });

  if (!opened) return null;

  return (
    <Paper withBorder p="lg" className="delivery-order-shipment-create-panel">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('shipments.createFromDoDescription', { poNumber: poNumber || t('shipments.fallbackPo') })}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label={t('shipments.shipmentNumber')}
            placeholder={t('shipments.autoGeneratedIfBlank')}
            value={shipmentNumber}
            onChange={(event) => setShipmentNumber(event.currentTarget.value)}
          />
          <Select
            label={t('shipments.shipmentMode')}
            data={shipmentModeOptions}
            value={mode}
            onChange={(value) => {
              const nextMode = (value as ShipmentModeV1 | null) ?? currentMode;
              const nextLoadTypes = loadTypeForMode(nextMode);
              setMode(nextMode);
              setLoadType((current) => (
                current && nextLoadTypes.some((option) => option.value === current)
                  ? current
                  : nextLoadTypes[0]?.value ?? null
              ));
            }}
          />
          {loadTypeOptions.length > 0 ? (
            <Select
              label={t('shipments.loadType')}
              data={loadTypeOptions}
              value={loadType}
              onChange={(value) => setLoadType(value as ShipmentLoadTypeV1 | null)}
            />
          ) : null}
          <TextInput label={t('quotations.carrier')} placeholder={t('shipments.carrierPlaceholder')} value={carrier} onChange={(event) => setCarrier(event.currentTarget.value)} />
          <TextInput label={t('shipments.vesselVoyage')} value={vesselVoyage} onChange={(event) => setVesselVoyage(event.currentTarget.value)} />
          <TextInput label={t('shipments.blAwb')} value={blAwbNo} onChange={(event) => setBlAwbNo(event.currentTarget.value)} />
          <TextInput label="POL" placeholder={t('shipments.portOfLoading')} value={originPort} onChange={(event) => setOriginPort(event.currentTarget.value)} />
          <TextInput label="POD" placeholder={t('shipments.portOfDischarge')} value={destPort} onChange={(event) => setDestPort(event.currentTarget.value)} />
          <DateField label="ETD" value={etd} onChange={(value) => setEtd(value ?? '')} />
          <DateField label="ETA" value={eta} onChange={(value) => setEta(value ?? '')} />
        </SimpleGrid>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {getApiErrorMessage(createMutation.error, t('forms.apiUnknownError'))}
          </Alert>
        ) : null}

        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button leftSection={<IconAnchor size={16} />} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {t('deliveryOrders.createShipmentAction')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
