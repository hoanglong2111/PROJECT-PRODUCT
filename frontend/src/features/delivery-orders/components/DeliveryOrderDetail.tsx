import {
  Alert,
  Button,
  Checkbox,
  Grid,
  Group,
  List,
  Modal,
  Progress,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconAnchor,
  IconArrowRight,
  IconChecklist,
  IconCircleCheck,
  IconCircleX,
  IconClipboardCheck,
  IconFileCheck,
  IconGitBranch,
  IconTruckDelivery,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { DeliveryOrder } from '@shared/api/logistics';
import {
  cancelDeliveryOrderV1,
  closeDeliveryOrderV1,
  markDeliveryOrderReadyForQuotation,
} from '@shared/api/deliveryOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { CopyValue } from '@shared/components/CopyValue';
import { DetailHero } from '@shared/components/DetailHero';
import { DelayBadge } from '@shared/components/DelayBadge';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { ModalTitle } from '@shared/components/ModalTitle';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';
import { EntityLink, FlowTagBadge, SourceLineTable, UpdateDeliveryOrderForm, calcDelay, getDeliveryOrderRisks, getOperationalGates } from '@entities/logistics';

import { getAllocationWeightKg, getContainerCount } from '../model/deliveryOrderModel';
import { CreateShipmentFromDoPanel } from './CreateShipmentFromDoPanel';
import { DeliveryOrderFact } from './DeliveryOrderFact';
import { DocumentUploadPanel } from './DocumentUploadPanel';
import { OperationalGateSummary } from './OperationalGateSummary';
import { DeliveryOrderOpsTab } from './DeliveryOrderOpsTab';
import { DeliveryOrderOverviewTab } from './DeliveryOrderOverviewTab';
import { DeliveryOrderTasksTab } from './DeliveryOrderTasksTab';

export function DeliveryOrderDetail({ deliveryOrder, onClose }: { deliveryOrder: DeliveryOrder; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { documentLabel, t } = useI18n();
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeAckUnverified, setCloseAckUnverified] = useState(false);
  const gates = getOperationalGates(deliveryOrder);
  const risks = getDeliveryOrderRisks(deliveryOrder);
  const allocationWeightKg = getAllocationWeightKg(deliveryOrder);
  const containerCount = getContainerCount(deliveryOrder);
  const delay = calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });
  const sourcePoNumber = deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number ?? '-';
  const sourceLotNumber = deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? '-';
  const taskProgress =
    deliveryOrder.task_summary.total_tasks > 0
      ? Math.round((deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100)
      : 0;
  const actionMutation = useMutation({
    mutationFn: (action: 'cancel' | 'close' | 'ready-for-quotation') => {
      if (action === 'ready-for-quotation') return markDeliveryOrderReadyForQuotation(deliveryOrder.id);
      if (action === 'close') return closeDeliveryOrderV1(deliveryOrder.id);
      return cancelDeliveryOrderV1(deliveryOrder.id);
    },
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderDetail(deliveryOrder.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      ]);
    },
  });

  const primaryAction =
    deliveryOrder.order_info.status === 'ASSIGNED_TO_SHIPMENT'
      ? { action: 'close' as const, label: t('deliveryOrders.closeDoAction') }
      : null;
  const canCancel = deliveryOrder.order_info.status === 'DRAFT';
  // Reversed flow: quotation no longer gates the DO. A shipment can be created from
  // any DO that has no shipment yet and is not terminal/assigned. This mirrors the shared
  // `isDeliveryOrderShipmentEligible` predicate (shipments/model/shipmentModel.ts) and the backend gate;
  // it stays inline here because this view consumes the legacy `DeliveryOrder` shape (order_info.status).
  const canCreateShipment =
    !deliveryOrder.linked_shipment_number &&
    !['CANCELLED', 'CLOSED', 'ASSIGNED_TO_SHIPMENT'].includes(deliveryOrder.order_info.status);
  // Two-tier documents gate: outstanding (required type with no uploaded file) BLOCKS
  // closing; unverified (uploaded but none VERIFIED) is a soft warning that only needs
  // an explicit acknowledgement. RECEIVED opens the gate.
  const docShipping = deliveryOrder.logistics_shipping;
  const documentsOutstanding = docShipping.documents_outstanding ?? [];
  const documentsUnverified = docShipping.documents_unverified ?? [];
  const documentsComplete = docShipping.documents_complete ?? docShipping.missing_documents.length === 0;
  const closeBlockedByDocuments = documentsOutstanding.length > 0;
  const closeNeedsAck = !closeBlockedByDocuments && documentsUnverified.length > 0;
  const canConfirmClose = !closeBlockedByDocuments && (!closeNeedsAck || closeAckUnverified);
  const closureChecklist = [
    { ok: Boolean(deliveryOrder.linked_shipment_number), label: t('deliveryOrders.checklistLinkedShipment') },
    { ok: documentsComplete, label: t('deliveryOrders.checklistDocumentsComplete') },
    { ok: deliveryOrder.task_summary.blocked_tasks === 0, label: t('deliveryOrders.checklistNoBlockedTasks') },
    { ok: deliveryOrder.task_summary.required_tasks_remaining === 0, label: t('deliveryOrders.checklistRequiredClosureTasks') },
    { ok: Boolean(deliveryOrder.warehouse_tracking.actual_entry_date), label: t('deliveryOrders.checklistWarehousePodRecorded') },
  ];

  const closeCloseConfirm = () => {
    setCloseConfirmOpen(false);
    setCloseAckUnverified(false);
  };

  if (createShipmentOpen) {
    return (
      <Stack gap="md">
        <CreateShipmentFromDoPanel
          deliveryOrder={deliveryOrder}
          opened
          onClose={() => setCreateShipmentOpen(false)}
        />
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <FeatureHeaderShell backLabel={t('common.backToList')} onBack={onClose}>
        <DetailHero
          className="delivery-order-detail-hero"
          paperProps={{ withBorder: true, p: 'md' }}
        >
          <div className="delivery-order-detail-hero-grid feature-hero-layout">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="delivery-order-detail-main feature-detail-heading feature-hero-identity">
            <div className="feature-hero-icon" aria-hidden="true"><IconTruckDelivery size={19} /></div>
            <Stack gap="xs" className="feature-detail-copy">
              <Group gap="xs" align="center" wrap="wrap">
                <Title order={3}>
                  <CopyValue value={deliveryOrder.order_info.order_number}>
                    {deliveryOrder.order_info.order_number}
                  </CopyValue>
                </Title>
                <StatusBadge status={deliveryOrder.order_info.status} />
                <FlowTagBadge tags={deliveryOrder.flow_tags} />
              </Group>
              <Group gap="xs" wrap="wrap" className="delivery-order-detail-links">
                <EntityLink type="po" id={sourcePoNumber} />
                <Button
                  component={Link}
                  to={`/tasks?do=${deliveryOrder.order_info.order_number}`}
                  size="xs"
                  variant="light"
                  rightSection={<IconArrowRight size={14} />}
                >
                  {t('deliveryOrders.viewClosureTasks')}
                </Button>
              </Group>
            </Stack>
            </Group>

            <dl className="feature-hero-facts">
              <div className="feature-hero-fact">
                <dt>PO / LOT</dt>
                <dd>{sourcePoNumber} / {sourceLotNumber}</dd>
              </div>
              <div className="feature-hero-fact">
                <dt>{t('deliveryOrders.overviewItems')}</dt>
                <dd>{deliveryOrder.product_details.item_name_requested}</dd>
              </div>
            </dl>

            <Stack gap="xs" className="delivery-order-detail-action-panel feature-hero-command">
            <Group justify="space-between" gap="sm" wrap="nowrap">
              <Text size="xs" c="dimmed" fw={700}>
                {t('tasks.progress')}
              </Text>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {taskProgress}%
              </Text>
            </Group>
            <Progress value={taskProgress} size="sm" color={taskProgress === 100 ? 'teal' : 'blue'} />
            <Group gap="xs" justify="flex-end" className="delivery-order-detail-actions">
              {canCreateShipment ? (
                <Button
                  size="xs"
                  leftSection={<IconAnchor size={14} />}
                  onClick={() => setCreateShipmentOpen(true)}
                >
                  {t('deliveryOrders.createShipmentAction')}
                </Button>
              ) : null}
              {primaryAction ? (
                <Button
                  size="xs"
                  loading={actionMutation.isPending}
                  onClick={() =>
                    primaryAction.action === 'close'
                      ? setCloseConfirmOpen(true)
                      : actionMutation.mutate(primaryAction.action)
                  }
                >
                  {primaryAction.label}
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  loading={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('cancel')}
                >
                  {t('deliveryOrders.cancelDoAction')}
                </Button>
              ) : null}
            </Group>
            </Stack>
          </div>

        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing={0} className="do-fact-strip">
          <DeliveryOrderFact
            label={t('common.route')}
            value={`${deliveryOrder.logistics_shipping.port_of_departure || '-'} ${t('deliveryOrders.routeConnector')} ${deliveryOrder.logistics_shipping.port_of_destination || '-'}`}
          />
          <DeliveryOrderFact
            label={t('deliveryOrders.overviewAllocation')}
            value={`${deliveryOrder.source_lines.length} ${t('deliveryOrders.overviewItems')} · ${allocationWeightKg.toLocaleString()} kg · ${containerCount} ${t('deliveryOrders.overviewContainers')}`}
          />
          <DeliveryOrderFact
            label={t('forms.warehouse')}
            value={deliveryOrder.warehouse_tracking.actual_entry_date ?? deliveryOrder.warehouse_tracking.planned_entry_date ?? '-'}
          />
          <DeliveryOrderFact
            label={t('deliveryOrders.linkedShipmentEta')}
            value={
              <Group gap={6} wrap="nowrap">
                <Text fw={700} size="sm" truncate>
                  {deliveryOrder.linked_shipment_number ?? t('deliveryOrders.noShipment')}
                </Text>
                <DelayBadge days={delay.days} type={delay.type} />
              </Group>
            }
          />
        </SimpleGrid>

        {(deliveryOrder.logistics_shipping.missing_documents.length > 0 ||
          deliveryOrder.task_summary.blocked_tasks > 0 ||
          deliveryOrder.warehouse_tracking.delay_days > 0) && (
            <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="sm" className="delivery-order-detail-risk-alert">
              {t('deliveryOrders.alertRisk')}
            </Alert>
          )}
        {actionMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mt="md">
            {getApiErrorMessage(actionMutation.error, t('forms.apiUnknownError'))}
          </Alert>
        ) : null}
        </DetailHero>
      </FeatureHeaderShell>

      <Grid gap="md" className="delivery-order-control-grid">
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <UpdateDeliveryOrderForm deliveryOrder={deliveryOrder} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xl: 6 }}>
          <div className="delivery-order-gate-sidebar">
            <OperationalGateSummary deliveryOrder={deliveryOrder} gates={gates} risks={risks} />
          </div>
        </Grid.Col>
      </Grid>

      <Tabs defaultValue="overview" className="delivery-order-detail-tabs">
        <Tabs.List className="delivery-order-detail-tabs-list">
          <Tabs.Tab value="overview" leftSection={<IconTruckDelivery size={16} />}>
            {t('deliveryOrders.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="ops" leftSection={<IconClipboardCheck size={16} />}>
            {t('deliveryOrders.opsControl')}
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFileCheck size={16} />}>
            {t('common.documents')}
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconChecklist size={16} />}>
            {t('deliveryOrders.closure')}
          </Tabs.Tab>
          <Tabs.Tab value="source-lines" leftSection={<IconGitBranch size={16} />}>
            {t('forms.sourceLines')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <DeliveryOrderOverviewTab deliveryOrder={deliveryOrder} />
        </Tabs.Panel>

        <Tabs.Panel value="ops" pt="md">
          <DeliveryOrderOpsTab deliveryOrder={deliveryOrder} />
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="md">
          <DocumentUploadPanel deliveryOrder={deliveryOrder} documentLabel={documentLabel} />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="md">
          <DeliveryOrderTasksTab deliveryOrder={deliveryOrder} />
        </Tabs.Panel>
        <Tabs.Panel value="source-lines" pt="md">
          <SourceLineTable lines={deliveryOrder.source_lines} />
        </Tabs.Panel>
      </Tabs >

      <Modal
        opened={closeConfirmOpen}
        onClose={closeCloseConfirm}
        title={
          <ModalTitle
            feature="delivery-orders"
            icon={<IconCircleCheck size={18} stroke={1.8} />}
            title={t('deliveryOrders.closeConfirmTitle')}
            subtitle={deliveryOrder.order_info.order_number}
          />
        }
        centered
      >
        <Stack gap="md">
          <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
            {t('deliveryOrders.closeConfirmDescription')}
          </Alert>
          <List spacing="xs" size="sm" center>
            {closureChecklist.map((item) => (
              <List.Item
                key={item.label}
                icon={
                  item.ok ? (
                    <IconCircleCheck size={18} color="var(--kbfe-status-teal)" />
                  ) : (
                    <IconCircleX size={18} color="var(--kbfe-text-secondary)" />
                  )
                }
              >
                {item.label}
              </List.Item>
            ))}
          </List>
          {closeBlockedByDocuments ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {t('deliveryOrders.closeDocsOutstanding', {
                documents: documentsOutstanding.map((code) => documentLabel(code)).join(', '),
              })}
            </Alert>
          ) : null}
          {closeNeedsAck ? (
            <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
              <Stack gap="xs">
                <Text size="sm">
                  {t('deliveryOrders.closeDocsUnverified', {
                    documents: documentsUnverified.map((code) => documentLabel(code)).join(', '),
                  })}
                </Text>
                <Checkbox
                  size="xs"
                  checked={closeAckUnverified}
                  onChange={(event) => setCloseAckUnverified(event.currentTarget.checked)}
                  label={t('deliveryOrders.closeAckUnverified')}
                />
              </Stack>
            </Alert>
          ) : null}
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={closeCloseConfirm}>
              {t('common.cancel')}
            </Button>
            <Button
              color="teal"
              disabled={!canConfirmClose}
              loading={actionMutation.isPending}
              onClick={() => {
                actionMutation.mutate('close');
                closeCloseConfirm();
              }}
            >
              {t('deliveryOrders.closeDoAction')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack >
  );
}

