import { Badge, Group, Paper, Text } from '@mantine/core';
import { IconBuildingWarehouse, IconCalendarStats, IconPlaneDeparture, IconShip } from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { dateOnly, getDateDelayDays } from '../model/purchaseOrderModel';

export function PurchaseOrderDetailInfo({ order }: { order: PurchaseOrderV1 }) {
  const loadingPort = order.logistics_timeline?.loading_port;
  const unloadingPort = order.logistics_timeline?.unloading_port;
  const warehouse = order.logistics_timeline?.warehouse;
  const plannedEtd = loadingPort?.etd ?? order.expected_etd;
  const actualAtd = loadingPort?.atd;
  const plannedEta = unloadingPort?.eta ?? order.expected_eta;
  const actualAta = unloadingPort?.ata;
  const plannedWarehouseEta = warehouse?.eta ?? order.expected_warehouse_eta;
  const actualWarehouseAta = warehouse?.ata ?? order.actual_warehouse_ata;
  const etdDelayDays = getDateDelayDays(plannedEtd, actualAtd);
  const etaDelayDays = getDateDelayDays(plannedEta, actualAta);
  const currencyCode = order.currency?.currency_code ?? '-';
  const maxDelayDays = Math.max(etdDelayDays ?? 0, etaDelayDays ?? 0);
  const hasAnyActualDate = Boolean(actualAtd || actualAta);
  const routeStatus = !hasAnyActualDate
    ? { color: 'gray', label: 'No actual' }
    : maxDelayDays > 0
      ? { color: 'red', label: `${maxDelayDays} days late` }
      : { color: 'teal', label: 'On time' };
  const transportMode = order.transport_mode?.mode_code ?? '-';

  return (
    <Paper withBorder p={0} className="purchase-order-detail-card">
      <div className="purchase-order-detail-header w-full">
        <Text fw={800}>Commercial &amp; logistics</Text>
        <Text size="xs" c="dimmed">
          Terms and logistics timing for this purchase order.
        </Text>
      </div>

      <div className="purchase-order-detail-layout">
        <div className="purchase-order-commercial-chips">
          <CommercialChip label="Financial" value={currencyCode} meta={`Rate ${order.exchange_rate ?? '-'}`} />
          <CommercialChip label="Trade" value={order.incoterm?.incoterm_code ?? '-'} meta={order.payment_term || '-'} />
          <CommercialChip label="Transport" value={transportMode} meta={order.po_type || '-'} />
        </div>

        <LogisticsRouteTimeline
          actualAtd={dateOnly(actualAtd)}
          actualAta={dateOnly(actualAta)}
          plannedEtd={dateOnly(plannedEtd)}
          plannedEta={dateOnly(plannedEta)}
          plannedWarehouseEta={dateOnly(plannedWarehouseEta)}
          actualWarehouseAta={dateOnly(actualWarehouseAta)}
          statusColor={routeStatus.color}
          statusLabel={routeStatus.label}
          transportMode={transportMode}
        />
      </div>

      {order.notes ? (
        <div className="purchase-order-detail-notes">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            Notes
          </Text>
          <Text size="sm">{order.notes}</Text>
        </div>
      ) : null}
    </Paper>
  );
}

function CommercialChip({ label, meta, value }: { label: string; meta: string; value: string }) {
  return (
    <div className="purchase-order-commercial-chip">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={800} size="sm" lineClamp={1} title={value}>
        {value || '-'}
      </Text>
      <Text size="xs" c="dimmed" lineClamp={1} title={meta}>
        {meta || '-'}
      </Text>
    </div>
  );
}

function LogisticsRouteTimeline({
  actualAta,
  actualAtd,
  actualWarehouseAta,
  plannedEta,
  plannedEtd,
  plannedWarehouseEta,
  statusColor,
  statusLabel,
  transportMode,
}: {
  actualAta: string;
  actualAtd: string;
  actualWarehouseAta: string;
  plannedEta: string;
  plannedEtd: string;
  plannedWarehouseEta: string;
  statusColor: string;
  statusLabel: string;
  transportMode: string;
}) {
  const isAir = transportMode.toLowerCase().includes('air');
  const TransportIcon = isAir ? IconPlaneDeparture : IconShip;
  const hasWarehouseLeg = Boolean(plannedWarehouseEta || actualWarehouseAta);

  return (
    <div className="purchase-order-logistics-panel">
      <Group gap="xs" wrap="nowrap" className="purchase-order-logistics-title">
        <div className="purchase-order-info-icon">
          <IconCalendarStats size={18} />
        </div>
        <div>
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            Logistics timeline
          </Text>
          <Text fw={800} size="sm">
            Loading port to unloading port{hasWarehouseLeg ? ' to warehouse' : ''}
          </Text>
        </div>
      </Group>

      <div className="purchase-order-route">
        <PortTimelineNode label="Loading port" primaryLabel="ETD" primaryValue={plannedEtd} secondaryLabel="ATD" secondaryValue={actualAtd} />

        <div className="purchase-order-route-line" aria-hidden="true">
          <span className="purchase-order-route-dot" />
          <div className="purchase-order-route-middle">
            <div className="purchase-order-route-icon">
              <TransportIcon size={18} />
            </div>
            <Badge size="xs" color={statusColor} variant="light">
              {statusLabel}
            </Badge>
          </div>
          <span className="purchase-order-route-dot" />
        </div>

        <PortTimelineNode
          align="right"
          label="Unloading port"
          primaryLabel="ETA"
          primaryValue={plannedEta}
          secondaryLabel="ATA"
          secondaryValue={actualAta}
        />
      </div>

      {hasWarehouseLeg ? (
        <div className="purchase-order-warehouse-leg">
          <Group gap="xs" wrap="nowrap">
            <div className="purchase-order-info-icon">
              <IconBuildingWarehouse size={16} />
            </div>
            <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
              Warehouse / Kho
            </Text>
          </Group>
          <DateValue label="ETA" value={plannedWarehouseEta} />
          <DateValue label="ATA" value={actualWarehouseAta} muted />
        </div>
      ) : null}
    </div>
  );
}

function PortTimelineNode({
  align = 'left',
  label,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: {
  align?: 'left' | 'right';
  label: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}) {
  return (
    <div className={`purchase-order-route-node ${align === 'right' ? 'is-right' : ''}`}>
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <DateValue label={primaryLabel} value={primaryValue} />
      <DateValue label={secondaryLabel} value={secondaryValue} muted />
    </div>
  );
}

function DateValue({ label, muted, value }: { label: string; muted?: boolean; value: string }) {
  return (
    <div className="purchase-order-date-value">
      <Text size="xs" c="dimmed" fw={700} className="purchase-order-date-label">
        {label}
      </Text>
      <Text size="sm" fw={muted ? 600 : 800} c={muted ? 'dimmed' : undefined} className="tabular-nums">
        {value || '-'}
      </Text>
    </div>
  );
}
