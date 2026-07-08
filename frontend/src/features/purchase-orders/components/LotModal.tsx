import { Alert, Button, Group, Modal, Select, SimpleGrid, Stack, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { DateTimeField } from '@shared/components/DateField';
import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';
import type { PoLotStatus } from '@shared/api/purchaseOrders';
import { getApiErrorMessage } from '@shared/lib/errors';

import { lotStatusOptions, type LotDraft } from '../model/purchaseOrderModel';

export function LotModal({
  draft,
  error,
  loading,
  onClose,
  onSubmit,
}: {
  draft: LotDraft | null;
  error: unknown;
  loading: boolean;
  onClose: () => void;
  onSubmit: (draft: LotDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState<LotDraft | null>(draft);
  const { t } = useI18n();

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  return (
    <Modal
      opened={!!draft}
      onClose={onClose}
      title={
        <ModalTitle
          feature="purchase-orders"
          title={draft?.id ? t('purchaseOrders.editLotTitle') : t('purchaseOrders.createLotTitle')}
          subtitle={localDraft?.lot_no || undefined}
        />
      }
      size="lg"
    >
      {localDraft ? (
        <Stack
          component="form"
          className="purchase-order-lot-modal-form"
          gap="md"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(localDraft);
          }}
        >
          {error ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, md: 2 }} className="purchase-order-modal-grid">
            <TextInput
              label={t('purchaseOrders.lotNo')}
              value={localDraft.lot_no}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_no: event.currentTarget.value })}
              required
            />
            <TextInput
              label={t('purchaseOrders.lotName')}
              value={localDraft.lot_name}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_name: event.currentTarget.value })}
            />
            <Select
              label={t('common.status')}
              value={localDraft.status}
              data={lotStatusOptions}
              onChange={(value) => setLocalDraft({ ...localDraft, status: (value || 'PLANNED') as PoLotStatus })}
            />
            <DateTimeField
              label={t('purchaseOrders.cargoReady')}
              value={localDraft.planned_cargo_ready_date}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_cargo_ready_date: value ?? '' })}
            />
            <DateTimeField
              label="ETD"
              value={localDraft.planned_etd}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_etd: value ?? '' })}
            />
            <DateTimeField
              label="ETA"
              value={localDraft.planned_eta}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_eta: value ?? '' })}
            />
            <TextInput
              label={t('purchaseOrders.portOfLoading')}
              value={localDraft.origin_port}
              onChange={(event) => setLocalDraft({ ...localDraft, origin_port: event.currentTarget.value })}
            />
            <TextInput
              label={t('purchaseOrders.portOfDischarge')}
              value={localDraft.destination_port}
              onChange={(event) => setLocalDraft({ ...localDraft, destination_port: event.currentTarget.value })}
            />
          </SimpleGrid>
          <Textarea
            label={t('common.notes')}
            value={localDraft.notes}
            onChange={(event) => setLocalDraft({ ...localDraft, notes: event.currentTarget.value })}
            autosize
            minRows={2}
          />
          <Group justify="flex-end" wrap="nowrap" className="purchase-order-modal-footer">
            <Button className="purchase-order-action-button" variant="subtle" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button className="purchase-order-action-button" type="submit" loading={loading}>
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
