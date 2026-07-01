import { Alert, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import {
  fetchPurchaseOrder,
  fetchPurchaseOrderLotPlanning,
  sendPurchaseOrder,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { BackActionButton } from '@shared/components/BackActionButton';
import { PageError } from '@shared/components/PageFeedback';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { LotPlanningBoard } from './LotPlanningBoard';
import { PoControlHeader } from './PoControlHeader';
import { PoExecutionSummary } from './PoExecutionSummary';
import { PoLinesTable } from './PoLinesTable';
import { PurchaseOrderConfirmationsPanel } from './PurchaseOrderConfirmationsPanel';
import { PurchaseOrderDetailInfo } from './PurchaseOrderDetailInfo';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { SupplierConfirmationModal } from './SupplierConfirmationModal';

export function PurchaseOrderDetailPanel({ canManage, id, onClose }: { canManage: boolean; id: string; onClose: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const invalidatePo = usePoInvalidation(id);

  const detailQuery = useQuery({
    queryKey: queryKeys.purchaseOrderDetail(id),
    queryFn: () => fetchPurchaseOrder(id),
  });

  const planningQuery = useQuery({
    queryKey: queryKeys.purchaseOrderLotPlanning(id),
    queryFn: () => fetchPurchaseOrderLotPlanning(id),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendPurchaseOrder(id),
    onSuccess: invalidatePo,
  });

  const lotBoardRef = useRef<HTMLDivElement>(null);

  if (detailQuery.isLoading) {
    return (
      <Paper withBorder p="xl">
        <Group justify="center">
          <Loader size="sm" />
          <Text c="dimmed">Loading PO detail...</Text>
        </Group>
      </Paper>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageError
        title="PO detail"
        description="Could not load this purchase order."
        error={detailQuery.error}
        onRetry={() => {
          void detailQuery.refetch();
        }}
      />
    );
  }

  const order = detailQuery.data;
  const lines = order.lines ?? [];
  const canEdit = canManage && order.status === 'DRAFT';
  const canSend = canManage && order.status === 'DRAFT';
  const canConfirm = canManage && order.status === 'SENT';

  if (editOpen) {
    return (
      <Stack gap="lg" className="purchase-order-edit-workbench">
        <Group justify="space-between" align="center" gap="md" className="dl-page-header purchase-order-edit-header">
          <Group gap="xs" align="center" wrap="wrap">
            <BackActionButton
              label="Back"
              onClick={() => setEditOpen(false)}
            />
            <Text c="dimmed" size="sm">/</Text>
            <Text fw={700} size="sm">
              Edit PO {order.po_no}
            </Text>
          </Group>
        </Group>

        <PurchaseOrderForm
          mode="edit"
          order={order}
          onCancel={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            invalidatePo();
          }}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <PoControlHeader
        order={order}
        canEdit={canEdit}
        canSend={canSend}
        canConfirm={canConfirm}
        sendPending={sendMutation.isPending}
        onEdit={() => setEditOpen(true)}
        onSend={() => sendMutation.mutate()}
        onConfirm={() => setConfirmOpen(true)}
        onClose={onClose}
        onCreateDo={() => lotBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <PoExecutionSummary order={order} lines={lines} />

      {sendMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {getApiErrorMessage(sendMutation.error)}
        </Alert>
      ) : null}
      {!canConfirm ? (
        <Text size="xs" c="dimmed">
          Supplier confirmation is enabled only after the PO is sent.
        </Text>
      ) : null}

      <PurchaseOrderDetailInfo order={order} />

      <PoLinesTable lines={lines} currencyCode={order.currency?.currency_code ?? ''} />

      <PurchaseOrderConfirmationsPanel purchaseOrderId={id} />

      <div ref={lotBoardRef}>
        {planningQuery.isLoading ? (
          <Paper withBorder p="lg">
            <Group justify="center">
              <Loader size="sm" />
              <Text c="dimmed">Loading LOT planning...</Text>
            </Group>
          </Paper>
        ) : planningQuery.isError || !planningQuery.data ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(planningQuery.error)}
          </Alert>
        ) : (
          <LotPlanningBoard planning={planningQuery.data} canManage={canManage} />
        )}
      </div>

      <SupplierConfirmationModal
        order={order}
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={() => {
          setConfirmOpen(false);
          invalidatePo();
        }}
      />
    </Stack>
  );
}
