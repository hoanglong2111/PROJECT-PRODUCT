import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  NumberFormatter,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconLink, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';

import {
  createPurchaseOrder,
  updatePurchaseOrder,
  type CreatePurchaseOrderV1Payload,
  type PurchaseOrderV1,
  type UpdatePurchaseOrderV1Payload,
} from '@shared/api/purchaseOrders';
import type { QuotationV1 } from '@shared/api/quotations';
import { DateField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { usePoMasterData } from '../hooks/usePoMasterData';
import {
  buildCustomsOptions,
  buildPoPatchPayload,
  buildPoPayload,
  createInitialPoDraft,
  deriveContractNo,
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
  quotation,
}: {
  mode: 'create' | 'edit';
  onCancel: () => void;
  onSaved: (order: PurchaseOrderV1) => void;
  order?: PurchaseOrderV1;
  quotation?: QuotationV1 | null;
}) {
  const initialDraft = createInitialPoDraft(order);
  const [draft, setDraft] = useState(initialDraft);
  const [activeLineId, setActiveLineId] = useState<string | null>(() => initialDraft.lines[0]?.clientId ?? null);
  const [contractAutoSync, setContractAutoSync] = useState(() => !order?.contract_no);
  const invalidatePo = usePoInvalidation(order?.id);
  const masterData = usePoMasterData();
  const itemInputRef = useRef<HTMLInputElement>(null);
  const railListRef = useRef<HTMLDivElement>(null);
  // When a line is added we want to jump straight into editing it: remember its
  // id so an effect can focus the Item field and scroll the rail entry into view.
  const [focusLineId, setFocusLineId] = useState<string | null>(null);

  useEffect(() => {
    const nextDraft = createInitialPoDraft(order);
    setDraft(nextDraft);
    setActiveLineId(nextDraft.lines[0]?.clientId ?? null);
    setContractAutoSync(!order?.contract_no);
  }, [order]);

  // Create-from-quotation: link the quotation and prefill the commercial header
  // (incoterm + currency) from it once master data is available. Lines and supplier
  // are entered normally, so the PO line -> LOT logic is untouched.
  useEffect(() => {
    if (mode !== 'create' || !quotation) return;
    const incoterm = masterData.incoterms.find((item) => item.incoterm_code === quotation.incoterm_code);
    const currency = masterData.currencies.find((item) => item.currency_code === quotation.currency_code);
    setDraft((current) => ({
      ...current,
      quotation_id: quotation.id,
      incoterm_id: incoterm?.id ?? current.incoterm_id,
      currency_id: currency?.id ?? current.currency_id,
    }));
  }, [mode, quotation, masterData.incoterms, masterData.currencies]);

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
  const selectedSupplier = masterData.suppliers.find((supplier) => supplier.id === draft.supplier_id);
  const selectedIncoterm = masterData.incoterms.find((incoterm) => incoterm.id === draft.incoterm_id);
  const selectedCurrency = masterData.currencies.find((currency) => currency.id === draft.currency_id);
  const selectedTransportMode = masterData.transportModes.find((transportMode) => transportMode.id === draft.transport_mode_id);
  const poTotal = totalPoAmount(draft.lines);
  // A line is only saved if it has an item and a positive quantity (buildPoPayload
  // drops the rest). Surface that here so incomplete lines aren't silently lost.
  const lineIsComplete = (line: PoLineDraft) => Boolean(line.item_id) && toNumber(line.qty_ordered) > 0;
  const validLineCount = draft.lines.filter(lineIsComplete).length;
  const incompleteLineCount = draft.lines.length - validLineCount;
  const canSubmit =
    Boolean(draft.po_no.trim() && draft.supplier_id && draft.incoterm_id) &&
    (mode === 'edit' || (validLineCount > 0 && Boolean(draft.quotation_id)));
  const activeLine = draft.lines.find((line) => line.clientId === activeLineId) ?? draft.lines[0] ?? null;
  const activeLineIndex = activeLine ? draft.lines.findIndex((line) => line.clientId === activeLine.clientId) : -1;
  const activeLineItem = masterData.items.find((candidate) => candidate.id === activeLine?.item_id);
  const activeCustomsOptions = buildCustomsOptions(activeLineItem);
  const activeLineAmount = activeLine ? toNumber(activeLine.qty_ordered) * toNumber(activeLine.unit_price) : 0;

  useEffect(() => {
    if (!focusLineId || activeLine?.clientId !== focusLineId) return;
    itemInputRef.current?.focus();
    railListRef.current
      ?.querySelector<HTMLElement>(`[data-line-id="${focusLineId}"]`)
      ?.scrollIntoView({ block: 'nearest' });
    setFocusLineId(null);
  }, [focusLineId, activeLine]);

  const updateLine = (clientId: string, patch: Partial<PoLineDraft>) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.clientId === clientId ? { ...line, ...patch } : line)),
    }));
  };

  const removeLine = (clientId: string) => {
    const remainingLineIds = draft.lines.filter((line) => line.clientId !== clientId).map((line) => line.clientId);
    setDraft((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((line) => line.clientId !== clientId).map((line, index) => ({ ...line, line_no: index + 1 })),
    }));
    setActiveLineId((current) => (current === clientId ? remainingLineIds[0] ?? null : current));
  };

  const addLine = () => {
    const nextLine = newLineDraft(draft.lines.length);
    setDraft((current) => ({
      ...current,
      lines: [...current.lines, nextLine],
    }));
    setActiveLineId(nextLine.clientId);
    setFocusLineId(nextLine.clientId);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.po_no.trim() || !draft.supplier_id || !draft.incoterm_id) return;
    if (mode === 'create') {
      if (!draft.quotation_id) return;
      const payload = buildPoPayload(draft);
      if (!payload.lines?.length) return;
      createMutation.mutate(payload);
      return;
    }
    updateMutation.mutate(buildPoPatchPayload(draft));
  };

  return (
    <form className="purchase-order-form" onSubmit={handleSubmit}>
      <Stack gap="sm">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Could not save PO">
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        {mode === 'create' && !draft.quotation_id ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title="Confirmed quotation required">
            A PO can only be created from a CONFIRMED quotation. Open a confirmed quotation and use
            “Create PO from quotation”.
          </Alert>
        ) : null}

        <Paper withBorder p="sm" className="purchase-order-form-hero">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={700} size="lg">
                  {mode === 'create' ? 'Create PO' : 'PO header'}
                </Text>
                <Badge variant="light" size="sm">
                  {mode === 'create' ? 'New order' : 'Header edit'}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Capture supplier terms, logistics dates, and PO lines for the V1 workflow.
              </Text>
            </Stack>
            <Group gap="xs" className="purchase-order-form-actions">
              <Button type="button" variant="subtle" onClick={onCancel} leftSection={<IconX size={16} />}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={!canSubmit}
                leftSection={<IconDeviceFloppy size={16} />}
              >
                {mode === 'create' ? 'Create PO' : 'Save header'}
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="md">
            <SummaryTile label="PO no" value={draft.po_no || 'Draft'} />
            <SummaryTile label="Supplier" value={selectedSupplier?.supplier_name ?? 'Supplier required'} />
            <SummaryTile label="Terms" value={selectedIncoterm?.incoterm_code ?? 'Incoterm required'} />
            <SummaryTile
              label={mode === 'create' ? 'PO total' : 'Currency'}
              value={
                mode === 'create' ? (
                  <NumberFormatter value={poTotal} thousandSeparator decimalScale={2} />
                ) : (
                  selectedCurrency?.currency_code ?? 'Not set'
                )
              }
              tone="accent"
            />
          </SimpleGrid>
        </Paper>

        <div className="purchase-order-form-core-grid">
          <FormSection
            title="Order identification"
            description="Short, searchable operational references."
          >
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 1, xl: 2 }} spacing="sm">
              <TextInput
                label="PO no"
                value={draft.po_no}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setDraft((current) => ({
                    ...current,
                    po_no: value,
                    contract_no: contractAutoSync ? deriveContractNo(value) : current.contract_no,
                  }));
                }}
                required
              />
              <TextInput
                label={contractAutoSync ? 'Contract no (auto)' : 'Contract no'}
                value={draft.contract_no}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setContractAutoSync(false);
                  setDraft((current) => ({ ...current, contract_no: value }));
                }}
                rightSection={
                  contractAutoSync ? null : (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Re-sync contract no from PO no"
                      onClick={() => {
                        setContractAutoSync(true);
                        setDraft((current) => ({ ...current, contract_no: deriveContractNo(current.po_no) }));
                      }}
                    >
                      <IconLink size={16} />
                    </ActionIcon>
                  )
                }
              />
              <Select
                label={
                  <HeaderLabel
                    label="PO type"
                    hint="Commercial lane (sea / air / domestic). Drives SOP task templates — not the booked container mode."
                  />
                }
                data={poTypeOptions.map((type) => ({ label: type, value: type }))}
                value={draft.po_type}
                onChange={(value) => setDraft((current) => ({ ...current, po_type: value ?? '' }))}
                clearable
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title="Supplier and commercial terms"
            description="Supplier defaults can prefill currency, incoterm, payment, and transport."
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
            </SimpleGrid>
          </FormSection>

          <FormSection
            title="Transport and schedule"
            description={
              selectedTransportMode
                ? `${selectedTransportMode.mode_code} selected for movement planning.`
                : 'Expected departure and arrival before LOT planning.'
            }
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={
                  <HeaderLabel
                    label="Transport mode"
                    hint="Planned method, incl. FCL / LCL / air. The final FCL vs LCL is confirmed downstream on the shipment."
                  />
                }
                data={masterData.transportModeOptions}
                value={draft.transport_mode_id}
                onChange={(value) => setDraft((current) => ({ ...current, transport_mode_id: value ?? '' }))}
                searchable
                clearable
              />
              <DateField
                label="ETD"
                value={draft.expected_etd}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, expected_etd: value ?? '' }));
                }}
              />
              <DateField
                label="ETA"
                value={draft.expected_eta}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, expected_eta: value ?? '' }));
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
          </FormSection>
        </div>

        {mode === 'create' ? (
          <Paper withBorder p="sm" className="purchase-order-form-section purchase-order-lines-panel">
            <Group justify="space-between" align="flex-start" gap="sm" className="purchase-order-lines-command">
              <Stack gap={2} className="purchase-order-lines-copy">
                <Group gap="xs" wrap="wrap">
                  <Text fw={700}>PO lines</Text>
                  <Badge variant="light">{validLineCount} ready</Badge>
                  {incompleteLineCount > 0 ? (
                    <Badge color="orange" variant="light">
                      {incompleteLineCount} incomplete
                    </Badge>
                  ) : null}
                </Group>
                <Text size="sm" c="dimmed">
                  Pick a line on the left, finish the required fields on the right, then create the PO.
                </Text>
              </Stack>
              <Group gap="xs" className="purchase-order-lines-actions">
                <Group gap="xs" className="purchase-order-total-pill">
                  <Text size="xs" c="dimmed" fw={700}>
                    PO total
                  </Text>
                  <Text fw={800} size="md" className="tabular-nums">
                    <NumberFormatter value={poTotal} thousandSeparator decimalScale={2} />
                  </Text>
                </Group>
                <Button variant="light" size="sm" leftSection={<IconPlus size={14} />} onClick={addLine}>
                  Add line
                </Button>
              </Group>
            </Group>
            {validLineCount === 0 ? (
              <Group gap={6} className="purchase-order-line-notice is-error">
                <IconAlertTriangle size={15} />
                <Text size="xs">Add at least one line with an item and a quantity before creating the PO.</Text>
              </Group>
            ) : incompleteLineCount > 0 ? (
              <Group gap={6} className="purchase-order-line-notice is-warning">
                <IconAlertTriangle size={15} />
                <Text size="xs">
                  {incompleteLineCount} incomplete line{incompleteLineCount > 1 ? 's' : ''} (missing item or quantity) won’t be
                  saved.
                </Text>
              </Group>
            ) : null}
            <div className="purchase-order-line-workspace">
              <div className="purchase-order-line-rail">
                <Group justify="space-between" className="purchase-order-line-rail-header">
                  <Text size="xs" fw={800} c="dimmed">
                    Lines
                  </Text>
                  <Text size="xs" c="dimmed" className="tabular-nums">
                    {activeLineIndex + 1}/{draft.lines.length}
                  </Text>
                </Group>
                <div className="purchase-order-line-rail-list" ref={railListRef}>
                  {draft.lines.map((line, index) => {
                    const item = masterData.items.find((candidate) => candidate.id === line.item_id);
                    const selectedCustoms = buildCustomsOptions(item).find((option) => option.value === line.item_customs_profile_id);
                    const lineAmount = toNumber(line.qty_ordered) * toNumber(line.unit_price);
                    const isActive = activeLine?.clientId === line.clientId;
                    const isComplete = lineIsComplete(line);

                    return (
                      <UnstyledButton
                        key={line.clientId}
                        type="button"
                        data-line-id={line.clientId}
                        onClick={() => setActiveLineId(line.clientId)}
                        className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${isComplete ? '' : ' is-incomplete'}`}
                      >
                        <div className="purchase-order-line-rail-item-main">
                          <div className="purchase-order-line-rail-index">
                            #{index + 1}
                            {isComplete ? null : (
                              <span
                                className="purchase-order-line-rail-dot"
                                title="Missing item or quantity — this line won’t be saved"
                                aria-label="Incomplete line"
                              />
                            )}
                          </div>
                          <div className="purchase-order-line-rail-copy">
                            <Text fw={700} size="sm" lineClamp={1}>
                              {item?.item_code ?? line.item_description ?? 'Choose item'}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {item?.item_name ?? line.item_description ?? 'Item not selected'}
                            </Text>
                          </div>
                        </div>
                        <div className="purchase-order-line-rail-side">
                          <Text fw={800} size="sm" className="tabular-nums">
                            <NumberFormatter value={lineAmount} thousandSeparator decimalScale={2} />
                          </Text>
                          <Text size="xs" c="dimmed">
                            {line.expected_eta_line ? `ETA ${line.expected_eta_line}` : 'ETA pending'}
                          </Text>
                        </div>
                        <Text size="xs" c="dimmed" className="purchase-order-line-rail-meta" lineClamp={1}>
                          <NumberFormatter value={line.qty_ordered} thousandSeparator decimalScale={4} /> {line.unit ?? ''} |{' '}
                          {selectedCustoms?.label ?? 'HS code pending'}
                        </Text>
                      </UnstyledButton>
                    );
                  })}
                </div>
              </div>

              <div className="purchase-order-line-detail">
                {activeLine ? (
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start" gap="md" className="purchase-order-line-detail-header">
                      <Stack gap={4}>
                        <Group gap="xs" wrap="wrap">
                          <Text fw={700}>Editing line #{activeLineIndex + 1}</Text>
                          <Badge variant="light" size="sm">
                            {activeLineItem?.item_code ?? 'Item pending'}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          {activeLineItem?.item_name ?? activeLine.item_description ?? 'Select an item, then complete quantity, pricing, ETA, and notes.'}
                        </Text>
                      </Stack>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Remove line"
                        disabled={draft.lines.length === 1}
                        onClick={() => removeLine(activeLine.clientId)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>

                    <SummaryTile
                      label="Line amount (qty × unit price)"
                      tone="accent"
                      value={
                        <>
                          <NumberFormatter value={activeLineAmount} thousandSeparator decimalScale={2} />
                          {selectedCurrency?.currency_code ? ` ${selectedCurrency.currency_code}` : ''}
                        </>
                      }
                    />

                    <div className="purchase-order-line-detail-grid">
                      <div className="purchase-order-line-field-group is-wide">
                        <Text size="xs" fw={800} c="dimmed">
                          Item and customs
                        </Text>
                        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                          <Select
                            ref={itemInputRef}
                            label="Item"
                            data={masterData.itemOptions}
                            value={activeLine.item_id}
                            placeholder="Choose item"
                            onChange={(value) => {
                              const selectedItem = masterData.items.find((candidate) => candidate.id === value);
                              updateLine(activeLine.clientId, {
                                item_id: value ?? '',
                                item_customs_profile_id:
                                  selectedItem?.customs_profiles?.find((profile) => profile.is_default)?.id ??
                                  selectedItem?.customs_profiles?.[0]?.id ??
                                  '',
                                item_description: selectedItem?.note ?? selectedItem?.item_name ?? '',
                                unit: selectedItem?.base_uom ?? activeLine.unit,
                              });
                            }}
                            searchable
                            required
                          />
                          <Select
                            label="HS code"
                            data={activeCustomsOptions}
                            value={activeLine.item_customs_profile_id}
                            onChange={(value) => updateLine(activeLine.clientId, { item_customs_profile_id: value ?? '' })}
                            placeholder="Choose customs profile"
                            searchable
                            clearable
                          />
                        </SimpleGrid>
                      </div>

                      <div className="purchase-order-line-field-group is-wide">
                        <Text size="xs" fw={800} c="dimmed">
                          Quantity and schedule
                        </Text>
                        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
                          <NumberInput
                            label="Qty"
                            min={0.0001}
                            value={activeLine.qty_ordered}
                            thousandSeparator=","
                            decimalScale={4}
                            onChange={(value) => updateLine(activeLine.clientId, { qty_ordered: toNumber(value, 1) })}
                          />
                          <TextInput
                            label="Unit"
                            value={activeLine.unit}
                            onChange={(event) => updateLine(activeLine.clientId, { unit: event.currentTarget.value })}
                          />
                          <NumberInput
                            label="Gross kg"
                            min={0}
                            value={activeLine.gross_weight_kg}
                            thousandSeparator=","
                            decimalScale={3}
                            onChange={(value) => updateLine(activeLine.clientId, { gross_weight_kg: toNumber(value) })}
                          />
                          <DateField
                            label="Line ETA"
                            value={activeLine.expected_eta_line}
                            onChange={(value) => updateLine(activeLine.clientId, { expected_eta_line: value ?? '' })}
                          />
                        </SimpleGrid>
                      </div>

                      <div className="purchase-order-line-field-group">
                        <Text size="xs" fw={800} c="dimmed">
                          Pricing
                        </Text>
                        <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="sm">
                          <NumberInput
                            label="Unit price"
                            min={0}
                            value={activeLine.unit_price}
                            thousandSeparator=","
                            decimalScale={2}
                            onChange={(value) => updateLine(activeLine.clientId, { unit_price: toNumber(value) })}
                          />
                          <NumberInput
                            label="Tax %"
                            min={0}
                            max={100}
                            suffix="%"
                            value={activeLine.tax_rate}
                            decimalScale={2}
                            onChange={(value) => updateLine(activeLine.clientId, { tax_rate: toNumber(value) })}
                          />
                          <NumberInput
                            label="Disc %"
                            min={0}
                            max={100}
                            suffix="%"
                            value={activeLine.discount_pct}
                            decimalScale={2}
                            onChange={(value) => updateLine(activeLine.clientId, { discount_pct: toNumber(value) })}
                          />
                        </SimpleGrid>
                      </div>
                    </div>

                    <Textarea
                      label="Line note"
                      value={activeLine.notes}
                      placeholder="Packing, QC, or supplier note"
                      onChange={(event) => updateLine(activeLine.clientId, { notes: event.currentTarget.value })}
                      autosize
                      minRows={3}
                    />
                  </Stack>
                ) : null}
              </div>
            </div>
          </Paper>
        ) : null}
      </Stack>
    </form>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  title: string;
}) {
  return (
    <Paper withBorder p="sm" className="purchase-order-form-section">
      <Stack gap="sm">
        <Stack gap={1} className="purchase-order-form-section-title">
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

function SummaryTile({ label, tone = 'default', value }: { label: string; tone?: 'default' | 'accent'; value: ReactNode }) {
  return (
    <div className={`purchase-order-form-summary-tile ${tone === 'accent' ? 'is-accent' : ''}`}>
      <Text size="xs" c="dimmed" fw={700}>
        {label}
      </Text>
      <Text component="div" fw={800} size="sm" lineClamp={1} className="tabular-nums">
        {value}
      </Text>
    </div>
  );
}
