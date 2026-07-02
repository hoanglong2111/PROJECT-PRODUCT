import {
  ActionIcon,
  Alert,
  Button,
  Chip,
  Collapse,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconFileInvoice,
  IconPlus,
  IconReceipt2,
  IconRoute,
  IconWallet,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import {
  createQuotation,
  createQuotationVersion,
  type QuotationChargeLinePayload,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { CHARGE_GROUPS } from '@shared/lib/chargeCategories';
import { chargeCodeToChargeType, incotermChargeGroups, modeToChargeFlag } from '@shared/lib/quotationCharges';
import { formatMoney } from '@shared/utils/money';

import { quotationModeOptions, toShippingMode } from '../model/quotationModel';
import {
  type ChargeLineState,
  type FeeRow,
  QuotationFeeTable,
  seedLineState,
} from './QuotationFeeTable';

type QuotationFormProps = {
  onCancel: () => void;
  onCreated: (quotation: QuotationV1) => void;
  sourceQuotation?: QuotationV1;
};

type MandatoryLineState = ChargeLineState & { enabled: boolean };

type OtherLine = ChargeLineState & { uid: string };

type SuggestedChargeSection = {
  id: string;
  titleKey: (typeof CHARGE_GROUPS)[number]['labelKey'];
  charges: ChargeCode[];
};

let uidCounter = 0;
function nextUid() {
  return `other-${++uidCounter}`;
}

const EMPTY_CHARGE_CODES: ChargeCode[] = [];

export function QuotationForm({ onCancel, onCreated, sourceQuotation }: QuotationFormProps) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const { incotermOptions, currencyOptions } = useTradeMasterDataOptions();
  const isRevise = Boolean(sourceQuotation);

  const [customerRef, setCustomerRef] = useState(sourceQuotation?.customer_ref ?? '');
  const [incoterm, setIncoterm] = useState<string | null>(sourceQuotation?.incoterm_code ?? 'FOB');
  const [mode, setMode] = useState<string | null>(sourceQuotation?.mode ?? 'SEA_FCL');
  const [currency, setCurrency] = useState<string | null>(sourceQuotation?.currency_code ?? 'USD');

  // mandatory: keyed by real Charge Code master data charge_code
  const [mandatory, setMandatory] = useState<Record<string, MandatoryLineState>>({});
  // other/arising lines
  const [otherLines, setOtherLines] = useState<OtherLine[]>([]);
  // group filter for "other" section (default ANCILLARY)
  const [otherGroup, setOtherGroup] = useState<string>('ANCILLARY_ACCESSORIAL');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // guard: seed source lines only once after chargeCodes load
  const seededRef = useRef(false);

  const shippingMode = toShippingMode(mode);

  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });
  const chargeCodes = chargeCodesQuery.data?.data ?? EMPTY_CHARGE_CODES;

  const includedGroups = useMemo(() => incotermChargeGroups(incoterm), [incoterm]);
  const modeFlag = modeToChargeFlag(shippingMode);
  const suggestedChargeCodes = useMemo(() => {
    const included = new Set(includedGroups);
    return chargeCodes.filter((chargeCode) => chargeCode.is_active && included.has(chargeCode.group) && chargeCode[modeFlag] === true);
  }, [chargeCodes, includedGroups, modeFlag]);
  const suggestedChargeCodeSet = useMemo(
    () => new Set(suggestedChargeCodes.map((chargeCode) => chargeCode.charge_code)),
    [suggestedChargeCodes],
  );
  const sections = useMemo<SuggestedChargeSection[]>(() => {
    const included = new Set(includedGroups);
    return CHARGE_GROUPS.filter((group) => included.has(group.value))
      .map((group) => ({
        id: group.value,
        titleKey: group.labelKey,
        charges: suggestedChargeCodes.filter((chargeCode) => chargeCode.group === group.value),
      }))
      // Drop in-scope groups that the transport-mode filter leaves empty so no "0/0" accordion renders.
      .filter((section) => section.charges.length > 0);
  }, [includedGroups, suggestedChargeCodes]);

  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ limit: 200, is_active: true }),
    queryFn: () => fetchUoms({ limit: 200, is_active: true }),
  });
  const uoms = uomsQuery.data?.data ?? [];

  const chargeCodeOptions = useMemo(() => {
    const unique = Array.from(new Map(chargeCodes.map((c) => [c.charge_code, c])).values());
    return unique.map((c) => ({ label: `${c.charge_code} - ${c.charge_name_en}`, value: c.charge_code }));
  }, [chargeCodes]);

  const filteredChargeCodeOptions = useMemo(() => {
    const filtered = chargeCodes.filter((c) => c.group === otherGroup);
    const unique = Array.from(new Map(filtered.map((c) => [c.charge_code, c])).values());
    return unique.map((c) => ({ label: `${c.charge_code} - ${c.charge_name_en}`, value: c.charge_code }));
  }, [chargeCodes, otherGroup]);

  function findChargeCode(code: string | null | undefined): ChargeCode | null {
    return chargeCodes.find((c) => c.charge_code === code) ?? null;
  }

  const getMandatoryLine = useCallback(
    (chargeCode: string): MandatoryLineState => {
      if (mandatory[chargeCode]) return mandatory[chargeCode];
      const cc = findChargeCode(chargeCode);
      return { enabled: false, ...seedLineState(cc), chargeCode };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mandatory, chargeCodes],
  );

  // Seed revise mode lines once, after chargeCodes load from the query.
  // Only runs once (seededRef guard) so subsequent chargeCodes refetches don't overwrite edits.
  useEffect(() => {
    if (seededRef.current || !isRevise || !sourceQuotation?.charge_lines?.length || chargeCodes.length === 0) {
      return;
    }
    seededRef.current = true;
    let cancelled = false;

    const sourceLines = sourceQuotation.charge_lines;
    const newMandatory: Record<string, MandatoryLineState> = {};
    const newOtherLines: OtherLine[] = [];
    const takenSuggestedCodes = new Set<string>();
    let firstUnmatchedGroup = 'ANCILLARY_ACCESSORIAL';

    for (const srcLine of sourceLines) {
      const code = srcLine.charge_code ?? null;
      const cc = chargeCodes.find((candidate) => candidate.charge_code === code) ?? null;
      if (code && suggestedChargeCodeSet.has(code) && !takenSuggestedCodes.has(code)) {
        takenSuggestedCodes.add(code);
        newMandatory[code] = {
          enabled: true,
          chargeCode: code,
          quantity: String(srcLine.quantity ?? 1),
          unit: srcLine.unit ?? cc?.default_uom ?? null,
          unitPrice: srcLine.unit_price == null ? '' : String(srcLine.unit_price),
        };
      } else {
        if (newOtherLines.length === 0 && cc?.group) {
          firstUnmatchedGroup = cc.group;
        }
        newOtherLines.push({
          uid: nextUid(),
          chargeCode: code,
          quantity: String(srcLine.quantity ?? 1),
          unit: srcLine.unit ?? cc?.default_uom ?? null,
          unitPrice: srcLine.unit_price == null ? '' : String(srcLine.unit_price),
        });
      }
    }

    queueMicrotask(() => {
      if (cancelled) return;
      if (Object.keys(newMandatory).length > 0) setMandatory(newMandatory);
      if (newOtherLines.length > 0) {
        setOtherLines(newOtherLines);
        setOtherGroup(firstUnmatchedGroup);
      }
    });

    return () => {
      cancelled = true;
    };
    // sourceQuotation and incoterm/mode are stable for this component's lifetime — intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeCodes, isRevise, suggestedChargeCodeSet]);

  function updateMandatory(chargeCode: string, patch: Partial<MandatoryLineState>) {
    setMandatory((prev) => ({
      ...prev,
      [chargeCode]: { ...getMandatoryLine(chargeCode), ...prev[chargeCode], ...patch },
    }));
  }

  function toggleMandatory(chargeCode: string, enabled: boolean) {
    const current = getMandatoryLine(chargeCode);
    setMandatory((prev) => ({
      ...prev,
      [chargeCode]: { ...current, enabled },
    }));
  }

  function addOtherLine() {
    const defaultCode = filteredChargeCodeOptions[0]?.value ?? null;
    const cc = findChargeCode(defaultCode);
    setOtherLines((prev) => [...prev, { uid: nextUid(), ...seedLineState(cc), chargeCode: defaultCode }]);
  }

  function updateOtherLine(uid: string, patch: Partial<ChargeLineState>) {
    setOtherLines((prev) =>
      prev.map((line) => {
        if (line.uid !== uid) return line;
        const updated = { ...line, ...patch };
        if (patch.chargeCode !== undefined && patch.chargeCode !== line.chargeCode) {
          const cc = findChargeCode(patch.chargeCode);
          updated.unit = cc?.default_uom ?? updated.unit;
        }
        return updated;
      }),
    );
  }

  function removeOtherLine(uid: string) {
    setOtherLines((prev) => prev.filter((l) => l.uid !== uid));
  }

  const totals = useMemo(() => {
    const addLine = (running: { subtotal: number; estimatedTax: number }, line: ChargeLineState) => {
      const val = Number(line.unitPrice);
      const qty = Number(line.quantity);
      const amount = Number.isFinite(val) && Number.isFinite(qty) ? qty * val : 0;
      const cc = findChargeCode(line.chargeCode);
      return {
        subtotal: running.subtotal + amount,
        estimatedTax: running.estimatedTax + (cc?.taxable ? amount * 0.1 : 0),
      };
    };

    const mandatoryTotals = sections
      .flatMap((s) => s.charges)
      .reduce<{ subtotal: number; estimatedTax: number }>(
        (running, chargeCode) => {
          const line = getMandatoryLine(chargeCode.charge_code);
          if (!line.enabled) return running;
          return addLine(running, line);
        },
        { subtotal: 0, estimatedTax: 0 },
      );

    const allTotals = otherLines.reduce(addLine, mandatoryTotals);

    return {
      ...allTotals,
      grandTotal: allTotals.subtotal + allTotals.estimatedTax,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, otherLines, getMandatoryLine, chargeCodes]);
  const subtotal = totals.subtotal;
  const feeProgress = useMemo(() => {
    const charges = sections.flatMap((section) => section.charges);
    return {
      selected: charges.filter((chargeCode) => getMandatoryLine(chargeCode.charge_code).enabled).length,
      total: charges.length,
    };
  }, [sections, getMandatoryLine]);

  const canSubmit = Boolean(incoterm && mode && currency && subtotal > 0);
  const formatCurrencyAmount = (amount: number) => formatMoney(amount, currency);

  function buildChargeLines(): QuotationChargeLinePayload[] {
    const mandatoryLines: QuotationChargeLinePayload[] = sections
      .flatMap((s) => s.charges)
      .flatMap((chargeCode) => {
        const line = getMandatoryLine(chargeCode.charge_code);
        if (!line.enabled || !(Number(line.unitPrice) > 0)) return [];
        const cc = findChargeCode(line.chargeCode);
        const entry: QuotationChargeLinePayload = {
          line_no: 0,
          charge_type: chargeCodeToChargeType(cc ?? chargeCode, shippingMode),
          charge_code: line.chargeCode ?? cc?.charge_code,
          description: cc?.charge_name_en ?? chargeCode.charge_name_en,
          quantity: Number(line.quantity) || 1,
          unit: line.unit ?? cc?.default_uom ?? chargeCode.default_uom,
          unit_price: Number(line.unitPrice),
          tax_rate: cc?.taxable ? 10 : 0,
          note: cc ? `Rev/Cost: ${cc.rev_cost}` : null,
        };
        return [entry];
      });

    const otherChargeLines: QuotationChargeLinePayload[] = otherLines
      .filter((line) => Number(line.unitPrice) > 0 && line.chargeCode)
      .map((line) => {
        const cc = findChargeCode(line.chargeCode);
        const entry: QuotationChargeLinePayload = {
          line_no: 0,
          charge_type: cc ? chargeCodeToChargeType(cc, shippingMode) : 'OTHER',
          charge_code: line.chargeCode,
          description: cc?.charge_name_en ?? line.chargeCode ?? '',
          quantity: Number(line.quantity) || 1,
          unit: line.unit ?? cc?.default_uom ?? 'SHPT',
          unit_price: Number(line.unitPrice),
          tax_rate: cc?.taxable ? 10 : 0,
          note: cc ? `Rev/Cost: ${cc.rev_cost}` : null,
        };
        return entry;
      });

    return [...mandatoryLines, ...otherChargeLines].map((l, i) => ({ ...l, line_no: i + 1 }));
  }

  const createMutation = useMutation({
    mutationFn: () => {
      const chargeLines = buildChargeLines();
      if (isRevise && sourceQuotation) {
        return createQuotationVersion(sourceQuotation.id, {
          status: 'DRAFT',
          customer_ref: customerRef.trim() || null,
          incoterm_code: incoterm,
          mode,
          currency_code: currency ?? 'USD',
          charge_lines: chargeLines,
        });
      }
      return createQuotation({
        customer_ref: customerRef.trim() || null,
        incoterm_code: incoterm,
        mode,
        currency_code: currency ?? 'USD',
        status: 'DRAFT',
        charge_lines: chargeLines,
      });
    },
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      onCreated(quotation);
    },
  });

  const formTitle = isRevise ? t('quotations.reviseTitle') : t('quotations.formTitle');
  const formSubtitle = isRevise ? t('quotations.reviseSubtitle') : t('quotations.formSubtitle');
  const submitLabel = isRevise ? t('quotations.actionResubmit') : t('quotations.create');
  const includedGroupNames = CHARGE_GROUPS.filter((group) => includedGroups.includes(group.value))
    .map((group) => t(group.labelKey))
    .join(', ');
  const scopeSummary = t('quotations.incotermScopeHint', {
    count: includedGroups.length,
    groups: includedGroupNames || '-',
  });
  const chargeName = (chargeCode: ChargeCode) =>
    language === 'vi' && chargeCode.charge_name_vn ? chargeCode.charge_name_vn : chargeCode.charge_name_en;

  return (
    <Stack gap="md" className="rfq-form">
      <Paper withBorder p={0} className="rfq-form-panel">
        <div className="rfq-form-hero">
          <Group justify="space-between" align="flex-start" gap="md" className="rfq-form-hero-inner">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-form-title-row">
              <div className="rfq-icon-box">
                <IconFileInvoice size={18} />
              </div>
              <div className="rfq-form-title-copy">
                <Title order={3}>{formTitle}</Title>
                <Text c="dimmed" size="sm" mt={4}>
                  {formSubtitle}
                </Text>
              </div>
            </Group>

            <div className="rfq-form-hero-metrics">
              <div className="rfq-form-hero-metric">
                <IconRoute size={16} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.incotermsGroup')}
                  </Text>
                  <Text size="sm" fw={800}>
                    {incoterm ?? '-'}
                  </Text>
                </div>
              </div>
              <div className="rfq-form-hero-metric">
                <IconReceipt2 size={16} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.selectedCharges', { count: feeProgress.selected, total: feeProgress.total })}
                  </Text>
                  <Text size="sm" fw={800}>
                    {otherLines.length} {t('quotations.otherFees')}
                  </Text>
                </div>
              </div>
            </div>
          </Group>
        </div>

        <div className="rfq-form-layout">
          <div className="rfq-form-main">
            {isRevise && sourceQuotation?.reject_reason ? (
              <Alert
                color="red"
                icon={<IconAlertTriangle size={16} />}
                title={t('quotations.reviseFromRejectedBanner')}
                mb="md"
              >
                {sourceQuotation.reject_reason}
              </Alert>
            ) : null}

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.setupSection')}</Text>
                <Text size="xs" c="dimmed">
                  {scopeSummary}
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="md">
                <TextInput
                  label={t('quotations.customer')}
                  placeholder={t('quotations.customerPlaceholder')}
                  value={customerRef}
                  onChange={(event) => setCustomerRef(event.currentTarget.value)}
                />
                <Select
                  label={t('quotations.incoterm')}
                  data={incotermOptions}
                  value={incoterm}
                  onChange={setIncoterm}
                  searchable
                />
                <Select label={t('quotations.mode')} data={quotationModeOptions} value={mode} onChange={setMode} />
                <Select
                  label={t('quotations.currency')}
                  data={currencyOptions}
                  value={currency}
                  onChange={setCurrency}
                  searchable
                />
              </SimpleGrid>
            </section>

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Group justify="space-between" align="flex-start" gap="sm">
                  <div>
                    <Text fw={800}>{t('quotations.mandatoryFees')}</Text>
                    <Text size="xs" c="dimmed">
                      {t('quotations.optionalChargesHint')}
                    </Text>
                  </div>
                  <Text size="xs" fw={700} c="dimmed" className="tabular-nums">
                    {feeProgress.selected}/{feeProgress.total}
                  </Text>
                </Group>
              </div>

              <div className="rfq-charge-board">
                {sections.map((section, index) => {
                  const rows: FeeRow[] = section.charges.map((chargeCode) => {
                    const line = getMandatoryLine(chargeCode.charge_code);
                    return {
                      key: chargeCode.charge_code,
                      label: chargeName(chargeCode),
                      subLabel: `${chargeCode.charge_code} / ${chargeCode.default_uom}`,
                      state: line,
                      enabled: line.enabled,
                    };
                  });
                  const isExpanded = expandedSections[section.id] ?? index === 0;
                  const selectedInSection = rows.filter((row) => row.enabled).length;
                  const sectionToggleLabel = isExpanded
                    ? t('quotations.collapseCharges')
                    : t('quotations.expandCharges');

                  return (
                    <div key={section.id} className="rfq-charge-group">
                      <div className="rfq-charge-group-head">
                        <Group justify="space-between" align="flex-start" gap="sm" wrap="nowrap">
                          <div>
                            <Text fw={800} size="sm">
                              {t(section.titleKey)}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {t('quotations.selectedCharges', { count: selectedInSection, total: rows.length })}
                            </Text>
                          </div>
                          <Tooltip label={sectionToggleLabel}>
                            <ActionIcon
                              aria-expanded={isExpanded}
                              aria-label={sectionToggleLabel}
                              className="rfq-breakdown-toggle"
                              variant="light"
                              onClick={() =>
                                setExpandedSections((current) => ({
                                  ...current,
                                  [section.id]: !isExpanded,
                                }))
                              }
                            >
                              <IconChevronDown
                                className={isExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'}
                                size={18}
                              />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </div>
                      <Collapse expanded={isExpanded}>
                        <div className="rfq-charge-grid">
                          <QuotationFeeTable
                            rows={rows}
                            chargeCodeOptions={chargeCodeOptions}
                            uoms={uoms}
                            currency={currency}
                            onToggle={toggleMandatory}
                            onChange={updateMandatory}
                          />
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.otherFees')}</Text>
              </div>

              <Group gap="xs" mt="md" mb="md" wrap="wrap" className="rfq-chip-row">
                {CHARGE_GROUPS.map((g) => (
                  <Chip
                    key={g.value}
                    checked={otherGroup === g.value}
                    onChange={() => setOtherGroup(g.value)}
                    size="sm"
                    variant="outline"
                  >
                    {t(g.labelKey)}
                  </Chip>
                ))}
              </Group>

              <Stack gap="sm">
                {otherLines.length === 0 ? (
                  <div className="rfq-empty-lines">
                    <Text size="sm" c="dimmed">
                      {t('quotations.noOtherFees')}
                    </Text>
                  </div>
                ) : (
                  <QuotationFeeTable
                    rows={otherLines.map((line) => ({
                      key: line.uid,
                      label: null,
                      state: line,
                      enabled: true,
                    }))}
                    chargeCodeOptions={filteredChargeCodeOptions}
                    uoms={uoms}
                    currency={currency}
                    editableFee
                    removable
                    onChange={updateOtherLine}
                    onRemove={removeOtherLine}
                  />
                )}
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addOtherLine}
                  className="rfq-add-fee-button"
                >
                  {t('quotations.addFee')}
                </Button>
              </Stack>
            </section>
          </div>

          <aside className="rfq-form-rail">
            <div className="rfq-total-card">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                    {t('quotations.computedTotal')}
                  </Text>
                  <Text fw={900} size="xl" className="tabular-nums">
                    {formatCurrencyAmount(totals.grandTotal)}
                  </Text>
                </div>
                <div className="rfq-total-icon">
                  <IconWallet size={18} />
                </div>
              </Group>
            </div>

            <div className="rfq-summary-list">
              <div className="rfq-summary-row">
                <IconWallet size={15} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.subtotal')}
                  </Text>
                  <Text size="sm" fw={700} className="tabular-nums">
                    {formatCurrencyAmount(totals.subtotal)}
                  </Text>
                </div>
              </div>
              <div className="rfq-summary-row">
                <IconReceipt2 size={15} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.estimatedTax')}
                  </Text>
                  <Text size="sm" fw={700} className="tabular-nums">
                    {formatCurrencyAmount(totals.estimatedTax)}
                  </Text>
                </div>
              </div>
              <div className="rfq-summary-row">
                <IconRoute size={15} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.incoterm')} / {t('quotations.mode')}
                  </Text>
                  <Text size="sm" fw={700}>
                    {incoterm ?? '-'} / {mode ?? '-'}
                  </Text>
                </div>
              </div>
              <div className="rfq-summary-row">
                <IconReceipt2 size={15} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.mandatoryFees')}
                  </Text>
                  <Text size="sm" fw={700} className="tabular-nums">
                    {t('quotations.selectedCharges', { count: feeProgress.selected, total: feeProgress.total })}
                  </Text>
                </div>
              </div>
              <div className="rfq-summary-row">
                <IconPlus size={15} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.otherFees')}
                  </Text>
                  <Text size="sm" fw={700} className="tabular-nums">
                    {otherLines.length}
                  </Text>
                </div>
              </div>
            </div>

            {!canSubmit ? (
              <Text size="xs" c="dimmed" className="rfq-submit-hint">
                {t('quotations.enterAtLeastOneFee')}
              </Text>
            ) : null}

            <Group justify="flex-end" className="rfq-rail-actions" grow>
              <Button variant="default" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
              <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {submitLabel}
              </Button>
            </Group>
          </aside>

          <div className="rfq-mobile-submit-bar" aria-label={t('quotations.computedTotal')}>
            <div>
              <Text size="xs" c="dimmed" fw={800}>
                {t('quotations.computedTotal')}
              </Text>
              <Text fw={900} size="sm" className="tabular-nums">
                {formatCurrencyAmount(totals.grandTotal)}
              </Text>
            </div>
            <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </Paper>
    </Stack>
  );
}
