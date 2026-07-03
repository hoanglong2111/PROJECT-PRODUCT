import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconTruckDelivery } from '@tabler/icons-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { CreateDeliveryOrderFromLotsPayload } from '@shared/api/deliveryOrders';
import type { PoLot, PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { DateTimeField } from '@shared/components/DateField';
import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { nullIfEmpty, resolveCreateDoFromLotsDefaults } from '../model/purchaseOrderModel';

type CreateDoFromLotsDraft = {
  delivery_order_no: string;
  requested_pickup_date: string;
  planned_etd: string;
  planned_eta: string;
  origin_address: string;
  destination_address: string;
  notes: string;
};

export function CreateDoFromLotsModal({
  error,
  loading,
  lots,
  onClose,
  onSubmit,
  opened,
  purchaseOrder,
}: {
  error: unknown;
  loading: boolean;
  lots: PoLot[];
  onClose: () => void;
  onSubmit: (payload: CreateDeliveryOrderFromLotsPayload) => void;
  opened: boolean;
  purchaseOrder: PurchaseOrderV1;
}) {
  const { t } = useI18n();
  const lotKey = lots.map((lot) => lot.id).join('|');
  const defaults = useMemo(
    () => resolveCreateDoFromLotsDefaults(lots, purchaseOrder),
    [lotKey, lots, purchaseOrder],
  );
  const [draft, setDraft] = useState<CreateDoFromLotsDraft>(() => buildDraft(defaults, purchaseOrder.po_no));

  useEffect(() => {
    if (!opened) return;
    setDraft(buildDraft(defaults, purchaseOrder.po_no));
  }, [defaults, opened, purchaseOrder.po_no]);

  const canSubmit = lots.length > 0 && Boolean(draft.origin_address.trim() && draft.destination_address.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const deliveryOrderNo = draft.delivery_order_no.trim();
    onSubmit({
      lot_ids: lots.map((lot) => lot.id),
      ...(deliveryOrderNo ? { delivery_order_no: deliveryOrderNo } : {}),
      requested_pickup_date: nullIfEmpty(draft.requested_pickup_date),
      planned_etd: nullIfEmpty(draft.planned_etd),
      planned_eta: nullIfEmpty(draft.planned_eta),
      origin_address: nullIfEmpty(draft.origin_address),
      destination_address: nullIfEmpty(draft.destination_address),
      notes: nullIfEmpty(draft.notes),
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={loading ? () => undefined : onClose}
      title={
        <ModalTitle
          feature="purchase-orders"
          icon={<IconTruckDelivery size={18} stroke={1.8} />}
          title={t('purchaseOrders.createDoFromLotsTitle')}
          subtitle={purchaseOrder.po_no}
        />
      }
      size="xl"
      classNames={{ body: 'purchase-order-create-do-modal-body' }}
    >
      <Stack component="form" gap="md" onSubmit={handleSubmit} className="purchase-order-create-do-form">
        {error ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(error)}
          </Alert>
        ) : null}

        <Paper withBorder p="sm" className="purchase-order-create-do-route">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4} className="purchase-order-create-do-copy">
              <Group gap="xs" wrap="nowrap">
                <IconTruckDelivery size={18} />
                <Text fw={800}>{purchaseOrder.po_no}</Text>
                <Badge variant="light">{t('purchaseOrders.selectedLots', { count: lots.length })}</Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {t('purchaseOrders.createDoFromLotsDescription')}
              </Text>
            </Stack>

            <Group gap="xs" wrap="nowrap" className="purchase-order-create-do-route-chip">
              <Text fw={800} size="sm" truncate title={draft.origin_address}>
                {draft.origin_address || t('purchaseOrders.portOfLoading')}
              </Text>
              <IconArrowRight size={16} />
              <Text fw={800} size="sm" truncate title={draft.destination_address}>
                {draft.destination_address || t('purchaseOrders.portOfDischarge')}
              </Text>
            </Group>
          </Group>
        </Paper>

        <div className="purchase-order-create-do-lots">
          {lots.map((lot) => (
            <Badge key={lot.id} variant="light" radius="sm" className="purchase-order-nowrap-badge">
              {lot.lot_no}
            </Badge>
          ))}
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2 }} className="purchase-order-modal-grid">
          <TextInput
            label={t('purchaseOrders.deliveryOrderNo')}
            description={t('purchaseOrders.deliveryOrderNoHint')}
            value={draft.delivery_order_no}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, delivery_order_no: value }));
            }}
          />
          <DateTimeField
            label={t('purchaseOrders.requestedPickupDate')}
            value={draft.requested_pickup_date}
            onChange={(value) => setDraft((current) => ({ ...current, requested_pickup_date: value ?? '' }))}
          />
          <TextInput
            label={t('purchaseOrders.portOfLoading')}
            value={draft.origin_address}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, origin_address: value }));
            }}
            required
          />
          <TextInput
            label={t('purchaseOrders.portOfDischarge')}
            value={draft.destination_address}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, destination_address: value }));
            }}
            required
          />
          <DateTimeField
            label="ETD"
            value={draft.planned_etd}
            onChange={(value) => setDraft((current) => ({ ...current, planned_etd: value ?? '' }))}
          />
          <DateTimeField
            label="ETA"
            value={draft.planned_eta}
            onChange={(value) => setDraft((current) => ({ ...current, planned_eta: value ?? '' }))}
          />
        </SimpleGrid>

        <Textarea
          label={t('common.notes')}
          value={draft.notes}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setDraft((current) => ({ ...current, notes: value }));
          }}
          autosize
          minRows={3}
        />

        <Group justify="flex-end" wrap="nowrap" className="purchase-order-modal-footer">
          <Button className="purchase-order-action-button" variant="subtle" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            className="purchase-order-action-button"
            color="teal"
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            leftSection={<IconTruckDelivery size={16} />}
          >
            {t('purchaseOrders.createInternalDo')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function buildDraft(
  defaults: ReturnType<typeof resolveCreateDoFromLotsDefaults>,
  poNo: string,
): CreateDoFromLotsDraft {
  return {
    delivery_order_no: '',
    requested_pickup_date: defaults.requested_pickup_date,
    planned_etd: defaults.planned_etd,
    planned_eta: defaults.planned_eta,
    origin_address: defaults.origin_port,
    destination_address: defaults.destination_port,
    notes: `Created from PO ${poNo} LOT Planning`,
  };
}
