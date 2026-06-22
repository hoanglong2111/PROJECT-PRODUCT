import { Badge, Group, NumberFormatter, Paper, ScrollArea, Table, Text } from '@mantine/core';
import { useMemo } from 'react';

import type { PurchaseOrderLineV1 } from '@shared/api/purchaseOrders';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

import { getPoLineLotState, toNumber } from '../model/purchaseOrderModel';

export function PoLinesTable({ currencyCode, lines }: { currencyCode: string; lines: PurchaseOrderLineV1[] }) {
  const { t } = useI18n();
  const lotMetrics = useMemo(
    () =>
      lines.reduce(
        (metrics, line) => {
          const state = getPoLineLotState(line);
          if (state === 'full') metrics.full += 1;
          if (state === 'partial') metrics.partial += 1;
          if (state === 'needs-lot') metrics.needsLot += 1;
          return metrics;
        },
        { full: 0, partial: 0, needsLot: 0 },
      ),
    [lines],
  );

  return (
    <Paper withBorder p={0} className="purchase-order-po-lines-panel">
      <Group justify="space-between" p="sm" className="purchase-order-po-lines-header">
        <Text fw={700}>PO lines</Text>
        <Group gap={6} wrap="nowrap" className="purchase-order-po-lines-badges">
          <Badge variant="light" className="purchase-order-nowrap-badge">{lines.length} rows</Badge>
          {lotMetrics.full > 0 ? (
            <Badge color="teal" variant="light" className="purchase-order-nowrap-badge">
              {lotMetrics.full} lotted
            </Badge>
          ) : null}
          {lotMetrics.partial > 0 ? (
            <Badge color="orange" variant="light" className="purchase-order-nowrap-badge">
              {lotMetrics.partial} partial
            </Badge>
          ) : null}
          {lotMetrics.needsLot > 0 ? (
            <Badge color="red" variant="light" className="purchase-order-nowrap-badge">
              {lotMetrics.needsLot} needs LOT
            </Badge>
          ) : null}
        </Group>
      </Group>
      <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
        <Table className="purchase-order-po-lines-table" miw={1260} verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 80 }}>Line</Table.Th>
              <Table.Th>Item</Table.Th>
              <Table.Th>
                <HeaderLabel label="HSCODE" hint={t('glossary.hsCode')} />
              </Table.Th>
              <Table.Th style={{ width: 130 }}>Ordered</Table.Th>
              <Table.Th style={{ width: 130 }}>Confirmed</Table.Th>
              <Table.Th style={{ width: 130 }}>
                <HeaderLabel label="Lotted" hint={t('glossary.lot')} />
              </Table.Th>
              <Table.Th style={{ width: 130 }}>Shipped</Table.Th>
              <Table.Th style={{ width: 130 }}>Received</Table.Th>
              <Table.Th style={{ width: 130 }}>
                <HeaderLabel label="Weight" hint={t('glossary.grossWeight')} />
              </Table.Th>
              <Table.Th style={{ width: 135 }}>Unit price</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line) => {
              const lotState = getPoLineLotState(line);
              const lotColor = lotState === 'full' ? 'teal' : lotState === 'partial' ? 'orange' : lotState === 'needs-lot' ? 'red' : 'gray';
              const lotLabel =
                lotState === 'full' ? 'Lotted' : lotState === 'partial' ? 'Partial' : lotState === 'needs-lot' ? 'Needs LOT' : 'No LOT';
              return (
                <Table.Tr key={line.id} className={`po-line-row po-line-row-${lotState}`}>
                  <Table.Td className="purchase-order-line-index">#{line.line_no}</Table.Td>
                  <Table.Td className="table-cell-truncate" style={{ maxWidth: '22rem' }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={700} lineClamp={1} title={line.item?.item_code ?? line.item_id}>
                        {line.item?.item_code ?? line.item_id}
                      </Text>
                      {lotState !== 'none' ? (
                        <Badge size="xs" color={lotColor} variant="light" className="purchase-order-nowrap-badge">
                          {lotLabel}
                        </Badge>
                      ) : null}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {line.item?.item_name ?? line.item_description ?? '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td className="purchase-order-line-hscode">
                    <Text size="sm">{line.item_customs_profile?.hs_code ?? '-'}</Text>
                    <Text size="xs" c="dimmed">
                      {line.item_customs_profile?.co_form ?? '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    <NumberFormatter value={line.qty_ordered} thousandSeparator /> {line.unit ?? ''}
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    <NumberFormatter value={line.qty_confirmed} thousandSeparator /> {line.unit ?? ''}
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    <Badge color={lotColor} variant={lotState === 'none' ? 'outline' : 'light'} radius="sm" className="purchase-order-quantity-badge">
                      <NumberFormatter value={line.qty_lotted} thousandSeparator /> {line.unit ?? ''}
                    </Badge>
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    <NumberFormatter value={line.qty_shipped} thousandSeparator /> {line.unit ?? ''}
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    <NumberFormatter value={line.qty_received} thousandSeparator /> {line.unit ?? ''}
                  </Table.Td>
                  <Table.Td className="purchase-order-quantity-cell">
                    {toNumber(line.gross_weight_kg) ? (
                      <>
                        <NumberFormatter value={line.gross_weight_kg ?? 0} thousandSeparator /> kg
                      </>
                    ) : (
                      '-'
                    )}
                  </Table.Td>
                  <Table.Td className="purchase-order-money">
                    <NumberFormatter value={line.unit_price ?? 0} thousandSeparator /> {currencyCode}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
