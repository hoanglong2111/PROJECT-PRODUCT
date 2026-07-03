import { Badge, Group, Paper, Progress, Stack, Tabs, Text, Title } from '@mantine/core';
import {
  IconAnchor,
  IconBox,
  IconCalendar,
  IconChecklist,
  IconFileCheck,
  IconFileInvoice,
  IconHourglassHigh,
  IconRoute,
  IconShield,
  IconShip,
  IconTruck,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentCostPayload, ShipmentDocumentPayload, ShipmentMilestoneCodeV1 } from '@shared/api/shipments';
import { EntityLink } from '@entities/logistics';
import { CopyValue } from '@shared/components/CopyValue';
import { StatusBadge } from '@shared/components/StatusBadge';
import { AdminOnly } from '@shared/auth/AdminOnly';

import { channelColor } from '../model/shipmentModel';
import { ShipmentCarrierDoPanel } from './ShipmentCarrierDoPanel';
import { ShipmentContainersPanel } from './ShipmentContainersPanel';
import { ShipmentCostsPanel } from './ShipmentCostsPanel';
import { ShipmentCustomsPanel } from './ShipmentCustomsPanel';
import { ShipmentDocumentsPanel } from './ShipmentDocumentsPanel';
import { ShipmentDtosPanel } from './ShipmentDtosPanel';
import { ShipmentMilestonesPanel } from './ShipmentMilestonesPanel';
import { ShipmentTasksPanel } from './ShipmentTasksPanel';

const CHANNEL_LABEL_KEY: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN: 'shipments.channelGreen',
  YELLOW: 'shipments.channelYellow',
  RED: 'shipments.channelRed',
};

