import { Alert, Button, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconPlus, IconTruckDelivery } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { createDeliveryOrderFromLots, type DeliveryOrderV1 } from '@shared/api/deliveryOrders';
import {
  createLot,
  deletePoLot,
  movePoLotLine,
  reorderPoLotLines,
  reorderPoLots,
  splitPoLotLine,
  updatePoLot,
  type CreateLotPayload,
  type PoLot,
  type PoLotLine,
  type PurchaseOrderLotPlanning,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { dateOnly, lockedLotStatuses, nullIfEmpty, type LotDraft, type SplitDraft } from '../model/purchaseOrderModel';
import { LotCard } from './LotCard';
import { LotModal } from './LotModal';
import { SplitLotModal } from './SplitLotModal';

export function LotPlanningBoard({ canManage, planning }: { canManage: boolean; planning: PurchaseOrderLotPlanning }) {
  const [lotDraft, setLotDraft] = useState<LotDraft | null>(null);
  const [splitDraft, setSplitDraft] = useState<SplitDraft | null>(null);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [boardError, setBoardError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const purchaseOrderId = planning.purchase_order.id;
  const invalidatePo = usePoInvalidation(purchaseOrderId);

  const sortedLots = useMemo(
    () =>
      [...planning.lots].sort((a, b) => {
        const sortDiff = a.sort_order - b.sort_order;
        return sortDiff || a.lot_no.localeCompare(b.lot_no);
      }),
    [planning.lots],
  );
  const selectableLotIds = useMemo(
    () =>
      sortedLots
        .filter((lot) => !lockedLotStatuses.has(lot.status) && (lot.items?.length ?? 0) > 0)
        .map((lot) => lot.id),
    [sortedLots],
  );
  useEffect(() => {
    setSelectedLotIds((current) => current.filter((id) => selectableLotIds.includes(id)));
  }, [selectableLotIds]);

  const createLotMutation = useMutation({
    mutationFn: (payload: CreateLotPayload) => createLot(purchaseOrderId, payload),
    onSuccess: () => {
      setLotDraft(null);
      invalidatePo();
    },
  });

  const updateLotMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LotDraft }) =>
      updatePoLot(id, {
        lot_no: payload.lot_no,
        lot_name: nullIfEmpty(payload.lot_name),
        status: payload.status,
        planned_cargo_ready_date: nullIfEmpty(payload.planned_cargo_ready_date),
        planned_etd: nullIfEmpty(payload.planned_etd),
        planned_eta: nullIfEmpty(payload.planned_eta),
        sort_order: payload.sort_order,
        notes: nullIfEmpty(payload.notes),
      }),
    onSuccess: () => {
      setLotDraft(null);
      invalidatePo();
    },
  });

  const deleteLotMutation = useMutation({
    mutationFn: (lotId: string) => deletePoLot(lotId),
    onSuccess: () => {
      setBoardError(null);
      invalidatePo();
    },
    onError: (error) => {
      setBoardError(`Cannot delete this LOT. ${getApiErrorMessage(error, 'Only empty, unlocked LOTs can be deleted.')}`);
    },
  });

  const moveLineMutation = useMutation({
    mutationFn: ({ lineId, targetLotId, sortOrder }: { lineId: string; targetLotId: string; sortOrder?: number }) =>
      movePoLotLine(lineId, { target_lot_id: targetLotId, target_sort_order: sortOrder }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const reorderLotsMutation = useMutation({
    mutationFn: (orderedLotIds: string[]) =>
      reorderPoLots({ purchase_order_id: purchaseOrderId, ordered_lot_ids: orderedLotIds }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const reorderLinesMutation = useMutation({
    mutationFn: ({ lotId, orderedLineIds }: { lotId: string; orderedLineIds: string[] }) =>
      reorderPoLotLines({ lot_id: lotId, ordered_lot_line_ids: orderedLineIds }),
    onSuccess: invalidatePo,
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const splitMutation = useMutation({
    mutationFn: ({ lineId, targetLotId, splitQty }: { lineId: string; targetLotId: string; splitQty: number }) =>
      splitPoLotLine(lineId, { target_lot_id: targetLotId, split_qty: splitQty }),
    onSuccess: () => {
      setSplitDraft(null);
      setBoardError(null);
      invalidatePo();
    },
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const createDoMutation = useMutation({
    mutationFn: () =>
      createDeliveryOrderFromLots({
        lot_ids: selectedLotIds,
        notes: `Created from PO ${planning.purchase_order.po_no} LOT Planning`,
      }),
    onSuccess: (deliveryOrder: DeliveryOrderV1) => {
      setBoardError(null);
      setSelectedLotIds([]);
      invalidatePo();
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderLists });
      const deliveryOrderNumber = deliveryOrder.delivery_order_no ?? deliveryOrder.do_no ?? deliveryOrder.id;
      navigate(`/delivery-orders?do=${encodeURIComponent(deliveryOrderNumber)}`);
    },
    onError: (error) => setBoardError(getApiErrorMessage(error)),
  });

  const openCreateLot = () => {
    setLotDraft({
      lot_no: `LOT-${String(sortedLots.length + 1).padStart(3, '0')}`,
      lot_name: '',
      status: 'PLANNED',
      planned_cargo_ready_date: '',
      planned_etd: '',
      planned_eta: '',
      sort_order: sortedLots.length + 1,
      notes: '',
    });
  };

  const openEditLot = (lot: PoLot) => {
    setLotDraft({
      id: lot.id,
      lot_no: lot.lot_no,
      lot_name: lot.lot_name ?? '',
      status: lot.status,
      planned_cargo_ready_date: dateOnly(lot.planned_cargo_ready_date),
      planned_etd: dateOnly(lot.planned_etd),
      planned_eta: dateOnly(lot.planned_eta),
      sort_order: lot.sort_order,
      notes: lot.notes ?? '',
    });
  };

  const openSplitLine = (lot: PoLot, line: PoLotLine) => {
    const targetLot = sortedLots.find((candidate) => candidate.id !== lot.id && !lockedLotStatuses.has(candidate.status));
    setSplitDraft({
      sourceLot: lot,
      sourceLine: line,
      target_lot_id: targetLot?.id ?? '',
      split_qty: 0,
    });
  };

  const reorderLotCards = (lotId: string, targetLotId?: string) => {
    const dragged = sortedLots.find((lot) => lot.id === lotId);
    if (!dragged) return;
    const withoutDragged = sortedLots.filter((lot) => lot.id !== lotId);
    const targetIndex = targetLotId ? withoutDragged.findIndex((lot) => lot.id === targetLotId) : withoutDragged.length;
    const insertIndex = targetIndex < 0 ? withoutDragged.length : targetIndex;
    const nextLots = [...withoutDragged.slice(0, insertIndex), dragged, ...withoutDragged.slice(insertIndex)];
    reorderLotsMutation.mutate(nextLots.map((lot) => lot.id));
  };

  const reorderLinesInLot = (lot: PoLot, lineId: string, targetLineId?: string) => {
    const lines = [...(lot.items ?? [])];
    const dragged = lines.find((line) => line.id === lineId);
    if (!dragged) return;
    const withoutDragged = lines.filter((line) => line.id !== lineId);
    const targetIndex = targetLineId ? withoutDragged.findIndex((line) => line.id === targetLineId) : withoutDragged.length;
    const insertIndex = targetIndex < 0 ? withoutDragged.length : targetIndex;
    const nextLines = [...withoutDragged.slice(0, insertIndex), dragged, ...withoutDragged.slice(insertIndex)];
    reorderLinesMutation.mutate({ lotId: lot.id, orderedLineIds: nextLines.map((line) => line.id) });
  };

  const handleDropOnLot = (event: DragEvent<HTMLDivElement>, targetLot?: PoLot, targetLine?: PoLotLine) => {
    event.preventDefault();
    event.stopPropagation();
    const dragType = event.dataTransfer.getData('dragType');

    if (dragType === 'lot') {
      const lotId = event.dataTransfer.getData('lotId');
      if (!lotId) return;
      reorderLotCards(lotId, targetLot?.id);
      return;
    }

    if (dragType !== 'lotLine' || !targetLot) return;
    if (lockedLotStatuses.has(targetLot.status)) {
      setBoardError('Cannot move item lines into a locked LOT.');
      return;
    }

    const lineId = event.dataTransfer.getData('lotLineId');
    const sourceLotId = event.dataTransfer.getData('sourceLotId');
    if (!lineId) return;

    if (sourceLotId === targetLot.id) {
      reorderLinesInLot(targetLot, lineId, targetLine?.id);
      return;
    }

    moveLineMutation.mutate({
      lineId,
      targetLotId: targetLot.id,
      sortOrder: targetLine?.sort_order ?? (targetLot.items?.length ?? 0) + 1,
    });
  };

  const toggleLotSelection = (lot: PoLot, checked: boolean) => {
    if (!selectableLotIds.includes(lot.id)) return;
    setSelectedLotIds((current) => {
      if (checked) return Array.from(new Set([...current, lot.id]));
      return current.filter((id) => id !== lot.id);
    });
  };

  const toggleAllSelectableLots = (checked: boolean) => {
    setSelectedLotIds(checked ? selectableLotIds : []);
  };

  const lotMutationError = createLotMutation.error ?? updateLotMutation.error;

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconTruckDelivery size={20} />
              <Text fw={700}>LOT planning</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Drag LOT rows to reorder. Drag item lines between LOTs, or split a line into another LOT.
            </Text>
          </div>
          <Group gap="xs">
            <Checkbox
              label="Select all open LOTs"
              checked={selectableLotIds.length > 0 && selectedLotIds.length === selectableLotIds.length}
              indeterminate={selectedLotIds.length > 0 && selectedLotIds.length < selectableLotIds.length}
              disabled={!canManage || selectableLotIds.length === 0 || createDoMutation.isPending}
              onChange={(event) => toggleAllSelectableLots(event.currentTarget.checked)}
            />
            <Button
              size="xs"
              color="teal"
              leftSection={<IconTruckDelivery size={14} />}
              loading={createDoMutation.isPending}
              disabled={!canManage || selectedLotIds.length === 0}
              onClick={() => createDoMutation.mutate()}
            >
              Create Internal DO ({selectedLotIds.length})
            </Button>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateLot} disabled={!canManage}>
              Add LOT
            </Button>
          </Group>
        </Group>

        {boardError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} onClose={() => setBoardError(null)} withCloseButton>
            {boardError}
          </Alert>
        ) : null}

        <Stack
          gap="sm"
          className="lot-planning-list"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDropOnLot(event)}
        >
          {sortedLots.map((lot) => (
            <LotCard
              key={lot.id}
              lot={lot}
              onDrop={(event) => handleDropOnLot(event, lot)}
              onDropLine={(event, line) => handleDropOnLot(event, lot, line)}
              onDelete={() => deleteLotMutation.mutate(lot.id)}
              onEdit={() => openEditLot(lot)}
              onSplitLine={(line) => openSplitLine(lot, line)}
              onSelect={(checked) => toggleLotSelection(lot, checked)}
              canManage={canManage}
              hasMoveTargets={sortedLots.some((candidate) => candidate.id !== lot.id && !lockedLotStatuses.has(candidate.status))}
              isSelected={selectedLotIds.includes(lot.id)}
              isSelectable={selectableLotIds.includes(lot.id)}
            />
          ))}
          {sortedLots.length === 0 ? (
            <Paper withBorder p="lg" className="lot-planning-empty">
              <Text size="sm" c="dimmed" ta="center">
                Add a LOT to start planning.
              </Text>
            </Paper>
          ) : null}
        </Stack>
      </Stack>

      <LotModal
        draft={lotDraft}
        error={lotMutationError}
        loading={createLotMutation.isPending || updateLotMutation.isPending}
        onClose={() => setLotDraft(null)}
        onSubmit={(nextDraft) => {
          if (nextDraft.id) {
            updateLotMutation.mutate({ id: nextDraft.id, payload: nextDraft });
          } else {
            createLotMutation.mutate({
              lot_no: nextDraft.lot_no.trim(),
              lot_name: nullIfEmpty(nextDraft.lot_name),
              status: nextDraft.status,
              planned_cargo_ready_date: nullIfEmpty(nextDraft.planned_cargo_ready_date),
              planned_etd: nullIfEmpty(nextDraft.planned_etd),
              planned_eta: nullIfEmpty(nextDraft.planned_eta),
              sort_order: nextDraft.sort_order,
              notes: nullIfEmpty(nextDraft.notes),
            });
          }
        }}
      />

      <SplitLotModal
        draft={splitDraft}
        lots={sortedLots}
        error={splitMutation.error}
        loading={splitMutation.isPending}
        onClose={() => setSplitDraft(null)}
        onSubmit={(nextDraft) => {
          splitMutation.mutate({
            lineId: nextDraft.sourceLine.id,
            targetLotId: nextDraft.target_lot_id,
            splitQty: Number(nextDraft.split_qty),
          });
        }}
      />
    </Paper>
  );
}
