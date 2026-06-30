import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconClipboardCheck, IconFileCheck, IconTruckDelivery } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { DomesticTransportOrderAction, DomesticTransportOrderV1 } from '@shared/api/domesticTransportOrders';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@entities/logistics';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { InfoField } from '@shared/components/InfoField';
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
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm" className="dto-detail-facts">
            {order.shipments && order.shipments.length > 1 ? (
              <Paper withBorder p="sm">
                <Text className="metric-label" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.shipments')}</Text>
                <Group gap="xs" mt={4} wrap="wrap">
                  {order.shipments.map((s) => (
                    <EntityLink key={s.id} compact id={s.shipment_no ?? s.id} type="shp" />
                  ))}
                </Group>
              </Paper>
            ) : (
              <InfoField label={t('domesticTransportOrders.shipment')} value={order.shipment?.shipment_no ?? order.shipments?.[0]?.shipment_no ?? order.shipment_id} />
            )}
            <InfoField label={t('domesticTransportOrders.truckVendor')} value={order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-'} />
            <InfoField label={t('domesticTransportOrders.carrierDo')} value={order.carrier_delivery_order?.carrier_do_no ?? order.carrier_delivery_order_id ?? '-'} />
            <InfoField label={t('domesticTransportOrders.totalQty')} value={formatNumber(order.total_qty)} />
            <InfoField label={t('domesticTransportOrders.grossWeightKg')} value={formatNumber(order.total_gross_weight_kg)} />
            <InfoField label="POD" value={order.pod_document_ref ?? '-'} />
            <Paper withBorder p="sm">
              <Text className="metric-label" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.delivery')}</Text>
              <Text fw={700} mt={4}>{order.actual_delivery_at ? formatDateTime(order.actual_delivery_at) : t('domesticTransportOrders.notDelivered')}</Text>
              <Text size="xs" c="dimmed">{t('domesticTransportOrders.planned')}: {formatDateTime(order.scheduled_delivery_at)}</Text>
            </Paper>
            <Paper withBorder p="sm">
              <Text className="metric-label" size="xs" fw={700} tt="uppercase">{t('domesticTransportOrders.containers')}</Text>
              <Group gap="xs" mt={4} wrap="wrap">
                {(() => {
                  const list = Array.isArray(order.container_no) ? order.container_no : order.container_no ? [order.container_no] : [];
                  return list.length ? list.map((no) => <Badge key={no} variant="light">{no}</Badge>) : <Text size="sm" c="dimmed">-</Text>;
                })()}
              </Group>
            </Paper>
            <InfoField
              label={t('domesticTransportOrders.quoteAmount')}
              value={order.quote_amount != null ? `${formatNumber(order.quote_amount)} ${order.quote_currency ?? ''}`.trim() : '-'}
            />
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="dispatch" pt="md">
          <Paper withBorder p="md" className="dto-form-panel">
            <Stack gap="md">
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
                <section className="dto-form-section">
                  <Text fw={700} mb="sm">{t('domesticTransportOrders.truckVendor')}</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" className="dto-form-grid">
                    <Select label={t('domesticTransportOrders.truckVendor')} searchable clearable data={truckVendorOptions} value={form.truckVendorId} disabled={isClosed} onChange={(value) => onChange({ ...form, truckVendorId: value })} />
                    <TextInput label={t('domesticTransportOrders.vehicleType')} value={form.vehicleType} disabled={isClosed} onChange={(event) => onChange({ ...form, vehicleType: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.vehiclePlate')} value={form.vehiclePlate} disabled={isClosed} onChange={(event) => onChange({ ...form, vehiclePlate: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.driver')} value={form.driverName} disabled={isClosed} onChange={(event) => onChange({ ...form, driverName: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.driverPhone')} value={form.driverPhone} disabled={isClosed} onChange={(event) => onChange({ ...form, driverPhone: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.driverIdentityNo')} value={form.driverIdentityNo} disabled={isClosed} onChange={(event) => onChange({ ...form, driverIdentityNo: event.currentTarget.value })} />
                  </SimpleGrid>
                </section>

                <section className="dto-form-section">
                  <Text fw={700} mb="sm">{t('domesticTransportOrders.route')}</Text>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" className="dto-form-grid">
                    <TextInput label={t('domesticTransportOrders.origin')} value={form.origin} disabled={isClosed} onChange={(event) => onChange({ ...form, origin: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.destination')} value={form.destination} disabled={isClosed} onChange={(event) => onChange({ ...form, destination: event.currentTarget.value })} />
                    <TextInput label={<HeaderLabel label={t('domesticTransportOrders.warehouse')} hint={t('glossary.warehouse')} />} value={form.warehouse} disabled={isClosed} onChange={(event) => onChange({ ...form, warehouse: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.scheduledPickup')} type="datetime-local" value={form.scheduledPickupAt} disabled={isClosed} onChange={(event) => onChange({ ...form, scheduledPickupAt: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.actualPickup')} type="datetime-local" value={form.actualPickupAt} disabled={isClosed} onChange={(event) => onChange({ ...form, actualPickupAt: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.scheduledDelivery')} type="datetime-local" value={form.scheduledDeliveryAt} disabled={isClosed} onChange={(event) => onChange({ ...form, scheduledDeliveryAt: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.actualDelivery')} type="datetime-local" value={form.actualDeliveryAt} disabled={isClosed} onChange={(event) => onChange({ ...form, actualDeliveryAt: event.currentTarget.value })} />
                  </SimpleGrid>
                </section>

                <section className="dto-form-section is-wide">
                  <Text fw={700} mb="sm">{t('domesticTransportOrders.dispatchAndPod')}</Text>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" className="dto-form-grid">
                    <TextInput label={t('domesticTransportOrders.podDocument')} value={form.podDocumentRef} disabled={isClosed} onChange={(event) => onChange({ ...form, podDocumentRef: event.currentTarget.value })} />
                    <TextInput label={t('domesticTransportOrders.quoteAmount')} type="number" value={form.quoteAmount} disabled={isClosed} onChange={(event) => onChange({ ...form, quoteAmount: event.currentTarget.value })} />
                    <Select label={t('domesticTransportOrders.quoteCurrency')} data={[{ label: 'VND', value: 'VND' }, { label: 'USD', value: 'USD' }]} value={form.quoteCurrency || null} disabled={isClosed} clearable onChange={(value) => onChange({ ...form, quoteCurrency: value ?? '' })} />
                  </SimpleGrid>
                  <Textarea mt="sm" label={t('common.notes')} minRows={3} value={form.note} disabled={isClosed} onChange={(event) => onChange({ ...form, note: event.currentTarget.value })} />
                </section>
              </div>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="lines" pt="md">
          <Paper withBorder p="md" className="dto-lines-panel">
            <Stack gap="md">
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
                <div className="dto-lines-grid">
                  {(order.lines ?? []).map((line) => {
                    const itemName = line.item_name ?? line.item_description ?? line.item_id ?? '-';
                    return (
                      <article key={line.id} className="dto-line-card">
                        <div className="dto-line-card-head">
                          <div className="dto-line-card-item">
                            <Text fw={600} lineClamp={1} title={itemName}>
                              {itemName}
                            </Text>
                            <Text size="xs" c="dimmed">{line.item_code ?? line.unit ?? '-'}</Text>
                          </div>
                          <Badge variant="outline" color="gray" className="dto-line-lot-badge">
                            {line.lot_no ?? line.po_lot_id ?? '-'}
                          </Badge>
                        </div>

                        <dl className="dto-line-card-metrics">
                          <LineMetric primary label={t('domesticTransportOrders.dtoQty')} hint={t('domesticTransportOrders.dtoQtyHint')}>
                            {formatNumber(line.qty)}
                            {line.unit ? <span className="dto-line-metric-unit"> {line.unit}</span> : null}
                          </LineMetric>
                          <LineMetric label={t('domesticTransportOrders.poQty')} hint={t('glossary.po')}>
                            {formatNumber(line.qty_ordered)}
                          </LineMetric>
                          <LineMetric label={t('domesticTransportOrders.grossKg')} hint={t('glossary.grossWeight')}>
                            {formatNumber(line.gross_weight_kg)}
                          </LineMetric>
                          <LineMetric label="HS" hint={t('glossary.hsCode')}>
                            {line.hs_code ?? '-'}
                          </LineMetric>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function LineMetric({
  label,
  hint,
  primary,
  children,
}: {
  label: string;
  hint?: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={primary ? 'dto-line-metric is-primary' : 'dto-line-metric'}>
      <dt className="dto-line-metric-label">
        <HeaderLabel label={label} hint={hint} />
      </dt>
      <dd className="dto-line-metric-value tabular-nums">{children}</dd>
    </div>
  );
}
