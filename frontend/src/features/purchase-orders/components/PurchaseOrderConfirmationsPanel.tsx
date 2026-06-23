import { Alert, Badge, Group, Loader, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';

import { fetchPurchaseOrderConfirmations } from '@shared/api/purchaseOrders';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';

import { dateOnly } from '../model/purchaseOrderModel';

export function PurchaseOrderConfirmationsPanel({ purchaseOrderId }: { purchaseOrderId: string }) {
  const confirmationsQuery = useQuery({
    queryKey: queryKeys.purchaseOrderConfirmations(purchaseOrderId),
    queryFn: () => fetchPurchaseOrderConfirmations(purchaseOrderId),
  });

  if (confirmationsQuery.isLoading) {
    return (
      <Paper withBorder p="lg" className="purchase-order-confirmations-panel">
        <Group justify="center">
          <Loader size="sm" />
          <Text c="dimmed">Loading supplier confirmations...</Text>
        </Group>
      </Paper>
    );
  }

  if (confirmationsQuery.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />}>
        {getApiErrorMessage(confirmationsQuery.error)}
      </Alert>
    );
  }

  const confirmations = confirmationsQuery.data ?? [];
  // The supplier has not confirmed yet — nothing to show. The "Confirm" action in
  // the hero is the entry point for creating the first confirmation.
  if (confirmations.length === 0) return null;

  return (
    <Paper withBorder p={0} className="purchase-order-confirmations-panel">
      <Group justify="space-between" p="sm" className="purchase-order-confirmations-header">
        <Group gap="xs">
          <IconCircleCheck size={18} />
          <Text fw={700}>Supplier confirmations</Text>
        </Group>
        <Badge variant="light" className="purchase-order-nowrap-badge">
          {confirmations.length} {confirmations.length === 1 ? 'record' : 'records'}
        </Badge>
      </Group>

      <Stack gap="sm" p="sm" pt={0}>
        {confirmations.map((confirmation) => (
          <Paper withBorder p="sm" key={confirmation.id} className="purchase-order-confirmation-card">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text fw={700} size="sm">
                  {confirmation.supplier_ref_no ?? 'No supplier ref'}
                </Text>
                <Text size="xs" c="dimmed">
                  Confirmed by {confirmation.confirmed_by ?? '-'} · {dateOnly(confirmation.confirmed_at) || '-'}
                </Text>
              </div>
              <Group gap={6} wrap="nowrap">
                <Badge size="sm" variant="light" color={confirmation.is_full_shipment ? 'teal' : 'orange'} className="purchase-order-nowrap-badge">
                  {confirmation.is_full_shipment ? 'Full shipment' : 'Partial shipment'}
                </Badge>
                {confirmation.allow_partial_shipment ? (
                  <Badge size="sm" variant="light" color="blue" className="purchase-order-nowrap-badge">
                    Partial allowed
                  </Badge>
                ) : null}
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mt="sm" spacing="xs">
              <ConfirmationField label="Cargo ready" value={dateOnly(confirmation.cargo_ready_date) || '-'} />
              <ConfirmationField label="Confirmed at" value={dateOnly(confirmation.confirmed_at) || '-'} />
              <ConfirmationField label="Lines confirmed" value={String(confirmation.lines?.length ?? '-')} />
            </SimpleGrid>

            {confirmation.note ? (
              <Text size="sm" c="dimmed" mt="xs">
                {confirmation.note}
              </Text>
            ) : null}
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}

function ConfirmationField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600} className="tabular-nums">
        {value}
      </Text>
    </div>
  );
}
