import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconBox,
  IconBuildingStore,
  IconCalendarCheck,
  IconCar,
  IconCheck,
  IconClipboardCheck,
  IconFileCheck,
  IconFileText,
  IconId,
  IconMapPin,
  IconPackage,
  IconPhone,
  IconRoute,
  IconScale,
  IconTruck,
  IconTruckDelivery,
  IconUser,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type {
  DomesticTransportOrderAction,
  DomesticTransportOrderLineV1,
  DomesticTransportOrderV1,
} from '@shared/api/domesticTransportOrders';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@entities/logistics';
import { DateTimeField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { formatDateTime, formatNumber, type FormState } from '../model/domesticTransportOrderModel';

export function DomesticTransportOrderDetail({
  actionPending,
  form,
  isFetching,
  onAction,
  onChange,
  onSave,
  order,
  saving,
  truckVendorOptions,
}: {
  actionPending: boolean;
  form: FormState;
  isFetching: boolean;
  onAction: (action: DomesticTransportOrderAction) => void;
  onChange: (form: FormState) => void;
  onSave: () => void;
  order: DomesticTransportOrderV1;
  saving: boolean;
  truckVendorOptions: Array<{ label: string; value: string }>;
}) {
  const { t } = useI18n();
  const isClosed = ['CLOSED', 'CANCELLED'].includes(order.status);
  const linkedShipments = order.shipments?.length ? order.shipments : order.shipment ? [order.shipment] : [];
  const containerList = Array.isArray(order.container_no) ? order.container_no : order.container_no ? [order.container_no] : [];
  const truckVendor = order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-';
  const carrierDo = order.carrier_delivery_order?.carrier_do_no ?? order.carrier_delivery_order_id ?? '-';
  const quoteDisplay = order.quote_amount != null
    ? `${formatNumber(order.quote_amount)} ${order.quote_currency ?? ''}`.trim()
    : '-';
  const deliveryDisplay = order.actual_delivery_at
    ? formatDateTime(order.actual_delivery_at)
    : t('domesticTransportOrders.notDelivered');
  const workflowActions: Array<{
    action: DomesticTransportOrderAction;
    color?: string;
    disabled: boolean;
    label: string;
    variant?: 'filled' | 'light' | 'outline';
  }> = [
    {
      action: 'quote-pending',
      disabled: isClosed || order.status !== 'DRAFT',
      label: t('domesticTransportOrders.actionQuotePending'),
      variant: 'light',
    },
    {
      action: 'confirm-quote',
      disabled: isClosed || !['QUOTE_PENDING', 'QUOTED'].includes(order.status),
      label: t('domesticTransportOrders.actionConfirmQuote'),
      variant: 'light',
    },
    {
      action: 'dispatch',
      color: 'blue',
      disabled: isClosed || order.status !== 'QUOTE_CONFIRMED',
      label: t('domesticTransportOrders.actionDispatch'),
    },
    {
      action: 'start-transit',
      color: 'cyan',
      disabled: isClosed || order.status !== 'DISPATCHED',
      label: t('domesticTransportOrders.actionStartTransit'),
    },
    {
      action: 'deliver',
      color: 'teal',
      disabled: isClosed || order.status !== 'IN_TRANSIT',
      label: t('domesticTransportOrders.actionDeliver'),
    },
    {
      action: 'pod-received',
      color: 'teal',
      disabled: isClosed || order.status !== 'DELIVERED',
      label: t('domesticTransportOrders.actionMarkPodReceived'),
      variant: 'light',
    },
  ];
  const closureActions: Array<{
    action: DomesticTransportOrderAction;
    color?: string;
    disabled: boolean;
    label: string;
    variant?: 'filled' | 'light' | 'outline';
  }> = [
    {
      action: 'close',
      color: 'teal',
      disabled: isClosed || !['DELIVERED', 'POD_RECEIVED'].includes(order.status),
      label: t('common.close'),
      variant: 'outline',
    },
    {
      action: 'cancel',
      color: 'red',
      disabled: isClosed,
      label: t('common.cancel'),
      variant: 'light',
    },
  ];

  return (
    <Stack gap="md" className="dto-detail-stack">
      <Paper withBorder p="md" className="dto-detail-hero">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" className="dto-detail-title-row">
            <div>
              <Group gap="xs">
                <Title order={3}>{order.dto_no}</Title>
                <StatusBadge status={order.status} />
                {isFetching ? <Loader size="xs" /> : null}
              </Group>
              <Text size="sm" c="dimmed">
                {order.origin ?? '-'} {t('deliveryOrders.routeConnector')} {order.destination ?? '-'} / {order.warehouse ?? '-'}
              </Text>
            </div>
            <Group gap="xs" className="dto-detail-actions">
              {order.shipment ? <EntityLink compact id={order.shipment.shipment_no} type="shp" /> : null}
            </Group>
          </Group>

          <div className="dto-route-rail">
            <div className="dto-route-stop">
              <Text className="metric-label dto-detail-kicker" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.pickup')}</Text>
              <Text fw={700} lineClamp={1} title={order.origin ?? '-'}>
                {order.origin ?? '-'}
              </Text>
              <Text size="xs" c="dimmed">{formatDateTime(order.scheduled_pickup_at)}</Text>
            </div>
            <div className="dto-route-line">
              <div className="dto-route-middle">
                <Text size="xs" fw={700} lineClamp={1} title={order.warehouse ?? '-'}>
                  {order.warehouse ?? '-'}
                </Text>
              </div>
            </div>
            <div className="dto-route-stop is-right">
              <Text className="metric-label dto-detail-kicker" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.delivery')}</Text>
              <Text fw={700} lineClamp={1} title={order.destination ?? '-'}>
                {order.destination ?? '-'}
              </Text>
              <Text size="xs" c="dimmed">{formatDateTime(order.scheduled_delivery_at)}</Text>
            </div>
          </div>

          <div className="dto-action-workbench">
            <div className="dto-action-group">
              <Text className="metric-label" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.transportQueue')}</Text>
              <Group gap="xs" mt={6} className="dto-action-strip">
                {workflowActions.map((action) => (
                  <Button
                    key={action.action}
                    size="xs"
                    color={action.color}
                    variant={action.variant}
                    disabled={action.disabled}
                    loading={actionPending}
                    onClick={() => onAction(action.action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Group>
            </div>
            <div className="dto-action-group is-closure">
              <Text className="metric-label dto-closure-label" size="xs" fw={700} tt="uppercase">{t('deliveryOrders.closure')}</Text>
              <Group gap="xs" className="dto-action-strip dto-closure-actions">
                {closureActions.map((action) => (
                  <Button
                    key={action.action}
                    size="xs"
                    color={action.color}
                    variant={action.variant}
                    disabled={action.disabled}
                    loading={actionPending}
                    onClick={() => onAction(action.action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Group>
            </div>
          </div>
        </Stack>
      </Paper>

      <Tabs defaultValue="overview" keepMounted={false} className="dto-detail-tabs">
        <Tabs.List className="dto-detail-tabs-list">
          <Tabs.Tab value="overview" leftSection={<IconTruckDelivery size={16} />}>
            {t('deliveryOrders.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="dispatch" leftSection={<IconClipboardCheck size={16} />}>
            {t('domesticTransportOrders.dispatchAndPod')}
          </Tabs.Tab>
          <Tabs.Tab value="lines" leftSection={<IconFileCheck size={16} />}>
            {t('domesticTransportOrders.dtoLines')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <div className="dto-overview-layout">
            <Paper withBorder p="md" className="dto-overview-card dto-overview-card-main">
              <Group justify="space-between" align="flex-start" gap="sm" className="dto-overview-card-header">
                <div>
                  <Text fw={800}>{t('deliveryOrders.overview')}</Text>
                  <Text size="sm" c="dimmed">
                    {order.origin ?? '-'} {t('deliveryOrders.routeConnector')} {order.destination ?? '-'}
                  </Text>
                </div>
                <Badge variant="light" className="dto-overview-count">
                  {t('domesticTransportOrders.shipmentsCount', { count: linkedShipments.length || 1 })}
                </Badge>
              </Group>

              <div className="dto-overview-route">
                <OverviewRoutePoint
                  icon={<IconMapPin size={16} />}
                  label={t('domesticTransportOrders.pickup')}
                  primary={order.origin ?? '-'}
                  secondary={formatDateTime(order.scheduled_pickup_at)}
                />
                <OverviewRoutePoint
                  icon={<IconBox size={16} />}
                  label={t('domesticTransportOrders.warehouse')}
                  primary={order.warehouse ?? '-'}
                  secondary={t('domesticTransportOrders.planned')}
                />
                <OverviewRoutePoint
                  align="right"
                  icon={<IconCalendarCheck size={16} />}
                  label={t('domesticTransportOrders.delivery')}
                  primary={deliveryDisplay}
                  secondary={`${t('domesticTransportOrders.planned')}: ${formatDateTime(order.scheduled_delivery_at)}`}
                />
              </div>

              <div className="dto-overview-link-panel">
                <Text className="metric-label" size="xs" fw={700} tt="uppercase">
                  {linkedShipments.length > 1 ? t('domesticTransportOrders.shipments') : t('domesticTransportOrders.shipment')}
                </Text>
                <Group gap="xs" mt={6} wrap="wrap">
                  {linkedShipments.length ? (
                    linkedShipments.map((shipment) => (
                      <EntityLink key={shipment.id} compact id={shipment.shipment_no ?? shipment.id} type="shp" />
                    ))
                  ) : (
                    <EntityLink compact id={order.shipment_id} type="shp" />
                  )}
                </Group>
              </div>
            </Paper>

            <div className="dto-overview-summary-grid">
              <OverviewSummaryCard
                icon={<IconTruck size={17} />}
                label={t('domesticTransportOrders.truckVendor')}
                value={truckVendor}
                meta={`${t('domesticTransportOrders.carrierDo')}: ${carrierDo}`}
              />
              <OverviewSummaryCard
                accent="teal"
                icon={<IconPackage size={17} />}
                label={t('domesticTransportOrders.totalQty')}
                value={formatNumber(order.total_qty)}
                meta={`${t('domesticTransportOrders.grossWeightKg')}: ${formatNumber(order.total_gross_weight_kg)}`}
              />
              <OverviewSummaryCard
                accent="blue"
                icon={<IconFileText size={17} />}
                label={t('domesticTransportOrders.podDocument')}
                value={order.pod_document_ref ?? '-'}
                meta={`${t('domesticTransportOrders.quoteAmount')}: ${quoteDisplay}`}
              />
              <OverviewSummaryCard
                accent="gray"
                icon={<IconBox size={17} />}
                label={t('domesticTransportOrders.containers')}
                value={containerList.length ? String(containerList.length) : '-'}
                meta={
                  containerList.length
                    ? containerList.slice(0, 3).join(', ') + (containerList.length > 3 ? ` +${containerList.length - 3}` : '')
                    : '-'
                }
              />
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="dispatch" pt="md">
          <Paper p="sm" className="dto-form-panel dto-form-panel-flat">
            <Stack gap="sm">
              <Group justify="space-between" className="dto-form-header">
                <div>
                  <Text fw={700}>{t('domesticTransportOrders.dispatchAndPodData')}</Text>
                  <Text size="sm" c="dimmed">{t('domesticTransportOrders.dispatchAndPodDescription')}</Text>
                </div>
                <Group gap="xs" className="dto-form-actions">
                  <Button leftSection={<IconCheck size={16} />} loading={saving} disabled={isClosed} onClick={onSave}>
                    {t('common.save')}
                  </Button>
                </Group>
              </Group>
              <div className="dto-form-workspace">
                <section className="dto-form-section dto-transport-driver-section is-wide">
                  <SectionTitle icon={<IconTruck size={16} />} label={t('domesticTransportOrders.transportAndDriver')} />
                  <div className="dto-transport-driver-grid">
                    <div className="dto-form-subsection">
                      <Text className="dto-form-subsection-title" size="xs" fw={700}>
                        {t('domesticTransportOrders.vehicleInfo')}
                      </Text>
                      <div className="dto-form-grid dto-form-grid-transport">
                        <Select
                          className="dto-form-field-primary"
                          label={t('domesticTransportOrders.truckVendor')}
                          searchable
                          clearable
                          data={truckVendorOptions}
                          value={form.truckVendorId}
                          disabled={isClosed}
                          onChange={(value) => onChange({ ...form, truckVendorId: value })}
                          leftSection={<IconBuildingStore size={16} />}
                        />
                        <TextInput
                          label={t('domesticTransportOrders.vehiclePlate')}
                          value={form.vehiclePlate}
                          disabled={isClosed}
                          onChange={(event) => onChange({ ...form, vehiclePlate: event.currentTarget.value })}
                          leftSection={<IconCar size={16} />}
                        />
                        <TextInput
                          label={t('domesticTransportOrders.vehicleType')}
                          value={form.vehicleType}
                          disabled={isClosed}
                          onChange={(event) => onChange({ ...form, vehicleType: event.currentTarget.value })}
                        />
                      </div>
                    </div>

                    <div className="dto-form-subsection">
                      <Text className="dto-form-subsection-title" size="xs" fw={700}>
                        {t('domesticTransportOrders.driver')}
                      </Text>
                      <div className="dto-form-grid dto-form-grid-driver">
                        <TextInput
                          className="dto-form-field-primary"
                          label={t('domesticTransportOrders.driver')}
                          value={form.driverName}
                          disabled={isClosed}
                          onChange={(event) => onChange({ ...form, driverName: event.currentTarget.value })}
                          leftSection={<IconUser size={16} />}
                        />
                        <TextInput
                          label={t('domesticTransportOrders.driverPhone')}
                          value={form.driverPhone}
                          disabled={isClosed}
                          onChange={(event) => onChange({ ...form, driverPhone: event.currentTarget.value })}
                          leftSection={<IconPhone size={16} />}
                        />
                        <TextInput
                          label={t('domesticTransportOrders.driverIdentityNo')}
                          value={form.driverIdentityNo}
                          disabled={isClosed}
                          onChange={(event) => onChange({ ...form, driverIdentityNo: event.currentTarget.value })}
                          leftSection={<IconId size={16} />}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="dto-form-section">
                  <SectionTitle icon={<IconRoute size={16} />} label={t('domesticTransportOrders.routeSchedule')} />
                  <div className="dto-form-grid dto-form-grid-route-places">
                    <TextInput label={t('domesticTransportOrders.origin')} value={form.origin} disabled={isClosed} onChange={(event) => onChange({ ...form, origin: event.currentTarget.value })} />
                    <TextInput label={<HeaderLabel label={t('domesticTransportOrders.warehouse')} hint={t('glossary.warehouse')} />} value={form.warehouse} disabled={isClosed} onChange={(event) => onChange({ ...form, warehouse: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.destination')} value={form.destination} disabled={isClosed} onChange={(event) => onChange({ ...form, destination: event.currentTarget.value })} />
                  </div>
                  <div className="dto-time-matrix">
                    <div className="dto-time-matrix-corner" />
                    <Text className="dto-time-matrix-heading" size="xs" fw={700}>{t('domesticTransportOrders.planned')}</Text>
                    <Text className="dto-time-matrix-heading dto-time-matrix-actual" size="xs" fw={700}>{t('domesticTransportOrders.actual')}</Text>
                    <Text className="dto-time-matrix-axis" size="xs" fw={700}>{t('domesticTransportOrders.pickup')}</Text>
                    <DateTimeField label={t('domesticTransportOrders.scheduledPickup')} value={form.scheduledPickupAt} disabled={isClosed} onChange={(value) => onChange({ ...form, scheduledPickupAt: value })} />
                    <DateTimeField className="dto-time-matrix-actual" label={t('domesticTransportOrders.actualPickup')} value={form.actualPickupAt} disabled={isClosed} onChange={(value) => onChange({ ...form, actualPickupAt: value })} />
                    <Text className="dto-time-matrix-axis" size="xs" fw={700}>{t('domesticTransportOrders.delivery')}</Text>
                    <DateTimeField label={t('domesticTransportOrders.scheduledDelivery')} value={form.scheduledDeliveryAt} disabled={isClosed} onChange={(value) => onChange({ ...form, scheduledDeliveryAt: value })} />
                    <DateTimeField className="dto-time-matrix-actual" label={t('domesticTransportOrders.actualDelivery')} value={form.actualDeliveryAt} disabled={isClosed} onChange={(value) => onChange({ ...form, actualDeliveryAt: value })} />
                  </div>
                </section>

                <section className="dto-form-section">
                  <SectionTitle icon={<IconClipboardCheck size={16} />} label={t('domesticTransportOrders.podAndQuote')} />
                  <div className="dto-form-grid dto-form-grid-pod">
                    <TextInput className="dto-form-field-primary" label={t('domesticTransportOrders.podDocument')} value={form.podDocumentRef} disabled={isClosed} onChange={(event) => onChange({ ...form, podDocumentRef: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.quoteAmount')} type="number" value={form.quoteAmount} disabled={isClosed} onChange={(event) => onChange({ ...form, quoteAmount: event.currentTarget.value })} />
                    <Select label={t('domesticTransportOrders.quoteCurrency')} data={[{ label: 'VND', value: 'VND' }, { label: 'USD', value: 'USD' }]} value={form.quoteCurrency || null} disabled={isClosed} clearable onChange={(value) => onChange({ ...form, quoteCurrency: value ?? '' })} />
                    <Textarea className="dto-form-field-primary dto-form-note-field" label={t('common.notes')} minRows={3} value={form.note} disabled={isClosed} onChange={(event) => onChange({ ...form, note: event.currentTarget.value })} />
                  </div>
                </section>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="lines" pt="md">
          <Paper p="sm" className="dto-lines-panel dto-lines-panel-flat">
            <Stack gap="sm">
              <Group justify="space-between" className="dto-lines-header">
                <div>
                  <Text fw={700}>
                    <HeaderLabel label={t('domesticTransportOrders.dtoLines')} hint={t('glossary.dto')} />
                  </Text>
                  <Text size="sm" c="dimmed">{t('domesticTransportOrders.dtoLinesDescription')}</Text>
                  {order.shipments && order.shipments.length > 1 ? (
                    <Text size="xs" c="orange">{t('domesticTransportOrders.consolidatedShipments', { count: order.shipments.length })}</Text>
                  ) : null}
                </div>
                <Badge variant="light" className="dto-line-count">{t('domesticTransportOrders.linesCount', { count: order.lines?.length ?? 0 })}</Badge>
              </Group>
              {(order.lines ?? []).length === 0 ? (
                <EmptyState title={t('domesticTransportOrders.noDtoLinesTitle')} description={t('domesticTransportOrders.noDtoLinesDescription')} />
              ) : (
                <div className="dto-lines-list">
                  {(order.lines ?? []).map((line) => (
                    <DtoLineCard key={line.id} line={line} />
                  ))}
                </div>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function OverviewRoutePoint({
  align,
  icon,
  label,
  primary,
  secondary,
}: {
  align?: 'right';
  icon: ReactNode;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className={align === 'right' ? 'dto-overview-route-point is-right' : 'dto-overview-route-point'}>
      <ThemeIcon size="sm" radius="md" variant="light">
        {icon}
      </ThemeIcon>
      <div>
        <Text className="metric-label dto-detail-kicker" size="xs" fw={700} tt="uppercase">{label}</Text>
        <Text fw={800} lineClamp={1} title={primary}>{primary}</Text>
        <Text size="xs" c="dimmed" lineClamp={1} title={secondary}>{secondary}</Text>
      </div>
    </div>
  );
}

function OverviewSummaryCard({
  accent = 'cyan',
  icon,
  label,
  meta,
  value,
}: {
  accent?: 'blue' | 'cyan' | 'gray' | 'teal';
  icon: ReactNode;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <Paper withBorder p="sm" className={`dto-overview-summary dto-overview-summary-${accent}`}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon size="lg" radius="md" variant="light" className="dto-overview-summary-icon">
          {icon}
        </ThemeIcon>
        <div className="dto-overview-summary-content">
          <Text className="metric-label" size="xs" fw={700} tt="uppercase">{label}</Text>
          <Text fw={800} lineClamp={1} title={value}>{value}</Text>
          <Text size="xs" c="dimmed" lineClamp={2} title={meta}>{meta}</Text>
        </div>
      </Group>
    </Paper>
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Group gap="xs" mb="sm" wrap="nowrap" className="dto-form-section-title">
      <ThemeIcon size="sm" radius="md" variant="light">
        {icon}
      </ThemeIcon>
      <Text fw={800}>{label}</Text>
    </Group>
  );
}

function DtoLineCard({ line }: { line: DomesticTransportOrderLineV1 }) {
  const { t } = useI18n();
  const itemName = line.item_name ?? line.item_description ?? line.item_id ?? '-';
  const itemCode = line.item_code ?? line.item?.item_code ?? '-';
  const lotRef = line.lot_no ?? line.lot?.lot_no ?? line.po_lot_id ?? '-';
  const poLineRef = line.purchase_order_line_id ?? line.purchase_order_line?.id ?? '-';

  return (
    <article className="dto-line-card">
      <div className="dto-line-card-item">
        <Text fw={800} lineClamp={2} title={itemName}>
          {itemName}
        </Text>
        <Group gap={6} mt={5} wrap="wrap" className="dto-line-card-tags">
          <Badge variant="light" color="gray" className="dto-line-code-badge">
            {itemCode}
          </Badge>
          <Badge variant="outline" color="gray" className="dto-line-lot-badge">
            LOT {lotRef}
          </Badge>
          <Badge variant="outline" color="gray" className="dto-line-lot-badge">
            HS {line.hs_code ?? '-'}
          </Badge>
        </Group>
      </div>

      <dl className="dto-line-card-metrics">
        <LineMetric icon={<IconPackage size={15} />} primary label={t('domesticTransportOrders.dtoQty')} hint={t('domesticTransportOrders.dtoQtyHint')}>
          {formatNumber(line.qty)}
          {line.unit ? <span className="dto-line-metric-unit"> {line.unit}</span> : null}
        </LineMetric>
        <LineMetric icon={<IconScale size={15} />} label={t('domesticTransportOrders.grossKg')} hint={t('glossary.grossWeight')}>
          {formatNumber(line.gross_weight_kg)}
        </LineMetric>
        <LineMetric icon={<IconFileText size={15} />} label={t('domesticTransportOrders.poQty')} hint={t('glossary.po')}>
          {formatNumber(line.qty_ordered)}
        </LineMetric>
        <LineMetric icon={<IconId size={15} />} label={t('domesticTransportOrders.poLine')} hint={t('glossary.po')}>
          {poLineRef}
        </LineMetric>
      </dl>
    </article>
  );
}

function LineMetric({
  icon,
  label,
  hint,
  primary,
  children,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={primary ? 'dto-line-metric is-primary' : 'dto-line-metric'}>
      <dt className="dto-line-metric-label">
        {icon ? <span className="dto-line-metric-icon">{icon}</span> : null}
        <HeaderLabel label={label} hint={hint} />
      </dt>
      <dd className="dto-line-metric-value tabular-nums">{children}</dd>
    </div>
  );
}
