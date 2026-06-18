import { Badge, Group, Paper, ScrollArea, Stack, Table, Text } from '@mantine/core';

import type { ShipmentRecord } from '@shared/api/logistics';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

export function ShipmentCostsPanel({ shippingMode }: { shippingMode: ShipmentRecord['shipping_mode'] }) {
  const { t } = useI18n();
  const freight = shippingMode === 'SEA' ? 4200 : 8800;
  const costs = [
    { code: 'FREIGHT', label: 'Freight', amount: freight, currency: 'USD', hint: t('glossary.freight') },
    { code: 'INSURANCE', label: 'Insurance', amount: 360, currency: 'USD', hint: t('glossary.insurance') },
    { code: 'CUSTOMS', label: 'Customs clearance', amount: 220, currency: 'USD', hint: t('glossary.customsClearance') },
    { code: 'LOCAL', label: 'Local charges', amount: 680, currency: 'USD', hint: t('glossary.localCharges') },
    { code: 'DUTY', label: 'Import duty estimate', amount: 950, currency: 'USD', hint: t('glossary.importDuty') },
  ];
  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="sm">
            <HeaderLabel label="Landed Cost" hint={t('glossary.landedCost')} />
          </Text>
          <Badge size="lg" color="teal">
            {total.toLocaleString()} USD
          </Badge>
        </Group>
        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={680} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Charge</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {costs.map((cost) => (
                <Table.Tr key={cost.code}>
                  <Table.Td>{cost.code}</Table.Td>
                  <Table.Td>
                    <HeaderLabel label={cost.label} hint={cost.hint} />
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {cost.amount.toLocaleString()} {cost.currency}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
