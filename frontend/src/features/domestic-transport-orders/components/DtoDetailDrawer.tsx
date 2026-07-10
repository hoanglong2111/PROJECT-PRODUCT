import { Alert, Badge, Drawer, Group, Stack } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  fetchDomesticTransportOrder,
  runDomesticTransportOrderAction,
  updateDomesticTransportOrder,
  type DomesticTransportOrderAction,
  type DomesticTransportOrderV1,
} from '@shared/api/domesticTransportOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { ModalTitle } from '@shared/components/ModalTitle';
import { PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';

import {
  fromDateTimeInput,
  getErrorMessage,
  initialForm,
  optionalString,
  toDateTimeInput,
  type FormState,
} from '../model/domesticTransportOrderModel';
import { DomesticTransportOrderDetail } from './DomesticTransportOrderDetail';

type DtoDetailDrawerProps = {
  dtoId: string | null;
  onClose: () => void;
  summary: DomesticTransportOrderV1 | null;
  truckVendorOptions: { label: string; value: string }[];
};

export function DtoDetailDrawer({ dtoId, onClose, summary, truckVendorOptions }: DtoDetailDrawerProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);

  const detailQuery = useQuery({
    enabled: Boolean(dtoId),
    queryKey: dtoId
      ? queryKeys.domesticTransportOrderDetail(dtoId)
      : queryKeys.domesticTransportOrderDetail('idle'),
    queryFn: () => fetchDomesticTransportOrder(dtoId ?? ''),
  });
  const selectedOrder = detailQuery.data ?? summary;

  useEffect(() => {
    if (!selectedOrder) {
      setForm(initialForm);
      return;
    }

    setForm({
      actualDeliveryAt: toDateTimeInput(selectedOrder.actual_delivery_at),
      actualPickupAt: toDateTimeInput(selectedOrder.actual_pickup_at),
      destination: selectedOrder.destination ?? '',
      driverIdentityNo: selectedOrder.driver_identity_no ?? '',
      driverName: selectedOrder.driver_name ?? '',
      driverPhone: selectedOrder.driver_phone ?? '',
      note: selectedOrder.note ?? '',
      origin: selectedOrder.origin ?? '',
      podDocumentRef: selectedOrder.pod_document_ref ?? '',
      quoteAmount: selectedOrder.quote_amount != null ? String(selectedOrder.quote_amount) : '',
      quoteCurrency: selectedOrder.quote_currency ?? '',
      scheduledDeliveryAt: toDateTimeInput(selectedOrder.scheduled_delivery_at),
      scheduledPickupAt: toDateTimeInput(selectedOrder.scheduled_pickup_at),
      truckVendorId: selectedOrder.truck_vendor_id,
      vehiclePlate: selectedOrder.vehicle_plate ?? '',
      vehicleType: selectedOrder.vehicle_type ?? '',
      warehouse: selectedOrder.warehouse ?? '',
    });
  }, [selectedOrder]);

  const refreshOrder = (id = dtoId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderLists });
    void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrderDetail(id) });
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrder) throw new Error(t('domesticTransportOrders.selectDtoFirst'));
      return updateDomesticTransportOrder(selectedOrder.id, {
        actual_delivery_at: fromDateTimeInput(form.actualDeliveryAt),
        actual_pickup_at: fromDateTimeInput(form.actualPickupAt),
        destination: optionalString(form.destination),
        driver_identity_no: optionalString(form.driverIdentityNo),
        driver_name: optionalString(form.driverName),
        driver_phone: optionalString(form.driverPhone),
        note: optionalString(form.note),
        origin: optionalString(form.origin),
        pod_document_ref: optionalString(form.podDocumentRef),
        quote_amount: form.quoteAmount.trim() ? Number(form.quoteAmount) : null,
        quote_currency: optionalString(form.quoteCurrency),
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
      if (!selectedOrder) throw new Error(t('domesticTransportOrders.selectDtoFirst'));
      return runDomesticTransportOrderAction(selectedOrder.id, action);
    },
    onSuccess: (updated) => refreshOrder(updated.id),
  });

  return (
    <Drawer
      opened={Boolean(dtoId)}
      onClose={onClose}
      position="right"
      size="85rem"
      title={
        <Group gap="xs" align="center">
          <ModalTitle
            feature="dto"
            title={selectedOrder?.dto_no ?? t('domesticTransportOrders.detailTitle')}
            subtitle={selectedOrder?.shipment?.shipment_no ?? selectedOrder?.shipment_id}
          />
          {detailQuery.isFetching ? <Badge variant="light">{t('common.loading')}</Badge> : null}
        </Group>
      }
    >
      <Stack gap="lg" style={{ minHeight: '100%' }}>
        {updateMutation.isError || actionMutation.isError ? (
          <Alert color="red" icon={<IconX size={18} />} className="dto-error-alert">
            {getErrorMessage(updateMutation.error ?? actionMutation.error, t('domesticTransportOrders.requestFailed'))}
          </Alert>
        ) : null}

        {selectedOrder ? (
          <DomesticTransportOrderDetail
            actionPending={actionMutation.isPending}
            form={form}
            isFetching={detailQuery.isFetching}
            onAction={(action) => actionMutation.mutate(action)}
            onChange={setForm}
            onSave={() => updateMutation.mutate()}
            order={selectedOrder}
            saving={updateMutation.isPending}
            truckVendorOptions={truckVendorOptions}
          />
        ) : (
          <PageLoading
            title={t('domesticTransportOrders.detailTitle')}
            description={t('domesticTransportOrders.loadingDescription')}
            metricCount={3}
          />
        )}
      </Stack>
    </Drawer>
  );
}
