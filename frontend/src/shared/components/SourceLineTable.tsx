import { Badge, Group, NumberFormatter, Paper, ScrollArea, Stack, Table, Text } from '@mantine/core';

import type { DeliverySourceLine, PurchaseOrderLineItem } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

type SourceLine = DeliverySourceLine | PurchaseOrderLineItem;

function isDeliveryLine(line: SourceLine): line is DeliverySourceLine {
  return 'po_number' in line;
}

function getSource(line: SourceLine) {
  if (isDeliveryLine(line)) {
    return line.po_number;
  }

  return line.id;
}

function formatRoute(line: DeliverySourceLine) {
  if (!line.route_origin && !line.route_destination) {
    return '-';
  }

  return `${line.route_origin ?? '-'} -> ${line.route_destination ?? '-'}`;
}

function renderDeliveryLines(lines: DeliverySourceLine[]) {
  return (
    <Paper withBorder p={0}>
      <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={1040} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>DO / LOT</Table.Th>
              <Table.Th>Item</Table.Th>
              <Table.Th>Allocation</Table.Th>
              <Table.Th>Shipment</Table.Th>
              <Table.Th>Route / ETA</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '13rem' }}>
                  <Text size="sm" fw={700} lineClamp={1} title={line.do_number ?? line.po_number}>
                    {line.do_number ?? '-'}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {line.lot_number ?? '-'}
                  </Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '20rem' }}>
                  <Text size="sm" fw={700} lineClamp={1} title={line.item_code}>
                    {line.item_code}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1} title={line.item_name}>
                    {line.item_name}
                  </Text>
                  {line.hs_code ? (
                    <Text size="xs" c="dimmed" mt={2}>
                      HS {line.hs_code}
                    </Text>
                  ) : null}
                </Table.Td>
                <Table.Td>
                  <Stack gap={3}>
                    <Text size="sm" fw={600}>
                      <NumberFormatter value={line.quantity} thousandSeparator /> {line.unit}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Ordered{' '}
                      {line.ordered_quantity ? (
                        <>
                          <NumberFormatter value={line.ordered_quantity} thousandSeparator /> {line.unit}
                        </>
                      ) : (
                        '-'
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Weight{' '}
                      {line.weight_kg ? (
                        <>
                          <NumberFormatter value={line.weight_kg} thousandSeparator /> kg
                        </>
                      ) : (
                        '-'
                      )}
                    </Text>
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="wrap">
                    {line.shipment_number ? (
                      <Badge size="xs" color="blue" variant="light">
                        {line.shipment_number}
                      </Badge>
                    ) : (
                      <Badge size="xs" color="gray" variant="light">
                        -
                      </Badge>
                    )}
                    {line.container_no ? (
                      <Badge size="xs" color="gray" variant="light">
                        {line.container_no}
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {line.container_count ?? 0} Conts
                  </Text>
                </Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                  <Text size="sm" lineClamp={1} title={formatRoute(line)}>
                    {formatRoute(line)}
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    ETD {line.etd ?? '-'} / ETA {line.eta ?? '-'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}

export function SourceLineTable({ lines }: { lines: SourceLine[] }) {
  const { t } = useI18n();

  if (lines.length === 0) {
    return (
      <Paper withBorder p="md">
        <Text size="sm" c="dimmed">
          -
        </Text>
      </Paper>
    );
  }

  if (lines.every(isDeliveryLine)) {
    return renderDeliveryLines(lines);
  }

  return (
    <Paper withBorder p={0}>
      <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={1160} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('common.source')}</Table.Th>
              <Table.Th>{t('forms.itemCode')}</Table.Th>
              <Table.Th>{t('forms.itemName')}</Table.Th>
              <Table.Th>HS</Table.Th>
              <Table.Th>{t('common.dutyVatHeader')}</Table.Th>
              <Table.Th>{t('common.tariffHeader')}</Table.Th>
              <Table.Th>{t('forms.quantity')}</Table.Th>
              <Table.Th>{t('forms.warehouse')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '16rem' }}>
                  <Text size="sm" lineClamp={1} title={getSource(line)}>
                    {getSource(line)}
                  </Text>
                </Table.Td>
                <Table.Td>{line.item_code}</Table.Td>
                <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                  <Text size="sm" lineClamp={1} title={line.item_name}>
                    {line.item_name}
                  </Text>
                </Table.Td>
                <Table.Td>{'hs_code' in line ? line.hs_code || '-' : '-'}</Table.Td>
                <Table.Td>
                  {'duty_rate' in line && line.duty_rate !== undefined ? `${line.duty_rate}%` : '-'} /
                  {'vat_rate' in line && line.vat_rate !== undefined ? ` ${line.vat_rate}%` : ' -'}
                </Table.Td>
                <Table.Td>{'tariff_code' in line ? line.tariff_code || '-' : '-'}</Table.Td>
                <Table.Td>
                  <NumberFormatter value={line.quantity} thousandSeparator /> {line.unit}
                </Table.Td>
                <Table.Td>{'warehouse_code' in line ? line.warehouse_code : '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
