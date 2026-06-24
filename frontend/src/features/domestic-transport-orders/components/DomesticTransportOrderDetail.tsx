import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconClipboardCheck, IconFileCheck, IconTruckDelivery, IconX } from '@tabler/icons-react';

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
  onClose,
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
  onClose: () => void;
  onSave: () => void;
  order: DomesticTransportOrderV1;
  saving: boolean;
  truckVendorOptions: Array<{ label: string; value: string }>;
}) {
  const { t } = useI18n();
  const isClosed = ['CLOSED', 'CANCELLED'].includes(order.status);

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
                {order.origin ?? '-'} to {order.destination ?? '-'} / {order.warehouse ?? '-'}
              </Text>
            </div>
            <Group gap="xs" className="dto-detail-actions">
              {order.shipment ? <EntityLink compact id={order.shipment.shipment_no} type="shp" /> : null}
              <Tooltip label="Close detail">
                <ActionIcon aria-label="Close DTO detail" variant="subtle" onClick={onClose}>
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <div className="dto-route-rail">
            <div className="dto-route-stop">
              <Text className="metric-label dto-detail-kicker" size="xs" fw={700} tt="uppercase">Pickup</Text>
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
              <Text className="metric-label dto-detail-kicker" size="xs" fw={700} tt="uppercase">Delivery</Text>
              <Text fw={700} lineClamp={1} title={order.destination ?? '-'}>
                {order.destination ?? '-'}
              </Text>
              <Text size="xs" c="dimmed">{formatDateTime(order.scheduled_delivery_at)}</Text>
            </div>
          </div>

          <Group gap="xs" className="dto-action-strip">
            <Button size="xs" variant="light" disabled={isClosed || order.status !== 'DRAFT'} loading={actionPending} onClick={() => onAction('quote-pending')}>
              Quote pending
            </Button>
            <Button size="xs" variant="light" disabled={isClosed || !['QUOTE_PENDING', 'QUOTED'].includes(order.status)} loading={actionPending} onClick={() => onAction('confirm-quote')}>
              Confirm quote
            </Button>
            <Button size="xs" color="blue" disabled={isClosed || order.status !== 'QUOTE_CONFIRMED'} loading={actionPending} onClick={() => onAction('dispatch')}>
              Dispatch
            </Button>
            <Button size="xs" color="cyan" disabled={isClosed || order.status !== 'DISPATCHED'} loading={actionPending} onClick={() => onAction('start-transit')}>
              Start transit
            </Button>
            <Button size="xs" color="teal" disabled={isClosed || order.status !== 'IN_TRANSIT'} loading={actionPending} onClick={() => onAction('deliver')}>
              Deliver
            </Button>
            <Button size="xs" color="teal" variant="light" disabled={isClosed || order.status !== 'DELIVERED'} loading={actionPending} onClick={() => onAction('pod-received')}>
              Mark POD received
            </Button>
            <Button size="xs" color="teal" variant="outline" disabled={isClosed || !['DELIVERED', 'POD_RECEIVED'].includes(order.status)} loading={actionPending} onClick={() => onAction('close')}>
              Close
            </Button>
            <Button size="xs" color="red" variant="light" disabled={isClosed} loading={actionPending} onClick={() => onAction('cancel')}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Tabs defaultValue="overview" keepMounted={false} className="dto-detail-tabs">
        <Tabs.List className="dto-detail-tabs-list">
          <Tabs.Tab value="overview" leftSection={<IconTruckDelivery size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="dispatch" leftSection={<IconClipboardCheck size={16} />}>
            Dispatch and POD
          </Tabs.Tab>
          <Tabs.Tab value="lines" leftSection={<IconFileCheck size={16} />}>
            DTO lines
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm" className="dto-detail-facts">
            {order.shipments && order.shipments.length > 1 ? (
              <Paper withBorder p="sm">
                <Text className="metric-label" size="xs" fw={700} tt="uppercase">Shipments</Text>
                <Group gap="xs" mt={4} wrap="wrap">
                  {order.shipments.map((s) => (
                    <EntityLink key={s.id} compact id={s.shipment_no ?? s.id} type="shp" />
                  ))}
                </Group>
              </Paper>
            ) : (
              <InfoField label="Shipment" value={order.shipment?.shipment_no ?? order.shipments?.[0]?.shipment_no ?? order.shipment_id} />
            )}
            <InfoField label="Truck vendor" value={order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-'} />
            <InfoField label="Carrier DO" value={order.carrier_delivery_order?.carrier_do_no ?? order.carrier_delivery_order_id ?? '-'} />
            <InfoField label="Total qty" value={formatNumber(order.total_qty)} />
            <InfoField label="Gross weight kg" value={formatNumber(order.total_gross_weight_kg)} />
            <InfoField label="POD" value={order.pod_document_ref ?? '-'} />
            <Paper withBorder p="sm">
              <Text className="metric-label" size="xs" fw={700} tt="uppercase">Delivery</Text>
              <Text fw={700} mt={4}>{order.actual_delivery_at ? formatDateTime(order.actual_delivery_at) : 'Chưa giao'}</Text>
              <Text size="xs" c="dimmed">Kế hoạch: {formatDateTime(order.scheduled_delivery_at)}</Text>
            </Paper>
            <Paper withBorder p="sm">
              <Text className="metric-label" size="xs" fw={700} tt="uppercase">Containers</Text>
              <Group gap="xs" mt={4} wrap="wrap">
                {(() => {
                  const list = Array.isArray(order.container_no) ? order.container_no : order.container_no ? [order.container_no] : [];
                  return list.length ? list.map((no) => <Badge key={no} variant="light">{no}</Badge>) : <Text size="sm" c="dimmed">-</Text>;
                })()}
              </Group>
            </Paper>
            <InfoField
              label="Quote amount"
              value={order.quote_amount != null ? `${formatNumber(order.quote_amount)} ${order.quote_currency ?? ''}`.trim() : '-'}
            />
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="dispatch" pt="md">
          <Paper withBorder p="md" className="dto-form-panel">
            <Stack gap="md">
              <Group justify="space-between" className="dto-form-header">
                <div>
                  <Text fw={700}>Dispatch and POD data</Text>
                  <Text size="sm" c="dimmed">Update vendor, vehicle, driver, planned/actual delivery, and POD reference.</Text>
                </div>
                <Group gap="xs" className="dto-form-actions">
                  <Button leftSection={<IconCheck size={16} />} loading={saving} disabled={isClosed} onClick={onSave}>
                    Save
                  </Button>
                </Group>
              </Group>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm" className="dto-form-grid">
                <Select label="Truck vendor" searchable clearable data={truckVendorOptions} value={form.truckVendorId} disabled={isClosed} onChange={(value) => onChange({ ...form, truckVendorId: value })} />
                <TextInput label="Vehicle type" value={form.vehicleType} disabled={isClosed} onChange={(event) => onChange({ ...form, vehicleType: event.currentTarget.value })} />
                <TextInput label="Vehicle plate" value={form.vehiclePlate} disabled={isClosed} onChange={(event) => onChange({ ...form, vehiclePlate: event.currentTarget.value })} />
                <TextInput label="Driver" value={form.driverName} disabled={isClosed} onChange={(event) => onChange({ ...form, driverName: event.currentTarget.value })} />
                <TextInput label="Driver phone" value={form.driverPhone} disabled={isClosed} onChange={(event) => onChange({ ...form, driverPhone: event.currentTarget.value })} />
                <TextInput label="POD document" value={form.podDocumentRef} disabled={isClosed} onChange={(event) => onChange({ ...form, podDocumentRef: event.currentTarget.value })} />
                <TextInput label="Quote amount" type="number" value={form.quoteAmount} disabled={isClosed} onChange={(event) => onChange({ ...form, quoteAmount: event.currentTarget.value })} />
                <Select label="Quote currency" data={[{ label: 'VND', value: 'VND' }, { label: 'USD', value: 'USD' }]} value={form.quoteCurrency || null} disabled={isClosed} clearable onChange={(value) => onChange({ ...form, quoteCurrency: value ?? '' })} />
                <TextInput label="Origin" value={form.origin} disabled={isClosed} onChange={(event) => onChange({ ...form, origin: event.currentTarget.value })} />
                <TextInput label="Destination" value={form.destination} disabled={isClosed} onChange={(event) => onChange({ ...form, destination: event.currentTarget.value })} />
                <TextInput label={<HeaderLabel label="Warehouse" hint={t('glossary.warehouse')} />} value={form.warehouse} disabled={isClosed} onChange={(event) => onChange({ ...form, warehouse: event.currentTarget.value })} />
                <TextInput label="Scheduled pickup" type="datetime-local" value={form.scheduledPickupAt} disabled={isClosed} onChange={(event) => onChange({ ...form, scheduledPickupAt: event.currentTarget.value })} />
                <TextInput label="Actual pickup" type="datetime-local" value={form.actualPickupAt} disabled={isClosed} onChange={(event) => onChange({ ...form, actualPickupAt: event.currentTarget.value })} />
                <TextInput label="Scheduled delivery" type="datetime-local" value={form.scheduledDeliveryAt} disabled={isClosed} onChange={(event) => onChange({ ...form, scheduledDeliveryAt: event.currentTarget.value })} />
                <TextInput label="Actual delivery" type="datetime-local" value={form.actualDeliveryAt} disabled={isClosed} onChange={(event) => onChange({ ...form, actualDeliveryAt: event.currentTarget.value })} />
                <TextInput label="Note" value={form.note} disabled={isClosed} onChange={(event) => onChange({ ...form, note: event.currentTarget.value })} />
              </SimpleGrid>
            </Stack>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="lines" pt="md">
          <Paper withBorder p="md" className="dto-lines-panel">
            <Stack gap="md">
              <Group justify="space-between" className="dto-lines-header">
                <div>
                  <Text fw={700}>
                    <HeaderLabel label="DTO lines" hint={t('glossary.dto')} />
                  </Text>
                  <Text size="sm" c="dimmed">Lines are copied from shipment lines and enriched by item, PO line, LOT, HS code, and weight.</Text>
                  {order.shipments && order.shipments.length > 1 ? (
                    <Text size="xs" c="orange">1 trong {order.shipments.length} shipment được gom vào chuyến này</Text>
                  ) : null}
                </div>
                <Badge variant="light" className="dto-line-count">{order.lines?.length ?? 0} lines</Badge>
              </Group>
              <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={900} verticalSpacing="sm" className="dto-table dto-lines-table">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Item</Table.Th>
                      <Table.Th>
                        <HeaderLabel label="LOT" hint={t('glossary.lot')} />
                      </Table.Th>
                      <Table.Th>
                        <HeaderLabel label="HS" hint={t('glossary.hsCode')} />
                      </Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>
                        <HeaderLabel label="DTO qty" hint="Toàn bộ qty của shipment line cho chặng nội địa — không phải phần chia nhỏ" />
                      </Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>
                        <HeaderLabel label="PO qty" hint={t('glossary.po')} />
                      </Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>
                        <HeaderLabel label="Gross kg" hint={t('glossary.grossWeight')} />
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(order.lines ?? []).map((line) => (
                      <Table.Tr key={line.id} className="dto-line-row">
                        <Table.Td className="dto-lines-sticky-cell">
                          <Text fw={600}>{line.item_name ?? line.item_description ?? line.item_id ?? '-'}</Text>
                          <Text size="xs" c="dimmed">{line.item_code ?? line.unit ?? '-'}</Text>
                        </Table.Td>
                        <Table.Td>{line.lot_no ?? line.po_lot_id ?? '-'}</Table.Td>
                        <Table.Td>{line.hs_code ?? '-'}</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          {formatNumber(line.qty)} {line.unit ?? ''}
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(line.qty_ordered)}</Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>{formatNumber(line.gross_weight_kg)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              {(order.lines ?? []).length === 0 ? (
                <EmptyState title="No DTO lines" description="This domestic transport order has no copied shipment lines yet." />
              ) : null}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
