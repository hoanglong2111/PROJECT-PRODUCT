import {
  Alert,
  Badge,
  Button,
  Grid,
  Group,
  List,
  Modal,
  NumberFormatter,
  Paper,
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
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { DeliveryOrder } from '@shared/api/logistics';
import {
  cancelDeliveryOrderV1,
  closeDeliveryOrderV1,
  markDeliveryOrderReadyForQuotation,
} from '@shared/api/deliveryOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { BackActionButton } from '@shared/components/BackActionButton';
import { CopyValue } from '@shared/components/CopyValue';
import { DelayBadge } from '@shared/components/DelayBadge';
import { ModalTitle } from '@shared/components/ModalTitle';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';
import { EntityLink, FlowTagBadge, SourceLineTable, UpdateDeliveryOrderForm, calcDelay, getDeliveryOrderRisks, getOperationalGates, getRiskColor } from '@entities/logistics';

import { getAllocationWeightKg, getContainerCount, shippingIcon } from '../model/deliveryOrderModel';
import { gateDetail, gateLabel, riskDetail, riskLabel, slaLabel } from '../model/deliveryOrderLabels';
import { CreateShipmentFromDoPanel } from './CreateShipmentFromDoPanel';
import { DocumentUploadPanel } from './DocumentUploadPanel';
import { OperationalGateSummary } from './OperationalGateSummary';

export function DeliveryOrderDetail({ deliveryOrder }: { deliveryOrder: DeliveryOrder; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { documentLabel, shippingMethodLabel, t, taskRoleLabel } = useI18n();
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const gates = getOperationalGates(deliveryOrder);
  const risks = getDeliveryOrderRisks(deliveryOrder);
  const allocationWeightKg = getAllocationWeightKg(deliveryOrder);
  const containerCount = getContainerCount(deliveryOrder);
  const delay = calcDelay({
    actualEntryDate: deliveryOrder.warehouse_tracking.actual_entry_date,
    plannedEntryDate: deliveryOrder.warehouse_tracking.planned_entry_date,
    warehouseDeadline: deliveryOrder.warehouse_tracking.warehouse_deadline,
  });
  const ShippingIcon = shippingIcon[deliveryOrder.logistics_shipping.shipping_method];
  const sourcePoNumber = deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number ?? '-';
  const sourceLotNumber = deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? '-';
  const supplierName = deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending');
  const missingDocumentsCount = deliveryOrder.logistics_shipping.missing_documents.length;
  const taskProgress =
    deliveryOrder.task_summary.total_tasks > 0
      ? Math.round((deliveryOrder.task_summary.completed_tasks / deliveryOrder.task_summary.total_tasks) * 100)
      : 0;
  const passedGateCount = gates.filter((gate) => gate.passed).length;
  const blockedGateCount = gates.length - passedGateCount;
  const orderedRisks = [...risks].sort((left, right) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    return severityScore[right.severity] - severityScore[left.severity];
  });
  const primaryRisk = orderedRisks[0] ?? null;
  const delayDays = delay.isLate ? delay.days : 0;
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
  const closureChecklist = [
    { ok: Boolean(deliveryOrder.linked_shipment_number), label: t('deliveryOrders.checklistLinkedShipment') },
    { ok: deliveryOrder.logistics_shipping.missing_documents.length === 0, label: t('deliveryOrders.checklistNoMissingDocuments') },
    { ok: deliveryOrder.task_summary.blocked_tasks === 0, label: t('deliveryOrders.checklistNoBlockedTasks') },
    { ok: deliveryOrder.task_summary.required_tasks_remaining === 0, label: t('deliveryOrders.checklistRequiredClosureTasks') },
    { ok: Boolean(deliveryOrder.warehouse_tracking.actual_entry_date), label: t('deliveryOrders.checklistWarehousePodRecorded') },
  ];

  if (createShipmentOpen) {
    return (
      <Stack gap="md">
        <Group justify="space-between" align="center" gap="md" className="dl-page-header delivery-order-shipment-create-header">
          <Group gap="xs" align="center" wrap="wrap">
            <BackActionButton
              label={t('common.back')}
              onClick={() => setCreateShipmentOpen(false)}
            />
            <Text c="dimmed" size="sm">/</Text>
            <Text fw={700} size="sm">
              {t('shipments.createFromDoTitle', { doNumber: deliveryOrder.order_info.order_number })}
            </Text>
          </Group>
        </Group>

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
      <Paper withBorder p="md" className="delivery-order-detail-hero">
        <div className="delivery-order-detail-hero-grid">
          <Stack gap="sm" className="delivery-order-detail-main">
            <Group gap="xs" align="center" wrap="wrap">
              <Title order={3}>
                <CopyValue value={deliveryOrder.order_info.order_number}>
                  {deliveryOrder.order_info.order_number}
                </CopyValue>
              </Title>
              <StatusBadge status={deliveryOrder.order_info.status} />
              <FlowTagBadge tags={deliveryOrder.flow_tags} />
            </Group>
            <Text c="dimmed" size="sm" lineClamp={2}>
              {sourcePoNumber} / {sourceLotNumber} - {deliveryOrder.product_details.item_name_requested}
            </Text>
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

          <Stack gap="sm" className="delivery-order-detail-action-panel">
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
      </Paper>

      <Grid gap="md" className="delivery-order-control-grid">
        <Grid.Col span={{ base: 12, xl: 9 }}>
          <UpdateDeliveryOrderForm deliveryOrder={deliveryOrder} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xl: 3 }}>
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
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm" className="delivery-order-control-grid delivery-order-overview-pages">
              <Paper withBorder p="sm">
                <Stack gap="sm">
                  <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                    {t('deliveryOrders.supplierAllocationHeader')}
                  </Text>
                  <Stack gap={6}>
                    <Group gap="xs" align="center" wrap="wrap">
                      <EntityLink type="po" id={sourcePoNumber} compact />
                      <Badge color="gray" variant="light">
                        {sourceLotNumber}
                      </Badge>
                    </Group>
                    <Text size="sm" fw={600} lineClamp={1} title={supplierName}>
                      {supplierName}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1} title={deliveryOrder.product_details.item_name_requested}>
                      {deliveryOrder.product_details.item_name_requested}
                    </Text>
                  </Stack>
                  <div className="do-kpi-row">
                    <DeliveryOrderFact label={t('deliveryOrders.overviewItems')} value={<NumberFormatter value={deliveryOrder.source_lines.length} thousandSeparator />} />
                    <DeliveryOrderFact label={deliveryOrder.product_details.unit || 'PCS'} value={<NumberFormatter value={deliveryOrder.product_details.quantity} thousandSeparator />} />
                    <DeliveryOrderFact label="kg" value={<NumberFormatter value={allocationWeightKg} thousandSeparator />} />
                    <DeliveryOrderFact label={t('deliveryOrders.overviewContainers')} value={<NumberFormatter value={containerCount} thousandSeparator />} />
                  </div>
                </Stack>
              </Paper>

              <Paper withBorder p="sm">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  <Stack gap="sm">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
                      <ShippingIcon size={22} />
                      <Stack gap={4}>
                        <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                          {t('common.route')}
                        </Text>
                        <Text fw={700}>
                          {deliveryOrder.logistics_shipping.port_of_departure || '-'} {t('deliveryOrders.routeConnector')} {deliveryOrder.logistics_shipping.port_of_destination || '-'}
                        </Text>
                      </Stack>
                    </Group>
                    <div className="do-detail-list">
                      <DetailListRow label={t('deliveryOrders.etdEta')} value={`${deliveryOrder.logistics_shipping.etd_planned ?? '-'} / ${deliveryOrder.logistics_shipping.eta_planned ?? '-'}`} />
                      <DetailListRow label={t('deliveryOrders.mblVessel')} value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
                      <DetailListRow label={t('forms.incoterms')} value={deliveryOrder.logistics_shipping.incoterms || '-'} />
                      <DetailListRow label={t('forms.shippingMethod')} value={shippingMethodLabel(deliveryOrder.logistics_shipping.shipping_method)} />
                    </div>
                  </Stack>

                  <Stack gap="sm">
                    <div>
                      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                        {t('forms.warehouse')}
                      </Text>
                    </div>
                    <div className="do-detail-list">
                      <DetailListRow label={t('forms.plannedWarehouseEntry')} value={deliveryOrder.warehouse_tracking.planned_entry_date ?? '-'} />
                      <DetailListRow label={t('forms.warehouseDeadline')} value={deliveryOrder.warehouse_tracking.warehouse_deadline || '-'} />
                      <DetailListRow label={t('forms.actualEntryDate')} value={deliveryOrder.warehouse_tracking.actual_entry_date ?? '-'} />
                    </div>
                  </Stack>
                </SimpleGrid>
              </Paper>
            </SimpleGrid>

            {deliveryOrder.order_info.notes || deliveryOrder.order_info.xnk_notes ? (
              <Paper withBorder p="md" className="do-notes-panel">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                  {deliveryOrder.order_info.notes ? (
                    <Stack gap={4}>
                      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                        {t('common.notes')}
                      </Text>
                      <Text size="sm">{deliveryOrder.order_info.notes}</Text>
                    </Stack>
                  ) : null}
                  {deliveryOrder.order_info.xnk_notes ? (
                    <Stack gap={4}>
                      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                        {t('deliveryOrders.xnkNotes')}
                      </Text>
                      <Text size="sm">{deliveryOrder.order_info.xnk_notes}</Text>
                    </Stack>
                  ) : null}
                </SimpleGrid>
              </Paper>
            ) : null}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ops" pt="md">
          <Stack gap="md" className="delivery-order-ops-layout">
            <Paper
              withBorder
              p="sm"
              className={`delivery-order-ops-hero ${primaryRisk ? 'delivery-order-ops-hero-risk' : 'delivery-order-ops-hero-clear'}`}
            >
              <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm">
                <Stack gap="xs" className="delivery-order-ops-hero-copy">
                  <Group gap="xs" wrap="wrap">
                    <Badge color={primaryRisk ? getRiskColor(primaryRisk.severity) : 'teal'} variant="light">
                      {primaryRisk ? t('common.atRisk') : t('deliveryOrders.readyForClosure')}
                    </Badge>
                    <Badge variant="outline" color={primaryRisk ? getRiskColor(primaryRisk.severity) : 'gray'}>
                      {passedGateCount}/{gates.length} {t('deliveryOrders.opsGateScore')}
                    </Badge>
                  </Group>
                  <Title order={3}>
                    {primaryRisk ? riskLabel(primaryRisk.code, t) : t('deliveryOrders.readyForClosure')}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {primaryRisk ? riskDetail(primaryRisk, t) : t('deliveryOrders.noOpsRisk')}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {primaryRisk
                      ? `${taskRoleLabel(primaryRisk.owner)} | ${t('deliveryOrders.sla', { sla: slaLabel(primaryRisk.sla, t) })}`
                      : t('deliveryOrders.nextActionsDescription')}
                  </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm" className="delivery-order-ops-kpi-grid">
                  <div className="delivery-order-ops-kpi do-kpi-row">
                    <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                      {t('deliveryOrders.opsGateScore')}
                    </Text>
                    <Text fw={900} size="xl" className="tabular-nums">
                      {passedGateCount}/{gates.length}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t('deliveryOrders.opsGateScoreDescription')}
                    </Text>
                  </div>
                  <div className={`delivery-order-ops-kpi do-kpi-row ${delay.isLate ? 'is-alert' : 'is-good'}`}>
                    <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                      {t('common.delay')}
                    </Text>
                    <Text fw={900} size="xl" c={delay.isLate ? 'red' : 'teal'} className="tabular-nums">
                      {t('deliveryOrders.delayDays', { days: delayDays })}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {deliveryOrder.warehouse_tracking.warehouse_deadline}
                    </Text>
                  </div>
                  <div className={`delivery-order-ops-kpi do-kpi-row ${blockedGateCount > 0 ? 'is-alert' : 'is-good'}`}>
                    <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                      {t('deliveryOrders.nextActions')}
                    </Text>
                    <Text fw={900} size="xl" className="tabular-nums">
                      {blockedGateCount}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {blockedGateCount > 0 ? t('deliveryOrders.gateBlocked') : t('deliveryOrders.gatePassed')}
                    </Text>
                  </div>
                </SimpleGrid>
              </SimpleGrid>
            </Paper>

            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm" className="delivery-order-ops-panels">
              <Paper withBorder p="sm" className="delivery-order-ops-gate-panel">
                <Stack gap={0}>
                  {gates.map((gate) => (
                    <div key={gate.id} className={`do-gate-row ${gate.passed ? 'is-passed' : 'is-blocked'}`}>
                      <div className="delivery-order-ops-gate-copy">
                        <Text fw={800}>{gateLabel(gate.id, t)}</Text>
                        <Text size="sm" c="dimmed">
                          {gateDetail(gate, t) || '-'}
                        </Text>
                      </div>
                      <Text size="sm" c="dimmed">
                        {taskRoleLabel(gate.owner)}
                      </Text>
                      <Badge color={gate.passed ? 'teal' : 'orange'} variant="light">
                        {gate.passed ? t('deliveryOrders.gatePassed') : t('deliveryOrders.gateBlocked')}
                      </Badge>
                    </div>
                  ))}
                </Stack>
              </Paper>

              <Paper withBorder p="sm" className="delivery-order-ops-risk-panel">
                <Group justify="space-between" align="flex-start" gap="sm" mb="sm" className="delivery-order-ops-risk-header">
                  <div className="delivery-order-ops-risk-copy">
                    <Text fw={700}>{t('deliveryOrders.nextActions')}</Text>
                    <Text size="sm" c="dimmed">
                      {t('deliveryOrders.nextActionsDescription')}
                    </Text>
                  </div>
                  <Badge color={orderedRisks.length > 0 ? 'red' : 'teal'} variant="light">
                    {orderedRisks.length > 0 ? t('common.atRisk') : t('deliveryOrders.readyForClosure')}
                  </Badge>
                </Group>
                <Stack gap="sm">
                  {orderedRisks.length > 0 ? (
                    orderedRisks.map((risk) => (
                      <Group key={risk.code} justify="space-between" align="flex-start" gap="sm" className={`do-risk-row severity-${risk.severity}`}>
                        <Group gap="xs" className="delivery-order-ops-risk-row-copy">
                          <Badge color={getRiskColor(risk.severity)} variant="light">
                            {riskLabel(risk.code, t)}
                          </Badge>
                          <Text size="sm">{riskDetail(risk, t)}</Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {taskRoleLabel(risk.owner)} · {t('deliveryOrders.sla', { sla: slaLabel(risk.sla, t) })}
                        </Text>
                      </Group>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      {t('deliveryOrders.noOpsRisk')}
                    </Text>
                  )}
                </Stack>
              </Paper>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing={0} className="do-fact-strip delivery-order-ops-facts">
              <DeliveryOrderFact
                label={t('deliveryOrders.efmsBooking')}
                value={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number}
                copyValue={deliveryOrder.order_info.tracking_number ?? deliveryOrder.order_info.order_number}
              />
              <DeliveryOrderFact label={t('deliveryOrders.mblVessel')} value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
              <DeliveryOrderFact
                label={t('deliveryOrders.polPod')}
                value={`${deliveryOrder.logistics_shipping.port_of_departure} ${t('deliveryOrders.routeConnector')} ${deliveryOrder.logistics_shipping.port_of_destination}`}
              />
      <DeliveryOrderFact label={t('deliveryOrders.ofAfDebitNote')} value={gates.find((gate) => gate.id === 'documents')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingDocuments')} />
      <DeliveryOrderFact label={t('deliveryOrders.finalDebitNote')} value={gates.find((gate) => gate.id === 'finance')?.passed ? t('deliveryOrders.ready') : t('deliveryOrders.waitingOpsGates')} />
      <DeliveryOrderFact label={t('deliveryOrders.podArchive')} value={deliveryOrder.warehouse_tracking.actual_entry_date ? t('deliveryOrders.ready') : t('deliveryOrders.waitingWarehouse')} />
    </SimpleGrid>
  </Stack>
        </Tabs.Panel >

        <Tabs.Panel value="documents" pt="md">
          <DocumentUploadPanel deliveryOrder={deliveryOrder} documentLabel={documentLabel} />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="md">
          <Stack gap="md">
            <Paper withBorder p="md" className="delivery-order-task-health">
              <Group justify="space-between" gap="sm" align="flex-start">
                <div>
                  <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                    {t('deliveryOrders.overviewOpsHealth')}
                  </Text>
                  <Text size="sm" c="dimmed" className="tabular-nums">
                    {deliveryOrder.task_summary.completed_tasks}/{deliveryOrder.task_summary.total_tasks} {t('shell.tasks')}
                  </Text>
                </div>
                <Group gap={6}>
                  {missingDocumentsCount > 0 ? (
                    <Badge size="xs" color="red" variant="light">
                      {t('deliveryOrders.missingDocuments', { count: missingDocumentsCount })}
                    </Badge>
                  ) : (
                    <Badge size="xs" color="teal" variant="light">
                      {t('deliveryOrders.complete')}
                    </Badge>
                  )}
                  {deliveryOrder.task_summary.blocked_tasks > 0 ? (
                    <Badge size="xs" color="orange" variant="light">
                      {t('deliveryOrders.blockedSuffix', { count: deliveryOrder.task_summary.blocked_tasks })}
                    </Badge>
                  ) : null}
                </Group>
              </Group>
            </Paper>
            <Group justify="space-between">
              <div>
                <Text fw={700}>{t('deliveryOrders.closureGate')}</Text>
                <Text size="sm" c="dimmed">
                  {t('deliveryOrders.closureGateDescription')}
                </Text>
              </div>
              <Badge color={taskProgress === 100 ? 'teal' : 'orange'}>{t('deliveryOrders.tasksDone', { percent: taskProgress })}</Badge>
            </Group>
            <Progress value={taskProgress} color={taskProgress === 100 ? 'teal' : 'orange'} />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={0} className="do-fact-strip delivery-order-task-facts">
              <DeliveryOrderFact label={t('tasks.totalTasks')} value={String(deliveryOrder.task_summary.total_tasks)} />
              <DeliveryOrderFact label={t('tasks.blocked')} value={String(deliveryOrder.task_summary.blocked_tasks)} />
              <DeliveryOrderFact label={t('deliveryOrders.requiredRemaining')} value={String(deliveryOrder.task_summary.required_tasks_remaining)} />
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="source-lines" pt="md">
          <SourceLineTable lines={deliveryOrder.source_lines} />
        </Tabs.Panel>
      </Tabs >

    <Modal
      opened={closeConfirmOpen}
      onClose={() => setCloseConfirmOpen(false)}
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
                  <IconCircleCheck size={18} color="var(--mantine-color-teal-6)" />
                ) : (
                  <IconCircleX size={18} color="var(--mantine-color-gray-5)" />
                )
              }
            >
              {item.label}
            </List.Item>
          ))}
        </List>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={() => setCloseConfirmOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            color="teal"
            loading={actionMutation.isPending}
            onClick={() => {
              actionMutation.mutate('close');
              setCloseConfirmOpen(false);
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

function DeliveryOrderFact({ copyValue, label, value }: { copyValue?: string; label: ReactNode; value: ReactNode }) {
  const title = typeof value === 'string' ? value : undefined;

  return (
    <div className="do-fact">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={700} lineClamp={1} title={title}>
        {copyValue && typeof value === 'string' ? <CopyValue value={copyValue}>{value}</CopyValue> : value}
      </Text>
    </div>
  );
}

function DetailListRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="do-detail-list-row">
      <Text size="sm" c="dimmed" lineClamp={1}>
        {label}
      </Text>
      <Text component="div" size="sm" fw={700} lineClamp={1} title={typeof value === 'string' ? value : undefined}>
        {value}
      </Text>
    </div>
  );
}
