import { Badge, Group, Paper, Text } from '@mantine/core';
import { IconBuildingWarehouse, IconCalendarStats, IconCoins, IconFileInvoice, IconPlaneDeparture, IconShip, IconTruckDelivery } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { PurchaseOrderLineV1, PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { useI18n } from '@shared/i18n';
import { formatMoney } from '@shared/utils/money';

import {
  dateOnly,
  getDateDelayDays,
  PO_DESTINATION_COUNTRY,
  resolvePoOriginCountry,
  totalPoAmount,
} from '../model/purchaseOrderModel';

export function PurchaseOrderDetailInfo({ lines, order }: { lines: PurchaseOrderLineV1[]; order: PurchaseOrderV1 }) {
  const { t } = useI18n();
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
  const amount = formatMoney(totalPoAmount(lines), order.currency?.currency_code);
  const maxDelayDays = Math.max(etdDelayDays ?? 0, etaDelayDays ?? 0);
  const hasAnyActualDate = Boolean(actualAtd || actualAta);
  const routeStatus = !hasAnyActualDate
    ? { color: 'gray', label: t('purchaseOrders.routeNoActual') }
    : maxDelayDays > 0
      ? { color: 'red', label: t('purchaseOrders.routeDaysLate', { count: maxDelayDays }) }
      : { color: 'teal', label: t('purchaseOrders.routeOnTime') };
  const transportMode = order.transport_mode?.mode_code ?? '-';
  const originCountry = resolvePoOriginCountry(order) ?? '-';
  const originPort = order.origin_port || '-';
  const destinationPort = order.destination_port || '-';

  return (
    <Paper withBorder p={0} className="purchase-order-detail-card">
      <Group justify="space-between" align="flex-start" className="purchase-order-detail-header w-full">
        <div>
          <Text fw={800}>{t('purchaseOrders.commercialOverview')}</Text>
          <Text size="xs" c="dimmed">
            {t('purchaseOrders.commercialOverviewDescription')}
          </Text>
        </div>
        <div className="purchase-order-amount-block">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {t('purchaseOrders.amount')}
          </Text>
          <Text fw={900} size="lg" className="tabular-nums" title={amount}>
            {amount || '-'}
          </Text>
        </div>
      </Group>

      <div className="purchase-order-detail-layout">
        <div className="purchase-order-commercial-panel">
          <InfoCard
            icon={<IconCoins size={18} />}
            label={t('purchaseOrders.infoFinancial')}
            value={currencyCode}
            meta={`${t('purchaseOrders.exchangeRate')}: ${order.exchange_rate ?? '-'}`}
          />
          <InfoCard
            icon={<IconFileInvoice size={18} />}
            label={t('purchaseOrders.infoTradeTerms')}
            value={order.incoterm?.incoterm_code ?? '-'}
            meta={`${t('purchaseOrders.paymentTerm')}: ${order.payment_term || '-'}`}
          />
          <InfoCard
            icon={<IconTruckDelivery size={18} />}
            label={t('purchaseOrders.infoTransport')}
            value={transportMode}
            meta={order.po_type || '-'}
          />
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
          loadingPortCountry={originCountry}
          loadingPortLabel={t('purchaseOrders.portOfLoading')}
          loadingPortName={originPort}
          unloadingPortCountry={PO_DESTINATION_COUNTRY}
          unloadingPortLabel={t('purchaseOrders.portOfDischarge')}
          unloadingPortName={destinationPort}
        />
      </div>

      {order.notes ? (
        <div className="purchase-order-detail-notes">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {t('common.notes')}
          </Text>
          <Text size="sm">{order.notes}</Text>
        </div>
      ) : null}
    </Paper>
  );
}

function InfoCard({ icon, label, meta, value }: { icon: ReactNode; label: string; meta: string; value: string }) {
  return (
    <div className="purchase-order-info-item">
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <div className="purchase-order-info-icon">{icon}</div>
        <div className="purchase-order-info-content">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text fw={800} lineClamp={1} title={value}>
            {value || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1} title={meta}>
            {meta || '-'}
          </Text>
        </div>
      </Group>
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
  loadingPortCountry,
  loadingPortLabel,
  loadingPortName,
  unloadingPortCountry,
  unloadingPortLabel,
  unloadingPortName,
}: {
  actualAta: string;
  actualAtd: string;
  actualWarehouseAta: string;
  loadingPortCountry: string;
  loadingPortLabel: string;
  loadingPortName: string;
  plannedEta: string;
  plannedEtd: string;
  plannedWarehouseEta: string;
  statusColor: string;
  statusLabel: string;
  transportMode: string;
  unloadingPortCountry: string;
  unloadingPortLabel: string;
  unloadingPortName: string;
}) {
  const { t } = useI18n();
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
            {t('purchaseOrders.logisticsTimeline')}
          </Text>
          <Text fw={800} size="sm">
            {hasWarehouseLeg
              ? t('purchaseOrders.routeWithWarehouse', { from: loadingPortName, to: unloadingPortName })
              : t('purchaseOrders.routeSimple', { from: loadingPortName, to: unloadingPortName })}
          </Text>
        </div>
      </Group>

      <div className="purchase-order-route">
        <PortTimelineNode
          country={loadingPortCountry}
          label={loadingPortLabel}
          portName={loadingPortName}
          primaryLabel="ETD"
          primaryValue={plannedEtd}
          secondaryLabel="ATD"
          secondaryValue={actualAtd}
        />

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
          country={unloadingPortCountry}
          label={unloadingPortLabel}
          portName={unloadingPortName}
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
              {t('purchaseOrders.warehouseLabel')}
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
  country,
  label,
  portName,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: {
  align?: 'left' | 'right';
  country: string;
  label: string;
  portName: string;
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
      <div className="purchase-order-route-port">
        <Text fw={800} size="sm" lineClamp={1} title={portName}>
          {portName || '-'}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={1} title={country}>
          {country || '-'}
        </Text>
      </div>
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
