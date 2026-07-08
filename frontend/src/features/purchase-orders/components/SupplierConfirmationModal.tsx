import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberFormatter,
  NumberInput,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import {
  confirmPurchaseOrder,
  type ConfirmPurchaseOrderPayload,
  type PurchaseOrderV1,
} from '@shared/api/purchaseOrders';
import { DateTimeField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { dateOnly, nullIfEmpty, toNumber } from '../model/purchaseOrderModel';

export function SupplierConfirmationModal({
  onClose,
  onConfirmed,
  opened,
  order,
}: {
  onClose: () => void;
  onConfirmed: () => void;
  opened: boolean;
  order: PurchaseOrderV1;
}) {
  const { t } = useI18n();
  const [confirmedBy, setConfirmedBy] = useState('');
  const [supplierRefNo, setSupplierRefNo] = useState('');
  const [isFullShipment, setIsFullShipment] = useState(true);
  const [allowPartialShipment, setAllowPartialShipment] = useState(false);
  const [note, setNote] = useState('');
  const [lineDrafts, setLineDrafts] = useState<Record<string, { confirmed_qty: number; cargo_ready_date: string; can_fulfill: boolean }>>({});

  useEffect(() => {
    setLineDrafts(
      Object.fromEntries(
        (order.lines ?? []).map((line) => [
          line.id,
          {
            confirmed_qty: toNumber(line.qty_ordered),
            cargo_ready_date: dateOnly(line.expected_eta_line ?? order.expected_eta),
            can_fulfill: true,
          },
        ]),
      ),
    );
  }, [order]);

  const mutation = useMutation({
    mutationFn: (payload: ConfirmPurchaseOrderPayload) => confirmPurchaseOrder(order.id, payload),
    onSuccess: onConfirmed,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const lines = Object.entries(lineDrafts)
      .filter(([, line]) => Number(line.confirmed_qty) > 0)
      .map(([purchaseOrderLineId, line]) => ({
        purchase_order_line_id: purchaseOrderLineId,
        confirmed_qty: Number(line.confirmed_qty),
        cargo_ready_date: nullIfEmpty(line.cargo_ready_date),
        can_fulfill: line.can_fulfill,
        allow_partial_shipment: allowPartialShipment,
      }));

    if (!lines.length) return;
    mutation.mutate({
      confirmed_by: nullIfEmpty(confirmedBy),
      supplier_ref_no: nullIfEmpty(supplierRefNo),
      is_full_shipment: isFullShipment,
      allow_partial_shipment: allowPartialShipment,
      note: nullIfEmpty(note),
      lines,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <ModalTitle
          feature="purchase-orders"
          icon={<IconCircleCheck size={18} stroke={1.8} />}
          title={t('purchaseOrders.supplierConfirmationTitle')}
          subtitle={order.po_no}
        />
      }
      size="xl"
    >
      <Stack component="form" gap="md" onSubmit={handleSubmit} className="purchase-order-confirmation-form">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, md: 2 }} className="purchase-order-modal-grid">
          <TextInput label={t('purchaseOrders.confirmedBy')} value={confirmedBy} onChange={(event) => setConfirmedBy(event.currentTarget.value)} />
          <TextInput label={t('purchaseOrders.supplierRefNo')} value={supplierRefNo} onChange={(event) => setSupplierRefNo(event.currentTarget.value)} />
          <Switch label={t('purchaseOrders.fullShipment')} checked={isFullShipment} onChange={(event) => setIsFullShipment(event.currentTarget.checked)} />
          <Switch
            label={t('purchaseOrders.allowPartialShipment')}
            checked={allowPartialShipment}
            onChange={(event) => setAllowPartialShipment(event.currentTarget.checked)}
          />
        </SimpleGrid>
        <Textarea label={t('purchaseOrders.poLinesMetaNote')} value={note} onChange={(event) => setNote(event.currentTarget.value)} autosize minRows={2} />
        <ScrollArea className="purchase-order-confirmation-scroll" type="always" offsetScrollbars scrollbarSize={8}>
          <Table className="purchase-order-confirmation-table" miw={920} verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('purchaseOrders.headerLine')}</Table.Th>
                <Table.Th>{t('purchaseOrders.poLinesHeaderItem')}</Table.Th>
                <Table.Th style={{ width: 150 }}>{t('purchaseOrders.poLinesHeaderOrdered')}</Table.Th>
                <Table.Th style={{ width: 160 }}>{t('purchaseOrders.confirmedQty')}</Table.Th>
                <Table.Th style={{ width: 160 }}>
                  <HeaderLabel label={t('purchaseOrders.cargoReady')} hint={t('glossary.cargoReady')} />
                </Table.Th>
                <Table.Th style={{ width: 90 }}>{t('purchaseOrders.canFulfill')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(order.lines ?? []).map((line) => {
                const lineDraft = lineDrafts[line.id];
                return (
                  <Table.Tr key={line.id}>
                    <Table.Td className="purchase-order-line-index">#{line.line_no}</Table.Td>
                    <Table.Td className="table-cell-truncate" style={{ maxWidth: '18rem' }}>
                      <Text size="sm" fw={700} lineClamp={1} title={line.item?.item_code ?? line.item_id}>
                        {line.item?.item_code ?? line.item_id}
                      </Text>
                      <Text size="xs" c="dimmed" lineClamp={1} title={line.item?.item_name ?? line.item_description ?? '-'}>
                        {line.item?.item_name ?? line.item_description ?? '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td className="purchase-order-quantity-cell">
                      <NumberFormatter value={line.qty_ordered} thousandSeparator /> {line.unit ?? ''}
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        max={toNumber(line.qty_ordered)}
                        value={lineDraft?.confirmed_qty ?? 0}
                        thousandSeparator=","
                        decimalScale={4}
                        onChange={(value) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], confirmed_qty: toNumber(value) },
                          }))
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <DateTimeField
                        value={lineDraft?.cargo_ready_date ?? ''}
                        onChange={(value) => {
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], cargo_ready_date: value ?? '' },
                          }));
                        }}
                      />
                    </Table.Td>
                    <Table.Td className="purchase-order-confirmation-check-cell">
                      <Checkbox
                        checked={lineDraft?.can_fulfill ?? true}
                        onChange={(event) => {
                          const { checked } = event.currentTarget;
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: { ...current[line.id], can_fulfill: checked },
                          }));
                        }}
                      />
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Group justify="flex-end" wrap="nowrap" className="purchase-order-modal-footer">
          <Button className="purchase-order-action-button" variant="subtle" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button className="purchase-order-action-button" type="submit" loading={mutation.isPending} leftSection={<IconCircleCheck size={16} />}>
            {t('purchaseOrders.confirmPo')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
