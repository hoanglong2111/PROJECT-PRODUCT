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
} from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconLink, IconX } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  createPurchaseOrder,
  updatePurchaseOrder,
  type CreatePurchaseOrderV1Payload,
  type PurchaseOrderV1,
  type UpdatePurchaseOrderV1Payload,
} from '@shared/api/purchaseOrders';
import type { QuotationV1 } from '@shared/api/quotations';
import { fetchQuotationRequest } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { DateTimeField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { FormSection, OrderLineItemsEditor, SummaryTile, type OrderLineDraft } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { usePoInvalidation } from '../hooks/usePoInvalidation';
import { usePoMasterData } from '../hooks/usePoMasterData';
import {
  applyQuotationPrefill,
  applyRfqLinesPrefill,
  buildCustomsOptions,
  buildPoPatchPayload,
  buildPoPayload,
  createInitialPoDraft,
  deriveContractNo,
  newLineDraft,
  PO_DESTINATION_COUNTRY,
  poTypeOptions,
  toNumber,
  totalPoAmount,
  type PoLineDraft,
} from '../model/purchaseOrderModel';

const poLineToOrderLine = (line: PoLineDraft): OrderLineDraft => ({
  clientId: line.clientId,
  line_no: line.line_no,
  item_id: line.item_id,
  item_description: line.item_description,
  qty: line.qty_ordered,
  unit: line.unit,
  unit_price: line.unit_price,
  gross_weight_kg: line.gross_weight_kg,
  note: line.notes,
  item_customs_profile_id: line.item_customs_profile_id,
  tax_rate: line.tax_rate,
  discount_pct: line.discount_pct,
  expected_eta_line: line.expected_eta_line,
});

const orderPatchToPoPatch = (patch: Partial<OrderLineDraft>): Partial<PoLineDraft> => ({
  ...(patch.item_id !== undefined ? { item_id: patch.item_id } : {}),
  ...(patch.item_description !== undefined ? { item_description: patch.item_description } : {}),
  ...(patch.qty !== undefined ? { qty_ordered: patch.qty } : {}),
  ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
  ...(patch.unit_price !== undefined ? { unit_price: patch.unit_price } : {}),
  ...(patch.gross_weight_kg !== undefined ? { gross_weight_kg: patch.gross_weight_kg } : {}),
  ...(patch.note !== undefined ? { notes: patch.note } : {}),
  ...(patch.item_customs_profile_id !== undefined ? { item_customs_profile_id: patch.item_customs_profile_id } : {}),
  ...(patch.tax_rate !== undefined ? { tax_rate: patch.tax_rate } : {}),
  ...(patch.discount_pct !== undefined ? { discount_pct: patch.discount_pct } : {}),
  ...(patch.expected_eta_line !== undefined ? { expected_eta_line: patch.expected_eta_line } : {}),
});

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
  const { t } = useI18n();
  const rfqPrefillAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    const nextDraft = createInitialPoDraft(order);
    rfqPrefillAppliedRef.current = null;
    setDraft(nextDraft);
    setActiveLineId(nextDraft.lines[0]?.clientId ?? null);
    setContractAutoSync(!order?.contract_no);
  }, [order, quotation?.id]);

  const sourceRfqQuery = useQuery({
    enabled: mode === 'create' && Boolean(quotation?.rfq_id),
    queryKey: queryKeys.quotationRequestDetail(quotation?.rfq_id ?? ''),
    queryFn: () => fetchQuotationRequest(quotation?.rfq_id ?? ''),
  });

  useEffect(() => {
    if (mode !== 'create' || !quotation) return;
    setDraft((current) => {
      const withHeader = applyQuotationPrefill(current, quotation, {
        currencies: masterData.currencies,
        incoterms: masterData.incoterms,
        transportModes: masterData.transportModes,
      });
      const rfq = sourceRfqQuery.data;
      if (!rfq?.lines?.length || rfqPrefillAppliedRef.current === rfq.id) {
        return withHeader;
      }
      rfqPrefillAppliedRef.current = rfq.id;
      return applyRfqLinesPrefill(withHeader, rfq.lines);
    });
  }, [mode, quotation, masterData.currencies, masterData.incoterms, masterData.transportModes, sourceRfqQuery.data]);

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
  const originCountry = selectedSupplier?.country ?? '-';
  const poTotal = totalPoAmount(draft.lines);
  const lineIsComplete = (line: PoLineDraft) => Boolean(line.item_id) && toNumber(line.qty_ordered) > 0;
  const validLineCount = draft.lines.filter(lineIsComplete).length;
  const incompleteLineCount = draft.lines.length - validLineCount;
  const canSubmit =
    Boolean(draft.po_no.trim() && draft.supplier_id && draft.incoterm_id) &&
    (mode === 'edit' || (validLineCount > 0 && Boolean(draft.quotation_id)));

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
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title={t('purchaseOrders.formSaveError')}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        {mode === 'create' && !draft.quotation_id ? (
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={t('purchaseOrders.formQuotationRequiredTitle')}>
            {t('purchaseOrders.formQuotationRequiredBody')}
          </Alert>
        ) : null}

        <Paper withBorder p="sm" className="purchase-order-form-hero">
          <Group justify="space-between" align="flex-start" gap="md">
            <Stack gap={4}>
              <Group gap="xs">
                <Text fw={700} size="lg">
                  {mode === 'create' ? t('purchaseOrders.createPo') : t('purchaseOrders.poHeader')}
                </Text>
                <Badge variant="light" size="sm">
                  {mode === 'create' ? t('purchaseOrders.badgeNewOrder') : t('purchaseOrders.badgeHeaderEdit')}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {t('purchaseOrders.formHeroDescription')}
              </Text>
            </Stack>
            <Group gap="xs" className="purchase-order-form-actions">
              <Button type="button" variant="subtle" onClick={onCancel} leftSection={<IconX size={16} />}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={!canSubmit}
                leftSection={<IconDeviceFloppy size={16} />}
              >
                {mode === 'create' ? t('purchaseOrders.createPo') : t('purchaseOrders.saveHeader')}
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="md">
            <SummaryTile label={t('purchaseOrders.poNoReference')} value={draft.po_no || t('purchaseOrders.draftValue')} />
            <SummaryTile label={t('purchaseOrders.supplier')} value={selectedSupplier?.supplier_name ?? t('purchaseOrders.supplierRequired')} />
            <SummaryTile label={t('purchaseOrders.terms')} value={selectedIncoterm?.incoterm_code ?? t('purchaseOrders.incotermRequired')} />
            <SummaryTile
              label={mode === 'create' ? t('purchaseOrders.poTotal') : t('purchaseOrders.currency')}
              value={
                mode === 'create' ? (
                  <NumberFormatter value={poTotal} thousandSeparator decimalScale={2} />
                ) : (
                  selectedCurrency?.currency_code ?? t('purchaseOrders.notSet')
                )
              }
              tone="accent"
            />
          </SimpleGrid>
        </Paper>

        <div className="purchase-order-form-core-grid">
          <FormSection title={t('purchaseOrders.sectionIdentificationTitle')} description={t('purchaseOrders.sectionIdentificationDescription')}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 1, xl: 2 }} spacing="sm">
              <TextInput
                label={t('purchaseOrders.poNoReference')}
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
                label={contractAutoSync ? t('purchaseOrders.contractNoAuto') : t('purchaseOrders.contractNo')}
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
                      aria-label={t('purchaseOrders.resyncContractNo')}
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
                    label={t('purchaseOrders.poType')}
                    hint={t('purchaseOrders.poTypeHint')}
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
            title={t('purchaseOrders.sectionSupplierTitle')}
            description={t('purchaseOrders.sectionSupplierDescription')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={t('purchaseOrders.supplier')}
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
                      supplier?.supplier_transport_modes?.find((modeItem) => modeItem.is_default)?.transport_mode_id ??
                      current.transport_mode_id,
                  }));
                }}
                searchable
                required
              />
              <Select
                label={t('purchaseOrders.incoterm')}
                data={masterData.incotermOptions}
                value={draft.incoterm_id}
                onChange={(value) => setDraft((current) => ({ ...current, incoterm_id: value ?? '' }))}
                searchable
                required
              />
              <Select
                label={t('purchaseOrders.currency')}
                data={masterData.currencyOptions}
                value={draft.currency_id}
                onChange={(value) => setDraft((current) => ({ ...current, currency_id: value ?? '' }))}
                searchable
                clearable
              />
              <NumberInput
                label={t('purchaseOrders.exchangeRate')}
                min={0}
                value={draft.exchange_rate}
                thousandSeparator=","
                decimalScale={4}
                onChange={(value) => setDraft((current) => ({ ...current, exchange_rate: toNumber(value, 1) }))}
              />
              <TextInput
                label={t('purchaseOrders.paymentTerm')}
                value={draft.payment_term}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setDraft((current) => ({ ...current, payment_term: value }));
                }}
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title={t('purchaseOrders.sectionTransportTitle')}
            description={
              selectedTransportMode
                ? t('purchaseOrders.sectionTransportModeSelected', { mode: selectedTransportMode.mode_code })
                : t('purchaseOrders.sectionTransportDescription')
            }
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={
                  <HeaderLabel
                    label={t('purchaseOrders.transportMode')}
                    hint={t('purchaseOrders.transportModeHint')}
                  />
                }
                data={masterData.transportModeOptions}
                value={draft.transport_mode_id}
                onChange={(value) => setDraft((current) => ({ ...current, transport_mode_id: value ?? '' }))}
                searchable
                clearable
              />
              <DateTimeField
                label="ETD"
                value={draft.expected_etd}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, expected_etd: value ?? '' }));
                }}
              />
              <DateTimeField
                label="ETA"
                value={draft.expected_eta}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, expected_eta: value ?? '' }));
                }}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mt="sm">
              <TextInput
                label={t('purchaseOrders.portOfLoading')}
                description={`${t('purchaseOrders.originCountry')}: ${originCountry}`}
                value={draft.origin_port}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setDraft((current) => ({ ...current, origin_port: value }));
                }}
              />
              <TextInput
                label={t('purchaseOrders.portOfDischarge')}
                description={`${t('purchaseOrders.destinationCountry')}: ${PO_DESTINATION_COUNTRY}`}
                value={draft.destination_port}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setDraft((current) => ({ ...current, destination_port: value }));
                }}
              />
            </SimpleGrid>
            <Textarea
              label={t('common.notes')}
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
                  <Text fw={700}>{t('purchaseOrders.poLinesTitle')}</Text>
                  <Badge variant="light">{t('purchaseOrders.linesReady', { count: validLineCount })}</Badge>
                  {incompleteLineCount > 0 ? (
                    <Badge color="orange" variant="light">
                      {t('purchaseOrders.linesIncomplete', { count: incompleteLineCount })}
                    </Badge>
                  ) : null}
                </Group>
                <Text size="sm" c="dimmed">
                  {t('purchaseOrders.linesHint')}
                </Text>
              </Stack>
              <Group gap="xs" className="purchase-order-lines-actions">
                <Group gap="xs" className="purchase-order-total-pill">
                  <Text size="xs" c="dimmed" fw={700}>
                    {t('purchaseOrders.poTotal')}
                  </Text>
                  <Text fw={800} size="md" className="tabular-nums">
                    <NumberFormatter value={poTotal} thousandSeparator decimalScale={2} />
                  </Text>
                </Group>
              </Group>
            </Group>
            {validLineCount === 0 ? (
              <Group gap={6} className="purchase-order-line-notice is-error">
                <IconAlertTriangle size={15} />
                <Text size="xs">{t('purchaseOrders.linesRequired')}</Text>
              </Group>
            ) : incompleteLineCount > 0 ? (
              <Group gap={6} className="purchase-order-line-notice is-warning">
                <IconAlertTriangle size={15} />
                <Text size="xs">
                  {t('purchaseOrders.linesIncompleteWarning', { count: incompleteLineCount })}
                </Text>
              </Group>
            ) : null}
            <OrderLineItemsEditor
              lines={draft.lines.map(poLineToOrderLine)}
              activeId={activeLineId}
              onActiveChange={setActiveLineId}
              onChange={(clientId, patch) => updateLine(clientId, orderPatchToPoPatch(patch))}
              onAdd={addLine}
              onRemove={removeLine}
              items={masterData.items}
              itemOptions={masterData.itemOptions}
              currencyCode={selectedCurrency?.currency_code ?? null}
              fields={{ customsProfile: true, taxRate: true, discountPct: true, lineEta: true }}
              customsOptionsFor={(item) => buildCustomsOptions(item)}
              onItemSelected={(clientId, item) =>
                updateLine(clientId, {
                  item_customs_profile_id:
                    item?.customs_profiles?.find((profile) => profile.is_default)?.id ?? item?.customs_profiles?.[0]?.id ?? '',
                })
              }
            />
          </Paper>
        ) : null}
      </Stack>
    </form>
  );
}
