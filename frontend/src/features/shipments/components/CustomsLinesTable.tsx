import { ActionIcon, Button, Group, Loader, Paper, ScrollArea, Select, SimpleGrid, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { CustomsDeclarationLineV1 } from '@shared/api/customsDeclarations';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

export function CustomsLinesTable({
  createLinePending,
  deleteLinePending,
  editingLineId,
  isFetchingLines,
  isLocked,
  lineCustomsValue,
  lineDutyRate,
  lineNote,
  lineQuantity,
  lineVatRate,
  lines,
  newLineCustomsValue,
  newLineNo,
  newLineNote,
  newLineQuantity,
  newShipmentLineId,
  onCreateLine,
  onDeleteLine,
  onStartEditingLine,
  onUpdateLine,
  setEditingLineId,
  setLineCustomsValue,
  setLineDutyRate,
  setLineNote,
  setLineQuantity,
  setLineVatRate,
  setNewLineCustomsValue,
  setNewLineNo,
  setNewLineNote,
  setNewLineQuantity,
  setNewShipmentLineId,
  shipmentLineOptions,
  shipmentLinesLoading,
  updateLinePending,
}: {
  createLinePending: boolean;
  deleteLinePending: boolean;
  editingLineId: string | null;
  isFetchingLines: boolean;
  isLocked: boolean;
  lineCustomsValue: string;
  lineDutyRate: string;
  lineNote: string;
  lineQuantity: string;
  lineVatRate: string;
  lines: CustomsDeclarationLineV1[];
  newLineCustomsValue: string;
  newLineNo: string;
  newLineNote: string;
  newLineQuantity: string;
  newShipmentLineId: string | null;
  onCreateLine: () => void;
  onDeleteLine: (lineId: string) => void;
  onStartEditingLine: (line: CustomsDeclarationLineV1) => void;
  onUpdateLine: () => void;
  setEditingLineId: (value: string | null) => void;
  setLineCustomsValue: (value: string) => void;
  setLineDutyRate: (value: string) => void;
  setLineNote: (value: string) => void;
  setLineQuantity: (value: string) => void;
  setLineVatRate: (value: string) => void;
  setNewLineCustomsValue: (value: string) => void;
  setNewLineNo: (value: string) => void;
  setNewLineNote: (value: string) => void;
  setNewLineQuantity: (value: string) => void;
  setNewShipmentLineId: (value: string | null) => void;
  shipmentLineOptions: Array<{ label: string; value: string }>;
  shipmentLinesLoading: boolean;
  updateLinePending: boolean;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={700}>Declaration lines</Text>
            <Text size="sm" c="dimmed">
              Lines are copied from shipment lines when a declaration is created.
            </Text>
          </div>
          {isFetchingLines ? <Loader size="sm" /> : null}
        </Group>

        {!isLocked ? (
          <SimpleGrid cols={{ base: 1, md: 5 }} spacing="sm">
            <Select
              label={<HeaderLabel label="Shipment line" hint={t('glossary.shipment')} />}
              searchable
              clearable
              data={shipmentLineOptions}
              value={newShipmentLineId}
              onChange={setNewShipmentLineId}
              nothingFoundMessage={shipmentLinesLoading ? 'Loading shipment lines...' : 'No shipment line'}
            />
            <TextInput
              label="Line no."
              type="number"
              value={newLineNo}
              onChange={(event) => setNewLineNo(event.currentTarget.value)}
            />
            <TextInput
              label="Quantity"
              type="number"
              value={newLineQuantity}
              onChange={(event) => setNewLineQuantity(event.currentTarget.value)}
            />
            <TextInput
              label={<HeaderLabel label="Customs value" hint={t('glossary.customsValue')} />}
              type="number"
              value={newLineCustomsValue}
              onChange={(event) => setNewLineCustomsValue(event.currentTarget.value)}
            />
            <TextInput
              label="Line note"
              value={newLineNote}
              onChange={(event) => setNewLineNote(event.currentTarget.value)}
            />
            <Group align="flex-end">
              <Button
                size="sm"
                leftSection={<IconPlus size={16} />}
                disabled={!newLineNo}
                loading={createLinePending}
                onClick={onCreateLine}
              >
                Add line
              </Button>
            </Group>
          </SimpleGrid>
        ) : null}

        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={980} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>No.</Table.Th>
                <Table.Th>Item</Table.Th>
                <Table.Th>
                  <HeaderLabel label="HS" hint={t('glossary.hsCode')} />
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Qty</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <HeaderLabel label="Value" hint={t('glossary.customsValue')} />
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <HeaderLabel label="Duty %" hint={t('glossary.dutyRate')} />
                </Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>
                  <HeaderLabel label="VAT %" hint={t('glossary.vatRate')} />
                </Table.Th>
                <Table.Th>Note</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lines.map((line) => {
                const isEditing = editingLineId === line.id;
                return (
                  <Table.Tr key={line.id}>
                    <Table.Td>{line.line_no}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{line.item_description ?? line.item_id ?? '-'}</Text>
                      <Text size="xs" c="dimmed">{line.unit ?? '-'}</Text>
                    </Table.Td>
                    <Table.Td>{line.hs_code ?? '-'}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <TextInput
                          type="number"
                          size="xs"
                          value={lineQuantity}
                          onChange={(event) => setLineQuantity(event.currentTarget.value)}
                        />
                      ) : (
                        Number(line.quantity).toLocaleString()
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <TextInput
                          type="number"
                          size="xs"
                          value={lineCustomsValue}
                          onChange={(event) => setLineCustomsValue(event.currentTarget.value)}
                        />
                      ) : (
                        line.customs_value ? Number(line.customs_value).toLocaleString() : '-'
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <TextInput
                          type="number"
                          size="xs"
                          value={lineDutyRate}
                          onChange={(event) => setLineDutyRate(event.currentTarget.value)}
                        />
                      ) : (
                        line.import_duty_rate ?? '-'
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <TextInput
                          type="number"
                          size="xs"
                          value={lineVatRate}
                          onChange={(event) => setLineVatRate(event.currentTarget.value)}
                        />
                      ) : (
                        line.vat_rate ?? '-'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {isEditing ? (
                        <TextInput
                          size="xs"
                          value={lineNote}
                          onChange={(event) => setLineNote(event.currentTarget.value)}
                        />
                      ) : (
                        line.note ?? '-'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs" wrap="nowrap">
                        {isEditing ? (
                          <>
                            <Button size="xs" variant="subtle" onClick={() => setEditingLineId(null)}>
                              Cancel
                            </Button>
                            <Button size="xs" loading={updateLinePending} onClick={onUpdateLine}>
                              Save
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="xs" variant="light" disabled={isLocked} onClick={() => onStartEditingLine(line)}>
                              Edit
                            </Button>
                            <Tooltip label="Delete line">
                              <ActionIcon
                                aria-label="Delete line"
                                color="red"
                                variant="subtle"
                                disabled={isLocked}
                                loading={deleteLinePending}
                                onClick={() => onDeleteLine(line.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {lines.length === 0 ? (
          <EmptyState title="No customs lines" description="Create a declaration from shipment lines or add a line manually." />
        ) : null}
      </Stack>
    </Paper>
  );
}