export function ShipmentDetailView({
  isCostSaving,
  isDocumentSaving,
  isMilestoneSaving,
  onCreateCost,
  onCreateDocument,
  onDeleteCost,
  onMarkMilestone,
  onUpdateCost,
  onUpdateDocument,
  shipment,
  t,
}: {
  isCostSaving: boolean;
  isDocumentSaving: boolean;
  isMilestoneSaving: boolean;
  onCreateCost: (payload: ShipmentCostPayload) => void;
  onCreateDocument: (payload: ShipmentDocumentPayload) => void;
  onDeleteCost: (costId: string) => void;
  onMarkMilestone: (milestoneCode: ShipmentMilestoneCodeV1, payload: { actualAt: string; notes?: string | null }) => void;
  onUpdateCost: (costId: string, payload: Partial<ShipmentCostPayload>) => void;
  onUpdateDocument: (documentId: string, payload: Partial<ShipmentDocumentPayload>) => void;
  shipment: ShipmentRecord;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Stack gap="lg">
      {/* Identity card */}
      <Paper withBorder p="md" className="workbench-section shipment-detail-identity">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs" mb={4} wrap="nowrap">
              <Title order={3}>
                <CopyValue value={shipment.shipment_number}>{shipment.shipment_number}</CopyValue>
              </Title>
              <StatusBadge status={shipment.status} />
            </Group>
            <Text c="dimmed" size="sm">
              {shipment.carrier_name} · {shipment.vessel_voyage}
            </Text>
          </div>
          <Group gap="xs">
            <EntityLink type="do" id={shipment.do_number} />
            <EntityLink type="po" id={shipment.po_number} />
          </Group>
        </Group>
      </Paper>

      <Tabs
        defaultValue="overview"
        className="shipment-detail-tabs"
        classNames={{
          list: 'shipment-detail-tabs-list',
          tab: 'shipment-detail-tabs-tab',
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconAnchor size={14} />}>
            {t('shipments.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="milestones" leftSection={<IconCalendar size={14} />}>
            {t('shipments.milestones')}
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFileCheck size={14} />}>
            {t('shipments.documents')}
          </Tabs.Tab>
          <Tabs.Tab value="containers" leftSection={<IconBox size={14} />}>
            {t('shipments.containers')}
          </Tabs.Tab>
          <Tabs.Tab value="customs" leftSection={<IconShield size={14} />}>
            {t('shipments.customs')}
          </Tabs.Tab>
          <Tabs.Tab value="costs" leftSection={<IconHourglassHigh size={14} />}>
            {t('shipments.costs')}
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>
            {t('shipments.tasks')}
          </Tabs.Tab>
          <AdminOnly>
            <Tabs.Tab value="carrier-do" leftSection={<IconFileInvoice size={14} />}>
              {t('shipments.carrierDo')}
            </Tabs.Tab>
          </AdminOnly>
          <Tabs.Tab value="fds-do" leftSection={<IconFileInvoice size={14} />}>
            {t('shipments.fdsDo')}
          </Tabs.Tab>
          <Tabs.Tab value="dtos" leftSection={<IconTruck size={14} />}>
            DTOs
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="sm">
          <ShipmentOverviewCard shipment={shipment} t={t} />
        </Tabs.Panel>

        <Tabs.Panel value="milestones" pt="sm">
          <ShipmentMilestonesPanel
            shipment={shipment}
            isSaving={isMilestoneSaving}
            onMarkDone={onMarkMilestone}
            t={t}
          />
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="sm">
          <ShipmentDocumentsPanel
            shipment={shipment}
            isSaving={isDocumentSaving}
            onCreateDocument={onCreateDocument}
            onUpdateDocument={onUpdateDocument}
            t={t}
          />
        </Tabs.Panel>

        <Tabs.Panel value="containers" pt="sm">
          <ShipmentContainersPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="customs" pt="sm">
          <ShipmentCustomsPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="costs" pt="sm">
          <ShipmentCostsPanel
            shipment={shipment}
            isSaving={isCostSaving}
            onCreateCost={onCreateCost}
            onUpdateCost={onUpdateCost}
            onDeleteCost={onDeleteCost}
            t={t}
          />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="sm">
          <ShipmentTasksPanel tasks={shipment.po_tasks} />
        </Tabs.Panel>

        {/* FDS-only tab: hidden in the demo view, revealed via /fds-admin. */}
        <AdminOnly>
          <Tabs.Panel value="carrier-do" pt="sm">
            <ShipmentCarrierDoPanel shipment={shipment} />
          </Tabs.Panel>
        </AdminOnly>

        <Tabs.Panel value="fds-do" pt="sm">
          <ShipmentCarrierDoPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="dtos" pt="sm">
          <ShipmentDtosPanel shipment={shipment} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function ShipmentOverviewCard({ shipment, t }: { shipment: ShipmentRecord; t: (key: string, params?: Record<string, string | number>) => string }) {
  const completedTasks = shipment.po_tasks.filter((task) => task.status === 'COMPLETED').length;
  const completedMilestones = shipment.milestones.filter((milestone) => Boolean(milestone.actual_date)).length;
  const completedDocuments = shipment.documents.filter((document) =>
    ['APPROVED', 'VERIFIED'].includes(document.status),
  ).length;
  const channel = shipment.customs.stream;
  const hasChannel = Boolean(shipment.customs.lane_status);
  const taskProgress = getRatio(completedTasks, shipment.po_tasks.length);
  const milestoneProgress = getRatio(completedMilestones, shipment.milestones.length);
  const documentProgress = getRatio(completedDocuments, shipment.documents.length);
  const channelLabel = hasChannel ? t(CHANNEL_LABEL_KEY[channel]) : t('shipments.channelUnassigned');

  return (
    <Paper withBorder p={0} className="shipment-detail-card">
      <div className="shipment-detail-header">
        <div className="shipment-detail-title">
          <div>
            <Text fw={800}>{t('shipments.overview')}</Text>
            <Text size="xs" c="dimmed">
              {shipment.origin_port || '-'} / {shipment.dest_port || '-'}
            </Text>
          </div>
          <Group gap="xs">
            <Badge color="blue" variant="light">
              {shipment.shipping_mode}
            </Badge>
            {shipment.load_type ? (
              <Badge color="cyan" variant="light">
                {shipment.load_type}
              </Badge>
            ) : null}
            {hasChannel ? (
              <Badge color={channelColor(channel)} variant="filled">
                {channelLabel}
              </Badge>
            ) : (
              <Badge color="gray" variant="light">
                {channelLabel}
              </Badge>
            )}
          </Group>
        </div>
      </div>

      <div className="shipment-detail-layout">
        <div className="shipment-route-panel">
          <Group gap="xs" wrap="nowrap" className="shipment-route-title">
            <div className="shipment-info-icon">
              <IconRoute size={18} />
            </div>
            <div>
              <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                {t('common.route')}
              </Text>
              <Text fw={800} size="sm">
                {shipment.origin_port || '-'} / {shipment.dest_port || '-'}
              </Text>
            </div>
          </Group>

          <div className="shipment-route">
            <ShipmentRouteNode
              label="POL"
              port={shipment.origin_port}
              dateLabel={t('shipments.etd')}
              dateValue={shipment.etd}
              actualLabel={t('shipments.atd')}
              actualValue={shipment.atd}
            />
            <div className="shipment-route-line" aria-hidden="true">
              <span className="shipment-route-dot" />
              <div className="shipment-route-middle">
                <div className="shipment-info-icon">
                  <IconShip size={18} />
                </div>
                <Badge size="xs" color={hasChannel ? channelColor(channel) : 'gray'} variant="light">
                  {[shipment.shipping_mode, shipment.load_type].filter(Boolean).join(' / ')}
                </Badge>
              </div>
              <span className="shipment-route-dot" />
            </div>
            <ShipmentRouteNode
              align="right"
              label="POD"
              port={shipment.dest_port}
              dateLabel={t('shipments.eta')}
              dateValue={shipment.eta}
              actualLabel={t('shipments.ata')}
              actualValue={shipment.ata}
            />
          </div>
        </div>

        <div className="shipment-command-panel">
          <ShipmentCommandItem
            icon={<IconFileInvoice size={18} />}
            label={t('shipments.links')}
            valueNode={
              <Group gap="xs">
                <EntityLink type="do" id={shipment.do_number} compact />
                {shipment.po_number ? <EntityLink type="po" id={shipment.po_number} compact /> : null}
              </Group>
            }
            meta={shipment.po_number ? `${t('shipments.linkedPo')}: ${shipment.po_number}` : '-'}
          />
          <ShipmentCommandItem
            icon={<IconShip size={18} />}
            label={t('shipments.carrier')}
            value={shipment.carrier_name || '-'}
            meta={shipment.vessel_voyage || '-'}
          />
          <ShipmentCommandItem
            icon={<IconShield size={18} />}
            label={t('shipments.customsStream')}
            valueNode={
              <Badge color={hasChannel ? channelColor(channel) : 'gray'} variant={hasChannel ? 'filled' : 'light'}>
                {channelLabel}
              </Badge>
            }
            meta={shipment.customs.declaration_no || shipment.customs.lane_status || '-'}
            metaCopyable={Boolean(shipment.customs.declaration_no)}
          />
          <ShipmentCommandItem
            icon={<IconFileInvoice size={18} />}
            label={t('shipments.blAwb')}
            value={shipment.bl_awb_no || '-'}
            copyable
            meta={`${[shipment.shipping_mode, shipment.load_type].filter(Boolean).join(' / ')} · ${t('shipments.port')}: ${shipment.dest_port || '-'}`}
          />
        </div>
      </div>

      <div className="shipment-overview-strip">
        <ShipmentProgressTile
          icon={<IconChecklist size={18} />}
          label={t('shipments.tasksCompleted')}
          value={`${completedTasks}/${shipment.po_tasks.length}`}
          progress={taskProgress}
          color={taskProgress === 100 ? 'teal' : 'blue'}
        />
        <ShipmentProgressTile
          icon={<IconRoute size={18} />}
          label={t('shipments.milestones')}
          value={`${completedMilestones}/${shipment.milestones.length}`}
          progress={milestoneProgress}
          color={milestoneProgress === 100 ? 'teal' : 'blue'}
        />
        <ShipmentProgressTile
          icon={<IconFileCheck size={18} />}
          label={t('shipments.documents')}
          value={`${completedDocuments}/${shipment.documents.length}`}
          progress={documentProgress}
          color={documentProgress === 100 ? 'teal' : 'orange'}
        />
        <ShipmentProgressTile
          icon={<IconCalendar size={18} />}
          label={`${t('shipments.etd')} / ${t('shipments.eta')}`}
          value={`${shipment.etd || '-'} / ${shipment.eta || '-'}`}
          progress={100}
          color="gray"
          hideProgress
        />
      </div>
    </Paper>
  );
}

function ShipmentCommandItem({
  icon,
  label,
  meta,
  metaCopyable = false,
  value,
  valueNode,
  copyable = false,
}: {
  copyable?: boolean;
  icon: ReactNode;
  label: string;
  meta: string;
  metaCopyable?: boolean;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="shipment-command-item">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <div className="shipment-info-icon">{icon}</div>
        <div className="shipment-info-content">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {label}
          </Text>
          {valueNode ?? (
            <Text fw={800} lineClamp={1} title={value}>
              {copyable && value ? <CopyValue value={value}>{value}</CopyValue> : value || '-'}
            </Text>
          )}
          <Text size="xs" c="dimmed" lineClamp={1} title={meta}>
            {metaCopyable && meta ? <CopyValue value={meta}>{meta}</CopyValue> : meta || '-'}
          </Text>
        </div>
      </Group>
    </div>
  );
}

function ShipmentProgressTile({
  color,
  hideProgress = false,
  icon,
  label,
  progress,
  value,
}: {
  color: string;
  hideProgress?: boolean;
  icon: ReactNode;
  label: string;
  progress: number;
  value: string;
}) {
  return (
    <div className="shipment-progress-tile">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <div className="shipment-info-icon">{icon}</div>
        <div className="shipment-info-content">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text fw={800} className="tabular-nums" lineClamp={1} title={value}>
            {value}
          </Text>
          {hideProgress ? null : <Progress value={progress} color={color} size="xs" radius="xl" mt={6} />}
        </div>
      </Group>
    </div>
  );
}

function ShipmentRouteNode({
  actualLabel,
  actualValue,
  align = 'left',
  dateLabel,
  dateValue,
  label,
  port,
}: {
  actualLabel?: string;
  actualValue?: string;
  align?: 'left' | 'right';
  dateLabel: string;
  dateValue: string;
  label: string;
  port: string;
}) {
  return (
    <div className={`shipment-route-node ${align === 'right' ? 'is-right' : ''}`}>
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={800} lineClamp={1} title={port}>
        {port || '-'}
      </Text>
      <Text size="sm" fw={700} c="dimmed" className="tabular-nums">
        {dateLabel}: {dateValue || '-'}
      </Text>
      {actualLabel ? (
        <Text size="xs" fw={600} c={actualValue ? 'teal' : 'dimmed'} className="tabular-nums">
          {actualLabel}: {actualValue || '-'}
        </Text>
      ) : null}
    </div>
  );
}

function getRatio(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
