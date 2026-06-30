import { Alert, Badge, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconPencil, IconSend, IconX } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import {
  fetchPurchaseOrder,
  fetchPurchaseOrderLotPlanning,
  sendPurchaseOrder,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { BackActionButton } from '@shared/components/BackActionButton';
import { PageError } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { totalPoAmount } from '../model/purchaseOrderModel';
import { LotPlanningBoard } from './LotPlanningBoard';
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
  const amount = `${totalPoAmount(lines).toLocaleString()} ${order.currency?.currency_code ?? ''}`.trim();
  const lotCount = order.lot_summary?.total_lots ?? order.total_lots ?? 0;
  const containerCount = order.lot_summary?.total_containers ?? order.total_containers ?? 0;
  const eta = order.logistics_timeline?.unloading_port?.eta ?? order.expected_eta ?? '-';

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
      <Paper withBorder p={0} className="purchase-order-detail-hero">
        <Group justify="space-between" align="flex-start" className="purchase-order-detail-hero-inner">
          <div className="purchase-order-detail-title">
            <Group gap="xs" className="purchase-order-detail-title-row">
              <Title order={3}>{order.po_no}</Title>
              <StatusBadge status={order.status} />
              <Badge size="sm" variant="light" className="purchase-order-nowrap-badge">
                {order.po_type || 'STANDARD'}
              </Badge>
              <Badge size="sm" variant="light" color="blue" className="purchase-order-nowrap-badge">
                Contract {order.contract_no}
              </Badge>
            </Group>
            <Text c="dimmed" size="sm" mt={4}>
              {order.supplier?.supplier_name ?? order.supplier_id}
            </Text>
          </div>
          <Group gap="xs" wrap="nowrap" className="purchase-order-detail-actions">
            <Button className="purchase-order-action-button" variant="subtle" leftSection={<IconX size={16} />} onClick={onClose}>
              Close
            </Button>
            <Button
              className="purchase-order-action-button"
              variant="light"
              leftSection={<IconPencil size={16} />}
              disabled={!canEdit}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              className="purchase-order-action-button"
              leftSection={<IconSend size={16} />}
              loading={sendMutation.isPending}
              disabled={!canSend}
              onClick={() => sendMutation.mutate()}
            >
              Send PO
            </Button>
            <Button
              className="purchase-order-action-button"
              color="teal"
              leftSection={<IconCircleCheck size={16} />}
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              Confirm
            </Button>
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="purchase-order-detail-signal-grid">
          <PoHeroFact label="Supplier" value={order.supplier?.supplier_name ?? order.supplier_id} />
          <PoHeroFact label="Lines" value={String(lines.length)} />
          <PoHeroFact label="Amount" value={amount || '-'} />
          <PoHeroFact label="LOT / ETA" value={`${lotCount} LOT / ${containerCount} cont / ${eta}`} />
        </SimpleGrid>
        {sendMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="md">
            {getApiErrorMessage(sendMutation.error)}
          </Alert>
        ) : null}
        {!canConfirm ? (
          <Text size="xs" c="dimmed" mt="xs">
            Supplier confirmation is enabled only after the PO is sent.
          </Text>
        ) : null}
      </Paper>

      <PurchaseOrderDetailInfo order={order} lines={lines} />

      <PoLinesTable lines={lines} currencyCode={order.currency?.currency_code ?? ''} />

      <PurchaseOrderConfirmationsPanel purchaseOrderId={id} />

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

function PoHeroFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="purchase-order-detail-signal">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={700} component="div">
        {value}
      </Text>
    </div>
  );
}
