import {
  ActionIcon,
  Alert,
  Badge,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTruck, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchShipmentDomesticTransportOrders,
  unlinkDtoFromShipment,
  type DomesticTransportOrderV1,
} from '@shared/api/domesticTransportOrders';
import type { ShipmentRecord } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { DateTimeText } from '@shared/components/DateTimeText';
import { EmptyState } from '@shared/components/EmptyState';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { fetchShipmentContainers } from '@shared/api/shipmentContainers';
import { resolveShipmentDelivery, type ShipmentDeliveryState } from '../model/deliveryReconciliation';

const DELIVERY_STATE_META: Record<ShipmentDeliveryState, { labelKey: string; color: string }> = {
  NO_CONTAINERS: { labelKey: 'shipments.dtosNoContainers', color: 'gray' },
  UNALLOCATED: { labelKey: 'shipments.dtosUnallocated', color: 'orange' },
  IN_PROGRESS: { labelKey: 'shipments.inTransit', color: 'blue' },
  COMPLETE: { labelKey: 'shipments.delivered', color: 'teal' },
};

export function ShipmentDtosPanel({ shipment }: { shipment: ShipmentRecord }) {
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const dtosQuery = useQuery({
    queryKey: queryKeys.shipmentDtos(shipment.id),
    queryFn: () => fetchShipmentDomesticTransportOrders(shipment.id),
  });
  const dtos: DomesticTransportOrderV1[] = dtosQuery.data?.data ?? [];

  const containersQuery = useQuery({
    queryKey: queryKeys.shipmentContainers(shipment.id),
    queryFn: () => fetchShipmentContainers(shipment.id),
  });
  const summary = resolveShipmentDelivery(containersQuery.data ?? [], dtos);

  const unlinkMutation = useMutation({
    mutationFn: (dtoId: string) => unlinkDtoFromShipment(shipment.id, dtoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentDtos(shipment.id) });
    },
  });

  return (
    <Stack gap="md">
      <Alert color="teal" icon={<IconTruck size={18} />}>
        {t('shipments.dtosPanel.info')}
      </Alert>

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" mb="sm">
          <div>
            <Text fw={700}>{t('shipments.dtosReconciliation')}</Text>
            <Text size="sm" c="dimmed">
              {summary.state === 'NO_CONTAINERS'
                ? t('shipments.dtosNoContainersSummary', { delivered: summary.deliveredDtoCount, total: summary.totalDtoCount })
                : t('shipments.dtosDeliveryProgress', { delivered: summary.delivered, total: summary.totalContainers })}
            </Text>
          </div>
          <Badge color={DELIVERY_STATE_META[summary.state].color} variant="light" size="lg">
            {t(DELIVERY_STATE_META[summary.state].labelKey)}
          </Badge>
        </Group>
        {summary.totalContainers > 0 ? (
          <Progress
            value={Math.round((summary.delivered / summary.totalContainers) * 100)}
            color={DELIVERY_STATE_META[summary.state].color}
            radius="xl"
            size="sm"
          />
        ) : null}
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="sm">
          <div><Text size="xs" c="dimmed">{t('shipments.dtosContainer')}</Text><Text fw={700} className="tabular-nums">{summary.totalContainers}</Text></div>
          <div><Text size="xs" c="dimmed">{t('shipments.dtosAllocated')}</Text><Text fw={700} className="tabular-nums">{summary.allocated}</Text></div>
          <div><Text size="xs" c="dimmed">{t('shipments.dtosDelivered')}</Text><Text fw={700} className="tabular-nums">{summary.delivered}</Text></div>
          <div>
            <Text size="xs" c="dimmed">{t('shipments.dtosLatestPod')}</Text>
            <Text fw={700}>
              {summary.latestPodAt ? <DateTimeText value={summary.latestPodAt} /> : '-'}
            </Text>
          </div>
        </SimpleGrid>
      </Paper>

      {dtosQuery.isLoading ? (
        <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">{t('shipments.dtosPanel.loading')}</Text></Group>
      ) : dtos.length === 0 ? (
        <EmptyState title={t('shipments.dtosPanel.emptyTitle')} description={t('shipments.dtosPanel.emptyDescription')} />
      ) : (
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={700} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('shipments.dtosPanel.dtoNo')}</Table.Th>
                  <Table.Th>{t('shipments.dtosPanel.vendor')}</Table.Th>
                  <Table.Th>{t('common.route')}</Table.Th>
                  <Table.Th>{t('shipments.dtosPanel.pickup')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dtos.map((dto) => (
                  <Table.Tr key={dto.id}>
                    <Table.Td><Text fw={700}>{dto.dto_no}</Text></Table.Td>
                    <Table.Td>{dto.truck_vendor?.forwarder_name ?? dto.truck_vendor_id ?? '-'}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{dto.origin ?? '-'}</Text>
                      <Text size="xs" c="dimmed">{dto.destination ?? '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <DateTimeText value={dto.scheduled_pickup_at} size="xs" />
                    </Table.Td>
                    <Table.Td><StatusBadge status={dto.status} /></Table.Td>
                    <Table.Td>
                      <Tooltip label={t('shipments.dtosPanel.unlinkTooltip')}>
                        <ActionIcon
                          aria-label={t('shipments.dtosPanel.unlinkAria')}
                          color="red"
                          variant="subtle"
                          loading={unlinkMutation.isPending}
                          onClick={() => unlinkMutation.mutate(dto.id)}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {unlinkMutation.isError && (
        <Alert color="red" icon={<IconX size={16} />}>
          {unlinkMutation.error instanceof Error ? unlinkMutation.error.message : t('shipments.dtosPanel.operationFailed')}
        </Alert>
      )}
    </Stack>
  );
}
