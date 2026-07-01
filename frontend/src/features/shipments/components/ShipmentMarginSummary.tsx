import { Badge, Group, Paper, ScrollArea, Table, Text } from '@mantine/core';

import type { QuotationV1 } from '@shared/api/quotations';
import type { ShipmentRecord } from '@shared/api/logistics';
import { formatMoney } from '@shared/utils/money';

import { shipmentMarginSummary } from '../model/marginModel';

const BASE_CURRENCY = 'VND';

type ShipmentWithQuotation = ShipmentRecord & {
  final_quotation?: QuotationV1 | null;
};

export function ShipmentMarginSummary({
  shipment,
  t,
}: {
  shipment: ShipmentWithQuotation;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const quotation = shipment.final_quotation ?? null;

  if (!quotation) {
    return (
      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Text fw={700} size="sm">
            {t('shipments.marginTitle')}
          </Text>
          <Badge variant="light" color="gray">
            {BASE_CURRENCY}
          </Badge>
        </Group>
        <Text mt={6} size="sm" c="dimmed">
          {t('shipments.noLinkedQuotation')}
        </Text>
      </Paper>
    );
  }

  const summary = shipmentMarginSummary(shipment);

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" align="center" gap="sm" mb="sm">
        <Text fw={700} size="sm">
          {t('shipments.marginTitle')}
        </Text>
        <Badge variant="light" color={marginColor(summary.totals.marginVnd)}>
          {formatMoney(summary.totals.marginVnd, BASE_CURRENCY)}
        </Badge>
      </Group>

      <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={560} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('shipments.costType')}</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>{t('shipments.quoted')}</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>{t('shipments.actual')}</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>{t('shipments.margin')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {summary.rows.map((row) => (
              <Table.Tr key={row.bucket}>
                <Table.Td>{t(`shipments.costTypes.${row.bucket}`)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatMoney(row.quotedVnd, BASE_CURRENCY)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{formatMoney(row.actualVnd, BASE_CURRENCY)}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text component="span" fw={700} c={marginColor(row.marginVnd)}>
                    {formatMoney(row.marginVnd, BASE_CURRENCY)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
            <Table.Tr>
              <Table.Td>
                <Text fw={800}>{t('common.total')}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={800}>{formatMoney(summary.totals.quotedVnd, BASE_CURRENCY)}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={800}>{formatMoney(summary.totals.actualVnd, BASE_CURRENCY)}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={800} c={marginColor(summary.totals.marginVnd)}>
                  {formatMoney(summary.totals.marginVnd, BASE_CURRENCY)}
                </Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

function marginColor(value: number) {
  if (value > 0) return 'teal';
  if (value < 0) return 'red';
  return 'dimmed';
}
