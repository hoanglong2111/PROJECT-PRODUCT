import { ActionIcon, Group, Paper, ScrollArea, Table, Text, Tooltip } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

import type { DomesticTransportOrderV1 } from '@shared/api/domesticTransportOrders';
import { CopyValue } from '@shared/components/CopyValue';
import { DateTimeText } from '@shared/components/DateTimeText';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { PAGE_SIZE, formatContainers } from '../model/domesticTransportOrderModel';

export function DtoListTable({
  onSelect,
  orders,
  page,
  pageCount,
  selectedDtoId,
  setPage,
  total,
}: {
  onSelect: (order: DomesticTransportOrderV1) => void;
  orders: DomesticTransportOrderV1[];
  page: number;
  pageCount: number;
  selectedDtoId: string | null;
  setPage: (page: number) => void;
  total: number;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p={0} className="dto-list-panel dl-data-panel">
      <Group justify="space-between" align="flex-start" gap="sm" className="dto-list-header dl-data-panel-header">
        <div>
          <Text fw={700}>{t('domesticTransportOrders.transportQueue')}</Text>
          <Text size="sm" c="dimmed" className="tabular-nums">
            {t('domesticTransportOrders.ordersCount', { count: total })}
          </Text>
        </div>
        <Text size="xs" c="dimmed" className="tabular-nums">
          {t('domesticTransportOrders.pageCount', { page, pageCount })}
        </Text>
      </Group>
      <ScrollArea className="dto-list-scroll data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table
          miw={1180}
          verticalSpacing="sm"
          highlightOnHover
          data-with-row-border
          className="dto-table dto-list-table"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th className="dto-col-dto">
                <HeaderLabel label="DTO" hint={t('glossary.dto')} />
              </Table.Th>
              <Table.Th className="dto-col-shipment">
                <HeaderLabel label={t('domesticTransportOrders.shipment')} hint={t('glossary.shipment')} />
              </Table.Th>
              <Table.Th className="dto-col-vendor">{t('domesticTransportOrders.vendor')}</Table.Th>
              <Table.Th className="dto-col-route">{t('domesticTransportOrders.route')}</Table.Th>
              <Table.Th className="dto-col-status">{t('common.status')}</Table.Th>
              <Table.Th className="dto-col-open">{t('common.view')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.map((order) => (
              <Table.Tr
                key={order.id}
                className={order.id === selectedDtoId ? 'dto-list-row is-selected' : 'dto-list-row'}
                onClick={() => onSelect(order)}
              >
                <Table.Td className="table-cell-truncate dto-identity-cell dto-col-dto" style={{ maxWidth: '16rem' }}>
                  <CopyValue value={order.dto_no} hoverReveal>
                    <Text component="span" fw={700} lineClamp={1} title={order.dto_no} className="dl-code-text">{order.dto_no}</Text>
                  </CopyValue>
                  <Text size="xs" c="dimmed">{order.vehicle_plate ?? order.vehicle_type ?? '-'}</Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate dto-shipment-cell dto-col-shipment" style={{ maxWidth: '17rem' }}>
                  <Text size="sm" lineClamp={1} title={order.shipment?.shipment_no ?? order.shipments?.[0]?.shipment_no ?? order.shipment_id}>
                    {order.shipments && order.shipments.length > 1
                      ? t('domesticTransportOrders.shipmentsCount', { count: order.shipments.length })
                      : order.shipment?.shipment_no ?? order.shipments?.[0]?.shipment_no ?? order.shipment_id}
                  </Text>
                  <Text size="xs" c="dimmed">{formatContainers(order.shipment?.container_no)}</Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate dto-vendor-cell dto-col-vendor" style={{ maxWidth: '18rem' }}>
                  <Text size="sm" fw={600} lineClamp={1} title={order.truck_vendor?.forwarder_name ?? order.truck_vendor_id ?? '-'}>
                    {order.truck_vendor?.forwarder_name ?? order.truck_vendor_id ?? '-'}
                  </Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate dto-route-cell dto-col-route" style={{ maxWidth: '22rem' }}>
                  <Text size="sm" fw={600} lineClamp={1} title={`${order.origin ?? '-'} -> ${order.destination ?? '-'}`}>
                    {order.origin ?? '-'} {'->'} {order.destination ?? '-'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('domesticTransportOrders.pickup')} <DateTimeText value={order.scheduled_pickup_at} size="xs" c="dimmed" />
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('domesticTransportOrders.delivery')} <DateTimeText value={order.scheduled_delivery_at} size="xs" c="dimmed" />
                  </Text>
                </Table.Td>
                <Table.Td className="dto-col-status"><StatusBadge status={order.status} /></Table.Td>
                <Table.Td className="dto-col-open">
                  <Group justify="flex-end">
                    <Tooltip label={t('domesticTransportOrders.openDetail')}>
                      <ActionIcon
                        aria-label={t('domesticTransportOrders.openDetail')}
                        variant="subtle"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelect(order);
                        }}
                      >
                        <IconExternalLink size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <ListPagination
        page={page}
        pageCount={pageCount}
        pageEnd={Math.min(total, page * PAGE_SIZE)}
        pageStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
        setPage={setPage}
        total={total}
      />
      {orders.length === 0 ? (
        <EmptyState title={t('domesticTransportOrders.emptyTitle')} description={t('domesticTransportOrders.emptyDescription')} />
      ) : null}
    </Paper>
  );
}
