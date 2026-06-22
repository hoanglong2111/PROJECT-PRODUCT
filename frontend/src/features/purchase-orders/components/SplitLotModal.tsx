import { Alert, Button, Group, Modal, NumberFormatter, NumberInput, Paper, Select, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconGitBranch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import type { PoLot } from '@shared/api/purchaseOrders';
import { getApiErrorMessage } from '@shared/lib/errors';

import { lockedLotStatuses, toNumber, type SplitDraft } from '../model/purchaseOrderModel';

export function SplitLotModal({
  draft,
  error,
  loading,
  lots,
  onClose,
  onSubmit,
}: {
  draft: SplitDraft | null;
  error: unknown;
  loading: boolean;
  lots: PoLot[];
  onClose: () => void;
  onSubmit: (draft: SplitDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState<SplitDraft | null>(draft);

  useEffect(() => {
    setLocalDraft(draft);
  }, [draft]);

  const targetOptions = useMemo(
    () =>
      lots
        .filter((lot) => lot.id !== localDraft?.sourceLot.id && !lockedLotStatuses.has(lot.status))
        .map((lot) => ({
          label: `${lot.lot_no} - ${lot.lot_name || 'Unnamed'}`,
          value: lot.id,
        })),
    [localDraft?.sourceLot.id, lots],
  );
  const availableQty = toNumber(localDraft?.sourceLine.qty_lotted);
  const canSubmit =
    Boolean(localDraft?.target_lot_id) &&
    Number(localDraft?.split_qty) > 0 &&
    Number(localDraft?.split_qty) < availableQty;

  return (
    <Modal opened={!!draft} onClose={onClose} title="Split item line" size="lg">
      {localDraft ? (
        <Stack
          component="form"
          className="purchase-order-split-modal-form"
          gap="md"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(localDraft);
          }}
        >
          {error ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {getApiErrorMessage(error)}
            </Alert>
          ) : null}
          <Paper withBorder p="sm" className="purchase-order-split-source">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Source
            </Text>
            <Text fw={700} lineClamp={1} title={localDraft.sourceLot.lot_no}>
              {localDraft.sourceLot.lot_no}
            </Text>
            <Text size="sm" c="dimmed" className="purchase-order-split-source-line">
              {localDraft.sourceLine.item_code ??
                localDraft.sourceLine.item?.item_code ??
                localDraft.sourceLine.purchase_order_line?.item?.item_code ??
                localDraft.sourceLine.item_id}{' '}
              / <NumberFormatter value={localDraft.sourceLine.qty_lotted} thousandSeparator />{' '}
              {localDraft.sourceLine.unit ?? ''}
            </Text>
          </Paper>
          <SimpleGrid cols={{ base: 1, md: 2 }} className="purchase-order-modal-grid">
            <Select
              label="Target LOT"
              data={targetOptions}
              value={localDraft.target_lot_id}
              onChange={(value) => setLocalDraft({ ...localDraft, target_lot_id: value ?? '' })}
              searchable
              required
            />
            <NumberInput
              label="Split qty"
              min={0}
              max={Math.max(availableQty - 0.0001, 0)}
              value={localDraft.split_qty}
              thousandSeparator=","
              decimalScale={4}
              onChange={(value) => setLocalDraft({ ...localDraft, split_qty: toNumber(value) })}
              required
            />
          </SimpleGrid>
          <Group justify="flex-end" wrap="nowrap" className="purchase-order-modal-footer">
            <Button className="purchase-order-action-button" variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button className="purchase-order-action-button" type="submit" loading={loading} disabled={!canSubmit} leftSection={<IconGitBranch size={16} />}>
              Split line
            </Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
