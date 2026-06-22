import { ActionIcon, Group, Paper, ScrollArea, Table, Text, Tooltip } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';

import type { DomesticTransportOrderV1 } from '@shared/api/domesticTransportOrders';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { PAGE_SIZE, formatContainers, formatDateTime } from '../model/domesticTransportOrderModel';

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
    <Paper withBorder p={0} className="dto-list-panel">
      <Group justify="space-between" align="flex-start" gap="sm" className="dto-list-header">
        <div>
          <Text fw={700}>Transport queue</Text>
          <Text size="sm" c="dimmed" className="tabular-nums">
            {total} orders
          </Text>
        </div>
        <Text size="xs" c="dimmed" className="tabular-nums">
          Page {page} / {pageCount}
        </Text>
      </Group>
      <ScrollArea className="dto-list-scroll data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={820} verticalSpacing="sm" highlightOnHover className="dto-table dto-list-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <HeaderLabel label="DTO" hint={t('glossary.dto')} />
              </Table.Th>
              <Table.Th>
                <HeaderLabel label="Shipment" hint={t('glossary.shipment')} />
              </Table.Th>
              <Table.Th>Vendor</Table.Th>
              <Table.Th>Route</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Open</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {orders.map((order) => (
              <Table.Tr
                key={order.id}
                className={order.id === selectedDtoId ? 'dto-list-row is-selected' : 'dto-list-row'}
                onClick={() => onSelect(order)}
              >
                <Table.Td className="dto-identity-cell">
                  <Text fw={700}>{order.dto_no}</Text>
                  <Text size="xs" c="dimmed">{order.vehicle_plate ?? order.vehicle_type ?? '-'}</Text>
                </Table.Td>
                <Table.Td className="dto-shipment-cell">
                  <Text size="sm">
                    {order.shipments && order.shipments.length > 1
                      ? `${order.shipments.length} shipments`
                      : order.shipment?.shipment_no ?? order.shipments?.[0]?.shipment_no ?? order.shipment_id}
                  </Text>
                  <Text size="xs" c="dimmed">{formatContainers(order.shipment?.container_no)}</Text>
                </Table.Td>
                <Table.Td className="dto-vendor-cell">{order.truck_vendor?.supplier_name ?? order.truck_vendor_id ?? '-'}</Table.Td>
                <Table.Td className="dto-route-cell">
                  <Text size="sm" fw={600} lineClamp={1} title={`${order.origin ?? '-'} -> ${order.destination ?? '-'}`}>
                    {order.origin ?? '-'} {'->'} {order.destination ?? '-'}
                  </Text>
                  <Text size="xs" c="dimmed">Pickup {formatDateTime(order.scheduled_pickup_at)}</Text>
                  <Text size="xs" c="dimmed">Delivery {formatDateTime(order.scheduled_delivery_at)}</Text>
                </Table.Td>
                <Table.Td><StatusBadge status={order.status} /></Table.Td>
                <Table.Td>
                  <Group justify="flex-end">
                    <Tooltip label="Open DTO detail">
                      <ActionIcon
                        aria-label="Open DTO detail"
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
        <EmptyState title="No DTO found" description="No domestic transport order matches the current filters." />
      ) : null}
    </Paper>
  );
}
