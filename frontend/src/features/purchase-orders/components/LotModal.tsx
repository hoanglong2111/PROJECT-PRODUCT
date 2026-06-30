import { Alert, Button, Group, Modal, Select, SimpleGrid, Stack, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { DateField } from '@shared/components/DateField';
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

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  return (
    <Modal opened={!!draft} onClose={onClose} title={draft?.id ? 'Edit LOT' : 'Create empty LOT'} size="lg">
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
              label="LOT no"
              value={localDraft.lot_no}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_no: event.currentTarget.value })}
              required
            />
            <TextInput
              label="LOT name"
              value={localDraft.lot_name}
              onChange={(event) => setLocalDraft({ ...localDraft, lot_name: event.currentTarget.value })}
            />
            <Select
              label="Status"
              value={localDraft.status}
              data={lotStatusOptions}
              onChange={(value) => setLocalDraft({ ...localDraft, status: (value || 'PLANNED') as PoLotStatus })}
            />
            <DateField
              label="Cargo ready"
              value={localDraft.planned_cargo_ready_date}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_cargo_ready_date: value ?? '' })}
            />
            <DateField
              label="ETD"
              value={localDraft.planned_etd}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_etd: value ?? '' })}
            />
            <DateField
              label="ETA"
              value={localDraft.planned_eta}
              onChange={(value) => setLocalDraft({ ...localDraft, planned_eta: value ?? '' })}
            />
          </SimpleGrid>
          <Textarea
            label="Notes"
            value={localDraft.notes}
            onChange={(event) => setLocalDraft({ ...localDraft, notes: event.currentTarget.value })}
            autosize
            minRows={2}
          />
          <Group justify="flex-end" wrap="nowrap" className="purchase-order-modal-footer">
            <Button className="purchase-order-action-button" variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button className="purchase-order-action-button" type="submit" loading={loading}>
              Save
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
