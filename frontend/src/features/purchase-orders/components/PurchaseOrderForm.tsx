import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  NumberFormatter,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';

import {
  createPurchaseOrder,
  updatePurchaseOrder,
  type CreatePurchaseOrderV1Payload,
  type PurchaseOrderV1,
  type UpdatePurchaseOrderV1Payload,
} from '@shared/api/purchaseOrders';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { usePoMasterData } from '../hooks/usePoMasterData';
import {
  buildCustomsOptions,
  buildPoPatchPayload,
  buildPoPayload,
  createInitialPoDraft,
  newLineDraft,
  poTypeOptions,
  toNumber,
  totalPoAmount,
  type PoLineDraft,
} from '../model/purchaseOrderModel';

export function PurchaseOrderForm({
  mode,
  onCancel,
  onSaved,
  order,
}: {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSaved: (order: PurchaseOrderV1) => void;
  order?: PurchaseOrderV1;
}) {
  const [draft, setDraft] = useState(() => createInitialPoDraft(order));
  const invalidatePo = usePoInvalidation(order?.id);
  const masterData = usePoMasterData();

  useEffect(() => {
    setDraft(createInitialPoDraft(order));
  }, [order]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderV1Payload) => createPurchaseOrder(payload),
    onSuccess: (createdOrder) => {
      invalidatePo();
      onSaved(createdOrder);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePurchaseOrderV1Payload) => updatePurchaseOrder(order?.id ?? '', payload),
    onSuccess: (updatedOrder) => {
      invalidatePo();
      onSaved(updatedOrder);
    },
  });

  const mutation = mode === 'create' ? createMutation : updateMutation;

  const updateLine = (clientId: string, patch: Partial<PoLineDraft>) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.clientId === clientId ? { ...line, ...patch } : line)),
    }));
  };

  const removeLine = (clientId: string) => {
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((line) => line.clientId !== clientId).map((line, index) => ({ ...line, line_no: index + 1 })),
    }));
  };

  const addLine = () => {
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, newLineDraft(current.lines.length)],
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.po_no.trim() || !draft.supplier_id || !draft.incoterm_id) return;
    if (mode === 'create') {
      const payload = buildPoPayload(draft);
      if (!payload.lines?.length) return;
      createMutation.mutate(payload);
      return;
    }
    updateMutation.mutate(buildPoPatchPayload(draft));
  };

  return (
    <Paper withBorder={mode === 'create'} p={mode === 'create' ? 'md' : 0} component="form" onSubmit={handleSubmit}>
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700}>{mode === 'create' ? 'Create PO' : 'PO header'}</Text>
            <Text size="xs" c="dimmed">
              Header fields use master data IDs required by the V1 API.
            </Text>
          </div>
          <Group gap="xs">
            <Button type="button" variant="subtle" onClick={onCancel} leftSection={<IconX size={16} />}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending} leftSection={<IconDeviceFloppy size={16} />}>
              Save
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 4 }}>
          <TextInput
            label="PO no"
            value={draft.po_no}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, po_no: value }));
            }}
            required
          />
          <TextInput
            label="Contract no"
            value={draft.contract_no}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, contract_no: value }));
            }}
          />
          <Select
            label="PO type"
            data={poTypeOptions.map((type) => ({ label: type, value: type }))}
            value={draft.po_type}
            onChange={(value) => setDraft((current) => ({ ...current, po_type: value ?? '' }))}
            clearable
          />
          <Select
            label="Supplier"
            data={masterData.supplierOptions}
            value={draft.supplier_id}
            onChange={(value) => {
              const supplier = masterData.suppliers.find((item) => item.id === value);
              setDraft((current) => ({
                ...current,
                supplier_id: value ?? '',
                currency_id: supplier?.default_currency_id ?? current.currency_id,
                incoterm_id: supplier?.default_incoterm_id ?? current.incoterm_id,
                payment_term: supplier?.payment_term ?? current.payment_term,
                transport_mode_id:
                  supplier?.supplier_transport_modes?.find((mode) => mode.is_default)?.transport_mode_id ??
                  current.transport_mode_id,
              }));
            }}
            searchable
            required
          />
          <Select
            label="Transport mode"
            data={masterData.transportModeOptions}
            value={draft.transport_mode_id}
            onChange={(value) => setDraft((current) => ({ ...current, transport_mode_id: value ?? '' }))}
            searchable
            clearable
          />
          <Select
            label="Incoterm"
            data={masterData.incotermOptions}
            value={draft.incoterm_id}
            onChange={(value) => setDraft((current) => ({ ...current, incoterm_id: value ?? '' }))}
            searchable
            required
          />
          <Select
            label="Currency"
            data={masterData.currencyOptions}
            value={draft.currency_id}
            onChange={(value) => setDraft((current) => ({ ...current, currency_id: value ?? '' }))}
            searchable
            clearable
          />
          <NumberInput
            label="Current exchange rate"
            min={0}
            value={draft.exchange_rate}
            thousandSeparator=","
            decimalScale={4}
            onChange={(value) => setDraft((current) => ({ ...current, exchange_rate: toNumber(value, 1) }))}
          />
          <TextInput
            label="Payment term"
            value={draft.payment_term}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, payment_term: value }));
            }}
          />
          <TextInput
            label="ETD"
            type="date"
            value={draft.expected_etd}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, expected_etd: value }));
            }}
          />
          <TextInput
            label="ETA"
            type="date"
            value={draft.expected_eta}
            onChange={(event) => {
              const { value } = event.currentTarget;
              setDraft((current) => ({ ...current, expected_eta: value }));
            }}
          />
        </SimpleGrid>
        <Textarea
          label="Notes"
          value={draft.notes}
          onChange={(event) => {
            const { value } = event.currentTarget;
            setDraft((current) => ({ ...current, notes: value }));
          }}
          autosize
          minRows={2}
        />

        {mode === 'create' ? (
          <>
            <Divider label="PO lines" labelPosition="left" />
            <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
              <Table miw={1440} verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 72 }}>Line</Table.Th>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>HSCODE</Table.Th>
                    <Table.Th style={{ width: 130 }}>Qty</Table.Th>
                    <Table.Th style={{ width: 110 }}>Unit</Table.Th>
                    <Table.Th style={{ width: 135 }}>Unit price</Table.Th>
                    <Table.Th style={{ width: 135 }}>Gross kg</Table.Th>
                    <Table.Th style={{ width: 155 }}>Line ETA</Table.Th>
                    <Table.Th style={{ width: 220 }}>Line note</Table.Th>
                    <Table.Th style={{ width: 44 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {draft.lines.map((line, index) => {
                    const item = masterData.items.find((candidate) => candidate.id === line.item_id);
                    const customsOptions = buildCustomsOptions(item);
                    return (
                      <Table.Tr key={line.clientId}>
                        <Table.Td>
                          <Text fw={700} size="sm">
                            #{index + 1}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={masterData.itemOptions}
                            value={line.item_id}
                            onChange={(value) => {
                              const selectedItem = masterData.items.find((candidate) => candidate.id === value);
                              updateLine(line.clientId, {
                                item_id: value ?? '',
                                item_customs_profile_id:
                                  selectedItem?.customs_profiles?.find((profile) => profile.is_default)?.id ??
                                  selectedItem?.customs_profiles?.[0]?.id ??
                                  '',
                                item_description: selectedItem?.item_description ?? selectedItem?.item_name ?? '',
                                unit: selectedItem?.base_uom ?? line.unit,
                              });
                            }}
                            searchable
                            required
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={customsOptions}
                            value={line.item_customs_profile_id}
                            onChange={(value) => updateLine(line.clientId, { item_customs_profile_id: value ?? '' })}
                            searchable
                            clearable
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0.0001}
                            value={line.qty_ordered}
                            thousandSeparator=","
                            decimalScale={4}
                            onChange={(value) => updateLine(line.clientId, { qty_ordered: toNumber(value, 1) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            value={line.unit}
                            onChange={(event) => updateLine(line.clientId, { unit: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0}
                            value={line.unit_price}
                            thousandSeparator=","
                            decimalScale={2}
                            onChange={(value) => updateLine(line.clientId, { unit_price: toNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            min={0}
                            value={line.gross_weight_kg}
                            thousandSeparator=","
                            decimalScale={3}
                            onChange={(value) => updateLine(line.clientId, { gross_weight_kg: toNumber(value) })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            type="date"
                            value={line.expected_eta_line}
                            onChange={(event) => updateLine(line.clientId, { expected_eta_line: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            value={line.notes}
                            placeholder="Packing, QC, or supplier note"
                            onChange={(event) => updateLine(line.clientId, { notes: event.currentTarget.value })}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Remove line"
                            disabled={draft.lines.length === 1}
                            onClick={() => removeLine(line.clientId)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            <Group justify="space-between">
              <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addLine}>
                Add line
              </Button>
              <Text fw={700} size="sm">
                Total: <NumberFormatter value={totalPoAmount(draft.lines)} thousandSeparator />
              </Text>
            </Group>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
