import { ActionIcon, Button, Group, Loader, Paper, ScrollArea, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { deleteCustomsDeclarationLine, type CustomsDeclarationLineV1 } from '@shared/api/customsDeclarations';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

import { customsLineTax, summarizeCustomsLines } from '../model/shipmentModel';
import { CustomsLineDrawer } from './CustomsLineDrawer';

const R = { textAlign: 'right' as const };

// Percentage widths that sum to 100 so table-layout:fixed has no slack to
// redistribute (which is what was inflating the no/item columns). The table
// fills its column and scrolls below miw, so these stay proportional everywhere.
const COL = {
  no: { width: '8%' },
  item: { width: '32%' },
  hs: { width: '11%' },
  qty: { width: '11%', ...R },
  value: { width: '15%', ...R },
  tax: { width: '15%', ...R },
  actions: { width: '8%', ...R },
} as const;

export function CustomsLinesTable({
  declarationId,
  shipmentId,
  isLocked,
  lines,
  isFetchingLines,
  onChanged,
}: {
  declarationId: string | null;
  shipmentId: string;
  isLocked: boolean;
  lines: CustomsDeclarationLineV1[];
  isFetchingLines: boolean;
  onChanged: () => void;
}) {
  const { t, formatNumber } = useI18n();

  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingLine, setEditingLine] = useState<CustomsDeclarationLineV1 | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => deleteCustomsDeclarationLine(lineId),
    onSuccess: () => onChanged(),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditingLine(null);
    setDrawerOpen(true);
  };

  const openEdit = (line: CustomsDeclarationLineV1) => {
    setDrawerMode('edit');
    setEditingLine(line);
    setDrawerOpen(true);
  };

  const nextLineNo = lines.reduce((max, line) => Math.max(max, Number(line.line_no) || 0), 0) + 1;
  const summary = summarizeCustomsLines(lines);
  const fmt = (v: number) => formatNumber(Math.round(v));

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={700}>{t('shipments.declarationLines')}</Text>
            <Text size="sm" c="dimmed">{t('shipments.declarationLinesHint')}</Text>
          </div>
          <Group gap="xs">
            {isFetchingLines ? <Loader size="sm" /> : null}
            {!isLocked ? (
              <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
                {t('shipments.addLine')}
              </Button>
            ) : null}
          </Group>
        </Group>

        {lines.length === 0 ? (
          <EmptyState
            title={t('shipments.noCustomsLinesTitle')}
            description={t('shipments.noCustomsLinesDescription')}
          />
        ) : (
          <ScrollArea type="auto" offsetScrollbars scrollbarSize={8}>
            <Table miw={820} verticalSpacing="sm" highlightOnHover style={{ tableLayout: 'fixed' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ ...COL.no, whiteSpace: 'nowrap' }}>{t('shipments.lineNo')}</Table.Th>
                  <Table.Th style={COL.item}>{t('common.item')}</Table.Th>
                  <Table.Th style={COL.hs}><HeaderLabel label="HS" hint={t('glossary.hsCode')} /></Table.Th>
                  <Table.Th style={COL.qty}>{t('shipments.quantity')}</Table.Th>
                  <Table.Th style={COL.value}><HeaderLabel label={t('shipments.value')} hint={t('glossary.customsValue')} justify="flex-end" /></Table.Th>
                  <Table.Th style={COL.tax}><HeaderLabel label={t('shipments.estimatedTax')} hint={t('glossary.dutyRate')} justify="flex-end" /></Table.Th>
                  <Table.Th style={COL.actions} />
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {lines.map((line, index) => {
                  const tax = customsLineTax(line);
                  const hasRates = line.import_duty_rate != null || line.vat_rate != null;
                  return (
                    <Table.Tr key={line.id}>
                      <Table.Td c="dimmed">{line.line_no ?? index + 1}</Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600} truncate>{line.item_description ?? line.item_id ?? '-'}</Text>
                        {line.unit ? <Text size="xs" c="dimmed" truncate>{line.unit}</Text> : null}
                      </Table.Td>
                      <Table.Td>{line.hs_code ?? '-'}</Table.Td>
                      <Table.Td style={R}>{formatNumber(Number(line.quantity))}</Table.Td>
                      <Table.Td style={R}>{line.customs_value != null ? fmt(Number(line.customs_value)) : '-'}</Table.Td>
                      <Table.Td style={R}>
                        {hasRates ? (
                          <>
                            <Text size="sm">{fmt(tax.taxTotal)}</Text>
                            <Text size="xs" c="dimmed">
                              {line.import_duty_rate != null ? `${line.import_duty_rate}%` : '0%'}
                              {' + '}
                              {line.vat_rate != null ? `${line.vat_rate}%` : '0%'}
                            </Text>
                          </>
                        ) : (
                          '-'
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group justify="flex-end" gap={4} wrap="nowrap">
                          <Tooltip label={t('shipments.editLine')}>
                            <ActionIcon
                              aria-label={t('shipments.editLine')}
                              variant="subtle"
                              color="gray"
                              disabled={isLocked}
                              onClick={() => openEdit(line)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label={t('shipments.deleteLine')}>
                            <ActionIcon
                              aria-label={t('shipments.deleteLine')}
                              variant="subtle"
                              color="red"
                              disabled={isLocked}
                              loading={deleteLineMutation.isPending && deleteLineMutation.variables === line.id}
                              onClick={() => deleteLineMutation.mutate(line.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>

              <Table.Tfoot>
                <Table.Tr style={{ fontWeight: 700, borderTop: '2px solid var(--kbfe-border-primary)' }}>
                  <Table.Td colSpan={4} style={R}>{t('shipments.totalCustomsValue')}</Table.Td>
                  <Table.Td style={R}>{fmt(summary.totalValue)}</Table.Td>
                  <Table.Td style={R}>
                    <Text size="xs" c="dimmed">{t('shipments.estimatedTaxTotal')}</Text>
                    <Text fw={700}>{fmt(summary.taxTotal)}</Text>
                  </Table.Td>
                  <Table.Td />
                </Table.Tr>
              </Table.Tfoot>
            </Table>
          </ScrollArea>
        )}
      </Stack>

      <CustomsLineDrawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        declarationId={declarationId}
        shipmentId={shipmentId}
        line={editingLine}
        nextLineNo={nextLineNo}
        onSaved={onChanged}
      />
    </Paper>
  );
}
