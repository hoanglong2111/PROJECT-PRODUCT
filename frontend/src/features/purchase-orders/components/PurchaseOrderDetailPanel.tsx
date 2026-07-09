import { Alert, Badge, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconPencil, IconSend, IconShoppingCart } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  fetchPurchaseOrder,
  fetchPurchaseOrderLotPlanning,
  sendPurchaseOrder,
} from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { BackActionButton } from '@shared/components/BackActionButton';
import { CopyValue } from '@shared/components/CopyValue';
import { FieldPair } from '@shared/components/FieldPair';
import { PageError } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { formatMoney } from '@shared/utils/money';
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
  const { t } = useI18n();
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
          <Text c="dimmed">{t('purchaseOrders.detailLoading')}</Text>
        </Group>
      </Paper>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <PageError
        title={t('purchaseOrders.detailTitle')}
        description={t('purchaseOrders.detailError')}
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
  const amount = formatMoney(totalPoAmount(lines), order.currency?.currency_code);
  const lotCount = order.lot_summary?.total_lots ?? order.total_lots ?? 0;
  const containerCount = order.lot_summary?.total_containers ?? order.total_containers ?? 0;
  const eta = order.logistics_timeline?.unloading_port?.eta ?? order.expected_eta ?? '-';

  if (editOpen) {
    return (
      <Stack gap="lg" className="purchase-order-edit-workbench">
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
      <Paper withBorder p={0} className="purchase-order-detail-hero feature-detail-hero">
        <div className="feature-hero-nav feature-hero-nav--inset">
          <BackActionButton label={t('common.backToList')} onClick={onClose} />
        </div>
        <Group justify="space-between" align="flex-start" className="purchase-order-detail-hero-inner">
          <Group gap="sm" align="flex-start" wrap="nowrap" className="feature-detail-heading">
            <div className="feature-hero-icon" aria-hidden="true"><IconShoppingCart size={19} /></div>
            <div className="purchase-order-detail-title feature-detail-copy">
              <Group gap="xs" className="purchase-order-detail-title-row">
                <Title order={3}>
                  <CopyValue value={order.po_no}>{order.po_no}</CopyValue>
                </Title>
                <StatusBadge status={order.status} />
                <Badge size="sm" variant="light" className="purchase-order-nowrap-badge">
                  {order.po_type || 'STANDARD'}
                </Badge>
                <Badge size="sm" variant="light" color="blue" className="purchase-order-nowrap-badge">
                  <CopyValue value={order.contract_no ?? ''}>{t('purchaseOrders.contractPrefix')} {order.contract_no ?? '-'}</CopyValue>
                </Badge>
              </Group>
              <Text c="dimmed" size="sm" mt={4}>
                {order.supplier?.supplier_name ?? order.supplier_id}
              </Text>
            </div>
          </Group>
          <Group gap="xs" wrap="nowrap" className="purchase-order-detail-actions">
            <Button
              className="purchase-order-action-button"
              variant="light"
              leftSection={<IconPencil size={16} />}
              disabled={!canEdit}
              onClick={() => setEditOpen(true)}
            >
              {t('common.edit')}
            </Button>
            <Button
              className="purchase-order-action-button"
              leftSection={<IconSend size={16} />}
              loading={sendMutation.isPending}
              disabled={!canSend}
              onClick={() => sendMutation.mutate()}
            >
              {t('purchaseOrders.sendPo')}
            </Button>
            <Button
              className="purchase-order-action-button"
              color="teal"
              leftSection={<IconCircleCheck size={16} />}
              disabled={!canConfirm}
              onClick={() => setConfirmOpen(true)}
            >
              {t('common.confirm')}
            </Button>
          </Group>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="purchase-order-detail-signal-grid">
          <FieldPair className="purchase-order-detail-signal" label={t('purchaseOrders.supplier')} value={order.supplier?.supplier_name ?? order.supplier_id} />
          <FieldPair className="purchase-order-detail-signal" label={t('purchaseOrders.lines')} value={String(lines.length)} />
          <FieldPair className="purchase-order-detail-signal" label={t('purchaseOrders.amount')} value={amount || '-'} />
          <FieldPair className="purchase-order-detail-signal" label="LOT / ETA" value={`${lotCount} LOT / ${containerCount} cont / ${eta}`} />
        </SimpleGrid>
        {sendMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="md">
            {getApiErrorMessage(sendMutation.error)}
          </Alert>
        ) : null}
        {!canConfirm ? (
          <Text size="xs" c="dimmed" mt="xs">
            {t('purchaseOrders.confirmAfterSend')}
          </Text>
        ) : null}
      </Paper>

      <PurchaseOrderDetailInfo order={order} lines={lines} />

      <PurchaseOrderConfirmationsPanel purchaseOrderId={id} />

      <PoLinesTable lines={lines} currencyCode={order.currency?.currency_code ?? ''} />

      {planningQuery.isLoading ? (
        <Paper withBorder p="lg">
          <Group justify="center">
            <Loader size="sm" />
            <Text c="dimmed">{t('purchaseOrders.lotPlanningLoading')}</Text>
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
