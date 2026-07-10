import { Badge, Group, Paper, Text } from '@mantine/core';
import { IconCalendar, IconChecklist, IconFileCheck, IconFileInvoice, IconRoute, IconShield, IconShip } from '@tabler/icons-react';

import type { ShipmentRecord } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';
import { EntityLink } from '@entities/logistics';

import { channelColor } from '../model/shipmentModel';
import { ShipmentCommandItem } from './ShipmentCommandItem';
import { ShipmentProgressTile } from './ShipmentProgressTile';
import { ShipmentRouteNode } from './ShipmentRouteNode';

const CHANNEL_LABEL_KEY = {
  GREEN: 'shipments.channelGreen',
  YELLOW: 'shipments.channelYellow',
  RED: 'shipments.channelRed',
} as const;

function getRatio(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

export function ShipmentOverviewCard({ shipment }: { shipment: ShipmentRecord }) {
  const { t } = useI18n();
  const completedTasks = shipment.po_tasks.filter((task) => task.status === 'COMPLETED').length;
  const completedMilestones = shipment.milestones.filter((milestone) => Boolean(milestone.actual_date)).length;
  const completedDocuments = shipment.documents.filter((document) => ['APPROVED', 'VERIFIED'].includes(document.status)).length;
  const channel = shipment.customs.stream;
  const hasChannel = Boolean(shipment.customs.lane_status);
  const taskProgress = getRatio(completedTasks, shipment.po_tasks.length);
  const milestoneProgress = getRatio(completedMilestones, shipment.milestones.length);
  const documentProgress = getRatio(completedDocuments, shipment.documents.length);
  const channelLabel = hasChannel ? t(CHANNEL_LABEL_KEY[channel]) : t('shipments.channelUnassigned');
  const modeLoadType = [shipment.shipping_mode, shipment.load_type].filter(Boolean).join(' / ');

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
                  {modeLoadType}
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
            meta={`${modeLoadType} · ${t('shipments.port')}: ${shipment.dest_port || '-'}`}
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
