import { Badge, Group, Progress, SimpleGrid, Text } from '@mantine/core';

import type { PurchaseOrderLineV1, PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { dateOnly, getDateDelayDays, getPoFulfillment, totalPoAmount } from '../model/purchaseOrderModel';

// Execution summary: four decision cards (Amount / Lines / Fulfillment / ETA).
export function PoExecutionSummary({ lines, order }: { order: PurchaseOrderV1; lines: PurchaseOrderLineV1[] }) {
  const currency = order.currency?.currency_code ?? '';
  const amount = `${totalPoAmount(lines).toLocaleString()} ${currency}`.trim();
  const f = getPoFulfillment(lines);
  const plannedEta = order.logistics_timeline?.unloading_port?.eta ?? order.expected_eta;
  const actualAta = order.logistics_timeline?.unloading_port?.ata;
  const delay = getDateDelayDays(plannedEta, actualAta);
  const eta = dateOnly(plannedEta) || '-';
  const etaStatus = !actualAta
    ? { color: 'gray', label: 'Planned' }
    : delay && delay > 0
      ? { color: 'red', label: `${delay}d late` }
      : { color: 'teal', label: 'On time' };
  const lottedPct = f.ordered > 0 ? Math.min(100, Math.round((f.lotted / f.ordered) * 100)) : 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" className="dl-metrics-strip purchase-order-summary-strip">
      <SummaryCard label="Amount" value={amount || '-'} sub={currency ? `Currency ${currency}` : 'Order value'} />
      <SummaryCard label="Lines" value={String(f.totalLines)} sub={`${f.lottedLines}/${f.totalLines} lotted`} />

      <div className="purchase-order-summary-card">
        <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
          Fulfillment
        </Text>
        <Progress value={lottedPct} color="teal" size="sm" mt={8} mb={8} aria-label="Lotted progress" />
        <Group gap={10} className="purchase-order-summary-fulfillment">
          <Stat label="Ord" value={f.ordered} />
          <Stat label="Conf" value={f.confirmed} />
          <Stat label="Lot" value={f.lotted} />
          <Stat label="Ship" value={f.shipped} />
          <Stat label="Recv" value={f.received} />
        </Group>
      </div>

      <div className="purchase-order-summary-card">
        <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
          ETA
        </Text>
        <Text fw={900} size="lg" className="tabular-nums">
          {eta}
        </Text>
        <Badge size="sm" color={etaStatus.color} variant="light" mt={4}>
          {etaStatus.label}
        </Badge>
      </div>
    </SimpleGrid>
  );
}

function SummaryCard({ label, sub, value }: { label: string; value: string; sub: string }) {
  return (
    <div className="purchase-order-summary-card">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Text fw={900} size="lg" className="tabular-nums" title={value}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {sub}
      </Text>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="purchase-order-summary-stat">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="sm" fw={800} className="tabular-nums">
        {value.toLocaleString()}
      </Text>
    </div>
  );
}
