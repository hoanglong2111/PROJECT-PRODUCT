import { ActionIcon, Badge, Checkbox, Group, NumberFormatter, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconGitBranch, IconGripVertical, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState, type DragEvent } from 'react';

import type { PoLot, PoLotLine } from '@shared/api/purchaseOrders';

import { dateOnly, formatWeightKg, lockedLotStatuses, toNumber } from '../model/purchaseOrderModel';

export function LotCard({
  canManage,
  hasMoveTargets,
  isSelectable,
  isSelected,
  lot,
  onDelete,
  onDrop,
  onDropLine,
  onEdit,
  onSelect,
  onSplitLine,
}: {
  canManage: boolean;
  hasMoveTargets: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  lot: PoLot;
  onDelete: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDropLine: (event: DragEvent<HTMLDivElement>, line: PoLotLine) => void;
  onEdit: () => void;
  onSelect: (checked: boolean) => void;
  onSplitLine: (line: PoLotLine) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const lines = lot.items ?? [];
  const isLocked = lockedLotStatuses.has(lot.status);
  const canDelete = canManage && !isLocked && lines.length === 0;
  const totalQty = lines.reduce((total, line) => total + toNumber(line.qty_lotted), 0);
  const units = Array.from(new Set(lines.map((line) => line.unit).filter(Boolean)));
  const totalQtyLabel = lines.length ? `${totalQty.toLocaleString()} ${units.length === 1 ? units[0] : 'units'}` : '-';

  return (
    <Paper
      withBorder
      p={0}
      className="lot-list-item"
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      draggable={canManage && !isLocked}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData('dragType', 'lot');
        event.dataTransfer.setData('lotId', lot.id);
      }}
      style={{ cursor: canManage && !isLocked ? 'grab' : 'default' }}
    >
      <Stack gap={0}>
        <div className="lot-list-header">
          <Group gap="sm" wrap="nowrap" className="lot-list-title">
            <Checkbox
              aria-label={`Select ${lot.lot_no} for Internal DO`}
              checked={isSelected}
              disabled={!canManage || !isSelectable}
              onChange={(event) => onSelect(event.currentTarget.checked)}
              onClick={(event) => event.stopPropagation()}
            />
            <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
            <div className="lot-list-title-text">
              <Group gap="xs" wrap="nowrap">
                <Text fw={800} size="sm" truncate>
                  {lot.lot_no}
                </Text>
                <Badge size="xs" color={lot.status === 'READY' ? 'teal' : undefined} variant="light">
                  {lot.status}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {lot.lot_name || 'Empty LOT'}
              </Text>
            </div>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" className="lot-list-meta">
            <LotMeta label="CRD" value={dateOnly(lot.planned_cargo_ready_date) || '-'} />
            <LotMeta label="ETD" value={dateOnly(lot.planned_etd) || '-'} />
            <LotMeta label="ETA" value={dateOnly(lot.planned_eta) || '-'} />
            <LotMeta label="Lines / Qty" value={`${lines.length} / ${totalQtyLabel}`} />
          </SimpleGrid>

          <Group gap={4} wrap="nowrap" className="lot-list-actions">
            <Badge size="xs" color={lot.status === 'READY' ? 'teal' : undefined} variant="light">
              {isLocked ? 'Locked' : 'Open'}
            </Badge>
            <ActionIcon variant="subtle" size="sm" aria-label="Edit LOT" disabled={!canManage} onClick={onEdit}>
              <IconPencil size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label="Delete empty LOT"
              disabled={!canDelete}
              onClick={onDelete}
            >
              <IconTrash size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              className={isExpanded ? 'lot-toggle-button is-open' : 'lot-toggle-button'}
              aria-label={isExpanded ? 'Collapse LOT items' : 'Expand LOT items'}
              aria-expanded={isExpanded}
              onClick={(event) => {
                event.stopPropagation();
                setIsExpanded((current) => !current);
              }}
            >
              <IconChevronDown size={16} />
            </ActionIcon>
          </Group>
        </div>

        {isExpanded ? (
          <Stack gap={0} className="lot-line-list">
            {lines.length > 0 ? (
              <>
                {lines.map((line) => {
                  const itemCode =
                    line.item_code ?? line.item?.item_code ?? line.purchase_order_line?.item?.item_code ?? line.item_id;
                  const itemName = line.item_name ?? line.item?.item_name ?? line.purchase_order_line?.item?.item_name ?? '-';
                  const hsCode =
                    line.hs_code ?? line.item_customs_profile?.hs_code ?? line.purchase_order_line?.item_customs_profile?.hs_code;
                  const grossWeightKg = toNumber(line.gross_weight_kg ?? line.purchase_order_line?.gross_weight_kg);
                  const orderedQty = line.qty_ordered ?? line.purchase_order_line?.qty_ordered;
                  const unit = line.unit ?? '';

                  return (
                    <div
                      key={line.id}
                      className="lot-line-row"
                      draggable={canManage && !isLocked}
                      onDragStart={(event: DragEvent<HTMLDivElement>) => {
                        event.stopPropagation();
                        event.dataTransfer.setData('dragType', 'lotLine');
                        event.dataTransfer.setData('lotLineId', line.id);
                        event.dataTransfer.setData('sourceLotId', lot.id);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => onDropLine(event, line)}
                      style={{ cursor: canManage && !isLocked ? 'grab' : 'default' }}
                    >
                      <Group gap="sm" wrap="nowrap" className="lot-line-main">
                        <IconGripVertical size={14} color="var(--mantine-color-gray-4)" />
                        <div className="lot-line-item-text">
                          <Text size="sm" truncate title={`${itemCode} - ${itemName}`}>
                            <Text span fw={800} c="var(--mantine-color-gray-9)">
                              {itemCode}
                            </Text>{' '}
                            <Text span fw={400} size="sm" c="dimmed">
                              {itemName}
                            </Text>
                          </Text>
                          <Text size="xs" c="dimmed" mt={4} className="lot-line-static-meta" truncate>
                            HSCODE: {hsCode || '-'} <span aria-hidden="true">|</span> Weight:{' '}
                            {formatWeightKg(grossWeightKg) || '-'}
                          </Text>
                        </div>
                      </Group>

                      <Group gap={6} wrap="nowrap" className="lot-line-right">
                        <Badge size="sm" variant="light" color="orange" radius="sm" className="lot-line-quantity-badge">
                          Ordered:{' '}
                          {orderedQty == null ? (
                            '-'
                          ) : (
                            <>
                              <NumberFormatter value={orderedQty} thousandSeparator /> {unit}
                            </>
                          )}
                        </Badge>
                        <Badge size="sm" variant="light" color="teal" radius="sm" className="lot-line-quantity-badge">
                          Lotted: <NumberFormatter value={line.qty_lotted} thousandSeparator /> {unit}
                        </Badge>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          aria-label="Split this item line"
                          disabled={!canManage || isLocked || !hasMoveTargets || toNumber(line.qty_lotted) <= 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSplitLine(line);
                          }}
                        >
                          <IconGitBranch size={14} />
                        </ActionIcon>
                      </Group>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="lot-line-empty">
                <Text size="xs" c="dimmed" fs="italic">
                  No item lines
                </Text>
              </div>
            )}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function LotMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="lot-meta-item">
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text size="xs" fw={700} className="tabular-nums" truncate title={value}>
        {value}
      </Text>
    </div>
  );
}
