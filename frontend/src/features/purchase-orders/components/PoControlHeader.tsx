import { Badge, Button, Group, Menu, Text, Title } from '@mantine/core';
import { IconCircleCheck, IconDotsVertical, IconPencil, IconSend, IconTruckDelivery, IconX } from '@tabler/icons-react';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';
import { StatusBadge } from '@shared/components/StatusBadge';

// Two-tier PO control header: identity (top) + prioritised actions (below).
// Action hierarchy: primary is state-driven (Send PO for DRAFT, Confirm for
// SENT); Create DO is a workspace jump; Edit is secondary; Close lives in the
// More menu so the primary action reads clearly.
export function PoControlHeader({
  canConfirm,
  canEdit,
  canSend,
  onClose,
  onConfirm,
  onCreateDo,
  onEdit,
  onSend,
  order,
  sendPending,
}: {
  order: PurchaseOrderV1;
  canEdit: boolean;
  canSend: boolean;
  canConfirm: boolean;
  sendPending: boolean;
  onEdit: () => void;
  onSend: () => void;
  onConfirm: () => void;
  onClose: () => void;
  onCreateDo: () => void;
}) {
  return (
    <div className="purchase-order-control-header">
      <div className="purchase-order-control-identity">
        <Group gap="xs" wrap="wrap" className="purchase-order-control-title-row">
          <Title order={3}>{order.po_no}</Title>
          <StatusBadge status={order.status} />
          <Badge size="sm" variant="light" className="purchase-order-nowrap-badge">
            {order.po_type || 'STANDARD'}
          </Badge>
          {order.contract_no ? (
            <Badge size="sm" variant="light" color="blue" className="purchase-order-nowrap-badge">
              Contract {order.contract_no}
            </Badge>
          ) : null}
        </Group>
        <Text c="dimmed" size="sm" mt={4}>
          {order.supplier?.supplier_name ?? order.supplier_id}
        </Text>
      </div>

      <Group gap="xs" wrap="nowrap" className="purchase-order-control-actions">
        <Button variant="light" leftSection={<IconPencil size={16} />} disabled={!canEdit} onClick={onEdit}>
          Edit
        </Button>
        {canSend ? (
          <Button leftSection={<IconSend size={16} />} loading={sendPending} onClick={onSend}>
            Send PO
          </Button>
        ) : null}
        {canConfirm ? (
          <Button color="teal" leftSection={<IconCircleCheck size={16} />} onClick={onConfirm}>
            Confirm
          </Button>
        ) : null}
        <Button variant="light" color="teal" leftSection={<IconTruckDelivery size={16} />} onClick={onCreateDo}>
          Create DO
        </Button>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Button variant="subtle" px="sm" aria-label="More actions">
              <IconDotsVertical size={18} />
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconX size={16} />} onClick={onClose}>
              Close
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </div>
  );
}
