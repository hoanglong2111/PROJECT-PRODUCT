import { ActionIcon, Badge, Checkbox, Group, NumberFormatter, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconGitBranch, IconGripVertical, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState, type DragEvent } from 'react';

import type { PoLot, PoLotLine } from '@shared/api/purchaseOrders';
import { useI18n } from '@shared/i18n';
import { formatNumber } from '@shared/utils/number';

import { dateOnly, formatWeightKg, lockedLotStatuses, toNumber } from '../model/purchaseOrderModel';

export function LotCard({
  canManage,
  hasMoveTargets,
  isSelectable,
  isSelected,
  lot,
  onDelete,
  onDragActiveChange,
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
  onDragActiveChange: (type: 'lot' | 'lotLine' | null) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDropLine: (event: DragEvent<HTMLDivElement>, line: PoLotLine) => void;
  onEdit: () => void;
  onSelect: (checked: boolean) => void;
  onSplitLine: (line: PoLotLine) => void;
}) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(true);
  // Drag-and-drop visual state (HTML5 native DnD gives no built-in feedback).
  const [isDragging, setIsDragging] = useState(false); // this LOT card is being dragged
  const [isDropTarget, setIsDropTarget] = useState(false); // something is hovering over this card
  const [draggingLineId, setDraggingLineId] = useState<string | null>(null); // a line from this card is in hand
  const [dropTargetLineId, setDropTargetLineId] = useState<string | null>(null); // hovered line (insertion point)
  const lines = lot.items ?? [];
  const isLocked = lockedLotStatuses.has(lot.status);
  const canDelete = canManage && !isLocked && lines.length === 0;
  const totalQty = lines.reduce((total, line) => total + toNumber(line.qty_lotted), 0);
  const units = Array.from(new Set(lines.map((line) => line.unit).filter(Boolean)));
  const totalQtyLabel = lines.length ? `${formatNumber(totalQty)} ${units.length === 1 ? units[0] : t('purchaseOrders.unitsFallback')}` : '-';

  return (
    <Paper
      withBorder
      p={0}
      className={[
        'lot-list-item',
        isDragging ? 'is-dragging' : '',
        isDropTarget ? 'is-drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDrop={(event) => {
        setIsDropTarget(false);
        setDropTargetLineId(null);
        onDrop(event);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDropTarget(true);
      }}
      onDragLeave={(event) => {
        // Ignore leaves into a child element; only clear when the cursor truly exits the card.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDropTarget(false);
        }
      }}
      draggable={canManage && !isLocked}
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData('dragType', 'lot');
        event.dataTransfer.setData('lotId', lot.id);
        event.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
        onDragActiveChange('lot');
      }}
      onDragEnd={() => {
        setIsDragging(false);
        setIsDropTarget(false);
        setDropTargetLineId(null);
        onDragActiveChange(null);
      }}
      style={{ cursor: canManage && !isLocked ? 'grab' : 'default' }}
    >
      <Stack gap={0}>
        <div className="lot-list-header">
          <Group gap="sm" wrap="nowrap" className="lot-list-title">
            <Checkbox
              aria-label={t('purchaseOrders.selectLotForDo', { lotNo: lot.lot_no })}
              checked={isSelected}
              disabled={!canManage || !isSelectable}
              onChange={(event) => onSelect(event.currentTarget.checked)}
              onClick={(event) => event.stopPropagation()}
            />
            <IconGripVertical size={16} color="var(--kbfe-text-secondary)" />
            <div className="lot-list-title-text">
              <Group gap="xs" wrap="nowrap" className="lot-list-title-row">
                <Text fw={800} size="sm" truncate title={lot.lot_no}>
                  {lot.lot_no}
                </Text>
                <Badge size="xs" color={lot.status === 'READY' ? 'teal' : undefined} variant="light" className="purchase-order-nowrap-badge">
                  {lot.status}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" truncate title={lot.lot_name || t('purchaseOrders.emptyLot')}>
                {lot.lot_name || t('purchaseOrders.emptyLot')}
              </Text>
            </div>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="xs" className="lot-list-meta">
            <LotMeta label="CRD" value={dateOnly(lot.planned_cargo_ready_date) || '-'} />
            <LotMeta label="ETD" value={dateOnly(lot.planned_etd) || '-'} />
            <LotMeta label="ETA" value={dateOnly(lot.planned_eta) || '-'} />
            <LotMeta label="POL" value={lot.origin_port || '-'} />
            <LotMeta label="POD" value={lot.destination_port || '-'} />
            <LotMeta label={t('purchaseOrders.lotLinesQty')} value={`${lines.length} / ${totalQtyLabel}`} />
          </SimpleGrid>

          <Group gap={4} wrap="nowrap" className="lot-list-actions">
            <Badge size="xs" color={lot.status === 'READY' ? 'teal' : undefined} variant="light" className="purchase-order-nowrap-badge">
              {isLocked ? t('purchaseOrders.lotLocked') : t('purchaseOrders.lotOpen')}
            </Badge>
            <ActionIcon variant="subtle" size="sm" aria-label={t('purchaseOrders.editLotTitle')} disabled={!canManage} onClick={onEdit}>
              <IconPencil size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              aria-label={t('purchaseOrders.deleteEmptyLot')}
              disabled={!canDelete}
              onClick={onDelete}
            >
              <IconTrash size={15} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              className={isExpanded ? 'lot-toggle-button is-open' : 'lot-toggle-button'}
              aria-label={isExpanded ? t('purchaseOrders.collapseLotItems') : t('purchaseOrders.expandLotItems')}
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
                      className={[
                        'lot-line-row',
                        draggingLineId === line.id ? 'is-dragging' : '',
                        dropTargetLineId === line.id && draggingLineId !== line.id ? 'is-drop-target' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      draggable={canManage && !isLocked}
                      onDragStart={(event: DragEvent<HTMLDivElement>) => {
                        event.stopPropagation();
                        event.dataTransfer.setData('dragType', 'lotLine');
                        event.dataTransfer.setData('lotLineId', line.id);
                        event.dataTransfer.setData('sourceLotId', lot.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggingLineId(line.id);
                        onDragActiveChange('lotLine');
                      }}
                      onDragEnd={() => {
                        setDraggingLineId(null);
                        setDropTargetLineId(null);
                        setIsDropTarget(false);
                        onDragActiveChange(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setDropTargetLineId(line.id);
                      }}
                      onDragLeave={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                          setDropTargetLineId((current) => (current === line.id ? null : current));
                        }
                      }}
                      onDrop={(event) => {
                        setDropTargetLineId(null);
                        setIsDropTarget(false);
                        onDropLine(event, line);
                      }}
                      style={{ cursor: canManage && !isLocked ? 'grab' : 'default' }}
                    >
                      <Group gap="sm" wrap="nowrap" className="lot-line-main">
                        <IconGripVertical size={14} color="var(--kbfe-text-secondary)" />
                        <div className="lot-line-item-text">
                          <Text size="sm" truncate title={`${itemCode} - ${itemName}`}>
                            <Text span fw={800} className="lot-line-item-code">
                              {itemCode}
                            </Text>{' '}
                            <Text span fw={500} size="sm" className="lot-line-item-name">
                              {itemName}
                            </Text>
                          </Text>
                          <Text size="xs" mt={4} className="lot-line-static-meta" truncate>
                            HSCODE: {hsCode || '-'} <span aria-hidden="true">|</span> {t('purchaseOrders.poLinesMetaWeight')}:{' '}
                            {formatWeightKg(grossWeightKg) || '-'}
                          </Text>
                        </div>
                      </Group>

                      <Group gap={6} wrap="nowrap" className="lot-line-right">
                        <Badge size="sm" variant="light" color="orange" radius="sm" className="lot-line-quantity-badge">
                          {t('purchaseOrders.poLinesHeaderOrdered')}:{' '}
                          {orderedQty == null ? (
                            '-'
                          ) : (
                            <>
                              <NumberFormatter value={orderedQty} thousandSeparator /> {unit}
                            </>
                          )}
                        </Badge>
                        <Badge size="sm" variant="light" color="teal" radius="sm" className="lot-line-quantity-badge">
                          {t('purchaseOrders.poLinesHeaderLotted')}: <NumberFormatter value={line.qty_lotted} thousandSeparator /> {unit}
                        </Badge>
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          aria-label={t('purchaseOrders.splitLotTitle')}
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
                  {t('purchaseOrders.noItemLines')}
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
