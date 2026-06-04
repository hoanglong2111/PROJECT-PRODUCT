import { NumberFormatter, Paper, ScrollArea, Table, Text } from '@mantine/core';

import type { DeliverySourceLine, PurchaseOrderLineItem, PurchaseRequestLineItem } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

type SourceLine = DeliverySourceLine | PurchaseOrderLineItem | PurchaseRequestLineItem;

function getSource(line: SourceLine) {
  if ('po_number' in line) {
    return `${line.request_code} / ${line.po_number}`;
  }

  if ('source_pr_code' in line) {
    return line.source_pr_code;
  }

  return line.id;
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

  return (
    <Paper withBorder p={0}>
      <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
        <Table miw={820} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('common.source')}</Table.Th>
              <Table.Th>{t('forms.itemCode')}</Table.Th>
              <Table.Th>{t('forms.itemName')}</Table.Th>
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
