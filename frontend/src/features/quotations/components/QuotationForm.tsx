import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Collapse,
  Group,
  NumberInput,
  Paper,
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
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import {
  createQuotationOption,
  createQuotationVersion,
  type CreateQuotationOptionPayload,
  type QuotationChargeGroup,
  type QuotationChargeLinePayload,
  type QuotationOptionV1,
  type QuotationV1,
} from '@shared/api/quotations';
import { createQuotationFromRequest, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useExchangeRates } from '@shared/hooks/useExchangeRates';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';
import { useI18n } from '@shared/i18n';
import { QUOTATION_CHARGE_GROUPS } from '@shared/lib/quotationChargeGroups';
import { chargeCodeToChargeType } from '@shared/lib/quotationCharges';
import { formatMoney } from '@shared/utils/money';

import { summarizeByCurrency } from '../model/quotationCurrency';
import { toShippingMode } from '../model/quotationModel';
import { type ChargeLineState, type FeeRow, QuotationFeeTable, seedLineState } from './QuotationFeeTable';
import { hasMinimumOptions, QuotationOptionsTable } from './QuotationOptionsTable';

type QuotationFormProps = {
  onCancel: () => void;
  onCreated: (quotation: QuotationV1) => void;
  sourceQuotation?: QuotationV1;
  rfq?: QuotationRequestV1;
};

type GroupLine = ChargeLineState & { uid: string };
type GroupLines = Record<QuotationChargeGroup, GroupLine[]>;
type DraftQuotationOption = CreateQuotationOptionPayload & {
  id: string;
  option_no: number;
  is_selected: boolean;
};

const EMPTY_CHARGE_CODES: ChargeCode[] = [];
let uidCounter = 0;

function nextUid() {
  uidCounter += 1;
  return `fee-${uidCounter}`;
}

function emptyGroups(): GroupLines {
  return { FREIGHT: [], ORIGIN: [], DESTINATION: [] };
}

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === '' || value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function seedGroupsFromQuotation(quotation: QuotationV1 | undefined): GroupLines {
  const groups = emptyGroups();

  for (const line of quotation?.charge_lines ?? []) {
    const group = line.charge_group ?? 'FREIGHT';
    groups[group].push({
      uid: nextUid(),
      chargeCode: line.charge_code ?? null,
      quantity: String(line.quantity ?? 1),
      unit: line.unit ?? null,
      unitPrice: line.unit_price == null ? '' : String(line.unit_price),
      currency: line.currency_code ?? null,
    });
  }

  return groups;
}

function ReadOnlyContext({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rfq-scope-field">
      <Text size="xs" c="dimmed" fw={700} mb={4}>
        {label}
      </Text>
      <Text size="sm" fw={800}>
        {value}
      </Text>
    </div>
  );
}

export function QuotationForm({ onCancel, onCreated, rfq, sourceQuotation }: QuotationFormProps) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const { currencyOptions } = useTradeMasterDataOptions();
  const { rateToVnd } = useExchangeRates();
  const isRevise = Boolean(sourceQuotation);

  const header = {
    customer: sourceQuotation?.customer_ref ?? rfq?.customer_ref ?? '-',
    supplier:
      sourceQuotation?.supplier?.supplier_name ??
      sourceQuotation?.supplier_id ??
      rfq?.supplier?.supplier_name ??
      rfq?.supplier_id ??
      '-',
    origin: sourceQuotation?.origin_port ?? rfq?.origin_port ?? '-',
    destination: sourceQuotation?.destination_port ?? rfq?.destination_port ?? '-',
    mode: sourceQuotation?.mode ?? rfq?.mode ?? '-',
    incoterm: sourceQuotation?.incoterm_code ?? rfq?.incoterm_code ?? '-',
    rfqId: sourceQuotation?.rfq_id ?? rfq?.id ?? null,
  };
  const shippingMode = toShippingMode(header.mode);

  const [validUntil, setValidUntil] = useState(sourceQuotation?.valid_until?.slice(0, 10) ?? '');
  const [groups, setGroups] = useState<GroupLines>(() => seedGroupsFromQuotation(sourceQuotation));
  const [expanded, setExpanded] = useState<Record<QuotationChargeGroup, boolean>>({
    FREIGHT: true,
    ORIGIN: false,
    DESTINATION: false,
  });

  const [draftOptions, setDraftOptions] = useState<DraftQuotationOption[]>(
    (sourceQuotation?.options ?? []).map((option) => ({
      id: option.id,
      option_no: option.option_no,
      carrier_code: option.carrier_code,
      carrier_name: option.carrier_name,
      vessel_or_flight: option.vessel_or_flight,
      voyage_flight_no: option.voyage_flight_no,
      etd: option.etd,
      eta: option.eta,
      transit_time_days: option.transit_time_days,
      risk_warning: option.risk_warning,
      headline_amount: Number(option.headline_amount ?? 0),
      is_recommended: option.is_recommended,
      is_selected: option.is_selected,
    })),
  );
  const [optionCarrier, setOptionCarrier] = useState('');
  const [optionVessel, setOptionVessel] = useState('');
  const [optionEtd, setOptionEtd] = useState('');
  const [optionEta, setOptionEta] = useState('');
  const [optionTransitDays, setOptionTransitDays] = useState<number | string>('');
  const [optionRisk, setOptionRisk] = useState('');
  const [optionAmount, setOptionAmount] = useState<number | string>('');

  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });
  const chargeCodes = chargeCodesQuery.data?.data ?? EMPTY_CHARGE_CODES;

  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ limit: 200, is_active: true }),
    queryFn: () => fetchUoms({ limit: 200, is_active: true }),
  });
  const uoms = uomsQuery.data?.data ?? [];

  const chargeCodeOptions = useMemo(() => {
    const unique = Array.from(new Map(chargeCodes.map((chargeCode) => [chargeCode.charge_code, chargeCode])).values());
    return unique.map((chargeCode) => ({
      label: `${chargeCode.charge_code} - ${chargeCode.charge_name_en}`,
      value: chargeCode.charge_code,
    }));
  }, [chargeCodes]);

  function findChargeCode(code: string | null | undefined) {
    return chargeCodes.find((chargeCode) => chargeCode.charge_code === code) ?? null;
  }

  function addLine(group: QuotationChargeGroup) {
    setGroups((current) => ({
      ...current,
      [group]: [...current[group], { uid: nextUid(), ...seedLineState(null) }],
    }));
  }

  function updateLine(group: QuotationChargeGroup, uid: string, patch: Partial<ChargeLineState>) {
    setGroups((current) => ({
      ...current,
      [group]: current[group].map((line) => {
        if (line.uid !== uid) return line;
        const updated = { ...line, ...patch };
        if (patch.chargeCode !== undefined && patch.chargeCode !== line.chargeCode) {
          updated.unit = findChargeCode(patch.chargeCode)?.default_uom ?? updated.unit;
        }
        return updated;
      }),
    }));
  }

  function removeLine(group: QuotationChargeGroup, uid: string) {
    setGroups((current) => ({ ...current, [group]: current[group].filter((line) => line.uid !== uid) }));
  }

  const allLines = useMemo(
    () => QUOTATION_CHARGE_GROUPS.flatMap((group) => groups[group.value].map((line) => ({ group: group.value, line }))),
    [groups],
  );

  const currencySummary = useMemo(() => {
    const summaryLines = allLines.map(({ line }) => {
      const amount = Number(line.quantity) * Number(line.unitPrice);
      const chargeCode = findChargeCode(line.chargeCode);
      return {
        currency: line.currency,
        amount: Number.isFinite(amount) ? amount : 0,
        taxable: Boolean(chargeCode?.taxable),
      };
    });
    return summarizeByCurrency(summaryLines, rateToVnd);
    // chargeCodes affects findChargeCode and is intentionally tracked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLines, chargeCodes, rateToVnd]);
  const primarySubtotal = currencySummary.byCurrency[0] ?? null;
  const referenceCurrency = currencySummary.byCurrency.find((row) => row.currency !== 'VND')?.currency ?? 'USD';
  const referenceRate = rateToVnd(referenceCurrency);

  const pricedLineCount = allLines.filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0).length;
  const filledLineCount = allLines.filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0 && line.currency).length;
  const hasPricedLineMissingCurrency = pricedLineCount > filledLineCount;
  const canSubmit = filledLineCount > 0 && !hasPricedLineMissingCurrency;

  function buildChargeLines(): QuotationChargeLinePayload[] {
    return allLines
      .filter(({ line }) => line.chargeCode && Number(line.unitPrice) > 0 && line.currency)
      .map(({ group, line }, index) => {
        const chargeCode = findChargeCode(line.chargeCode);
        return {
          line_no: index + 1,
          charge_type: chargeCode ? chargeCodeToChargeType(chargeCode, shippingMode) : 'OTHER',
          charge_code: line.chargeCode,
          charge_group: group,
          currency_code: line.currency,
          description: chargeCode
            ? language === 'vi' && chargeCode.charge_name_vn
              ? chargeCode.charge_name_vn
              : chargeCode.charge_name_en
            : line.chargeCode ?? '',
          quantity: Number(line.quantity) || 1,
          unit: line.unit ?? chargeCode?.default_uom ?? 'SET',
          unit_price: Number(line.unitPrice),
          tax_rate: chargeCode?.taxable ? 10 : 0,
          note: chargeCode ? `Rev/Cost: ${chargeCode.rev_cost}` : null,
        };
      });
  }

  function addDraftOption() {
    setDraftOptions((current) => [
      ...current,
      {
        id: `draft-option-${Date.now()}`,
        option_no: current.length + 1,
        carrier_code: optionCarrier.trim() || null,
        carrier_name: optionCarrier.trim() || null,
        vessel_or_flight: optionVessel.trim() || null,
        voyage_flight_no: null,
        etd: optionEtd || null,
        eta: optionEta || null,
        transit_time_days: numberOrNull(optionTransitDays),
        risk_warning: optionRisk.trim() || null,
        headline_amount: numberOrNull(optionAmount),
        is_recommended: current.length === 0,
        is_selected: false,
      },
    ]);
    setOptionCarrier('');
    setOptionVessel('');
    setOptionEtd('');
    setOptionEta('');
    setOptionTransitDays('');
    setOptionRisk('');
    setOptionAmount('');
  }

  function removeDraftOption(option: QuotationOptionV1) {
    setDraftOptions((current) =>
      current.filter((item) => item.id !== option.id).map((item, index) => ({ ...item, option_no: index + 1 })),
    );
  }

  function toTableOption(option: DraftQuotationOption): QuotationOptionV1 {
    return {
      id: option.id,
      quotation_id: sourceQuotation?.id ?? 'draft',
      option_no: option.option_no,
      carrier_code: option.carrier_code ?? null,
      carrier_name: option.carrier_name ?? null,
      vessel_or_flight: option.vessel_or_flight ?? null,
      voyage_flight_no: option.voyage_flight_no ?? null,
      etd: option.etd ?? null,
      eta: option.eta ?? null,
      transit_time_days: option.transit_time_days ?? null,
      risk_warning: option.risk_warning ?? null,
      headline_amount: option.headline_amount ?? null,
      is_recommended: Boolean(option.is_recommended),
      is_selected: Boolean(option.is_selected),
    };
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const chargeLines = buildChargeLines();
      const quotation = isRevise
        ? await createQuotationVersion(sourceQuotation!.id, {
          status: 'DRAFT',
          currency_code: null,
          valid_until: validUntil || null,
          charge_lines: chargeLines,
        })
        : await createQuotationFromRequest(rfq!.id, {
          currency_code: null,
          valid_until: validUntil || null,
          charge_lines: chargeLines,
        });

      for (const option of draftOptions) {
        await createQuotationOption(quotation.id, {
          carrier_code: option.carrier_code,
          carrier_name: option.carrier_name,
          vessel_or_flight: option.vessel_or_flight,
          voyage_flight_no: option.voyage_flight_no,
          etd: option.etd,
          eta: option.eta,
          transit_time_days: option.transit_time_days,
          risk_warning: option.risk_warning,
          headline_amount: option.headline_amount,
          is_recommended: option.is_recommended,
        });
      }

      return quotation;
    },
    onSuccess: (quotation) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationOptions(quotation.id) });
      onCreated(quotation);
    },
  });

  const formTitle = isRevise ? t('quotations.reviseTitle') : t('quotations.formTitle');
  const formSubtitle = isRevise ? t('quotations.reviseSubtitle') : t('quotations.createFromRfqOnly');
  const submitLabel = t('quotations.actionResubmit');

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
                    {t('quotations.rfqContext')}
                  </Text>
                  <Text size="sm" fw={800}>
                    {header.incoterm} / {header.mode}
                  </Text>
                </div>
              </div>
              <div className="rfq-form-hero-metric">
                <IconReceipt2 size={16} />
                <div>
                  <Text size="xs" c="dimmed">
                    {t('quotations.chargeLinesCount', { count: filledLineCount })}
                  </Text>
                  <Text size="sm" fw={800}>
                    {primarySubtotal ? formatMoney(primarySubtotal.total, primarySubtotal.currency) : '-'}
                  </Text>
                </div>
              </div>
            </div>
          </Group>
        </div>

        <div className="rfq-form-layout">
          <div className="rfq-form-main">
            {isRevise && sourceQuotation?.reject_reason ? (
              <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotations.reviseFromRejectedBanner')} mb="md">
                {sourceQuotation.reject_reason}
              </Alert>
            ) : null}

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.rfqContext')}</Text>
              </div>
              <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md" spacing="md" className="rfq-setup-grid">
                <ReadOnlyContext label={t('quotations.customer')} value={header.customer} />
                <ReadOnlyContext label={t('quotationRequests.field.supplier')} value={header.supplier} />
                <ReadOnlyContext label={t('quotationRequests.field.route')} value={`${header.origin} -> ${header.destination}`} />
                <ReadOnlyContext label={t('quotations.mode')} value={header.mode} />
                <ReadOnlyContext label={t('quotations.incoterm')} value={header.incoterm} />
                <ReadOnlyContext
                  label={t('quotations.rfqLink')}
                  value={
                    header.rfqId ? (
                      <Anchor component={Link} to={`/quotation-requests?view=${header.rfqId}`}>
                        {header.rfqId}
                      </Anchor>
                    ) : (
                      '-'
                    )
                  }
                />
                <TextInput
                  className="rfq-scope-field"
                  label={t('quotations.validUntil')}
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.currentTarget.value)}
                />
              </SimpleGrid>
            </section>

            <section className="rfq-form-section">
              <div className="rfq-section-head">
                <Text fw={800}>{t('quotations.options')}</Text>
                <Text size="xs" c="dimmed" className="rfq-section-summary">
                  {t('quotations.optionsHint')}
                </Text>
              </div>
              {!hasMinimumOptions(draftOptions) ? (
                <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mt="md">
                  {t('quotations.minimumOptionsWarning')}
                </Alert>
              ) : null}
              <SimpleGrid cols={{ base: 1, md: 4 }} mt="md" spacing="md">
                <TextInput label={t('quotations.carrier')} value={optionCarrier} onChange={(event) => setOptionCarrier(event.currentTarget.value)} />
                <TextInput label={t('quotations.vesselOrFlight')} value={optionVessel} onChange={(event) => setOptionVessel(event.currentTarget.value)} />
                <TextInput type="date" label={t('quotations.etd')} value={optionEtd} onChange={(event) => setOptionEtd(event.currentTarget.value)} />
                <TextInput type="date" label={t('quotations.eta')} value={optionEta} onChange={(event) => setOptionEta(event.currentTarget.value)} />
                <NumberInput label={t('quotations.transitDays')} value={optionTransitDays} onChange={setOptionTransitDays} min={0} />
                <NumberInput label={t('quotations.headlineAmount')} value={optionAmount} onChange={setOptionAmount} min={0} thousandSeparator="," />
                <TextInput label={t('quotations.riskWarning')} value={optionRisk} onChange={(event) => setOptionRisk(event.currentTarget.value)} />
                <Group align="flex-end">
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={addDraftOption}
                    disabled={!optionCarrier.trim() && !optionEtd}
                  >
                    {t('quotations.addOption')}
                  </Button>
                </Group>
              </SimpleGrid>
              <QuotationOptionsTable mode="edit" options={draftOptions.map(toTableOption)} onRemove={removeDraftOption} />
            </section>

            {QUOTATION_CHARGE_GROUPS.map((group) => {
              const lines = groups[group.value];
              const isExpanded = expanded[group.value];
              const rows: FeeRow[] = lines.map((line) => ({ key: line.uid, label: null, state: line, enabled: true }));

              return (
                <section className="rfq-form-section" key={group.value}>
                  <div className="rfq-charge-group" data-selected={lines.length > 0 ? 'true' : undefined}>
                    <div className="rfq-charge-group-head">
                      <Group justify="space-between" align="center" gap="sm" wrap="nowrap">
                        <Text fw={800} size="sm">
                          {t(group.labelKey)}
                        </Text>
                        <Group gap="xs" wrap="nowrap">
                          <Badge className="rfq-charge-count tabular-nums" color={lines.length > 0 ? 'teal' : 'gray'} variant="light">
                            {lines.length}
                          </Badge>
                          <Tooltip label={isExpanded ? t('quotations.collapseCharges') : t('quotations.expandCharges')}>
                            <ActionIcon
                              aria-expanded={isExpanded}
                              className="rfq-breakdown-toggle"
                              variant="light"
                              onClick={() => setExpanded((current) => ({ ...current, [group.value]: !isExpanded }))}
                            >
                              <IconChevronDown className={isExpanded ? 'rfq-breakdown-chevron is-open' : 'rfq-breakdown-chevron'} size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                    </div>
                    <Collapse expanded={isExpanded}>
                      <div className="rfq-charge-grid">
                        {rows.length > 0 ? (
                          <QuotationFeeTable
                            rows={rows}
                            chargeCodeOptions={chargeCodeOptions}
                            currencyOptions={currencyOptions}
                            uoms={uoms}
                            removable
                            onChange={(uid, patch) => updateLine(group.value, uid, patch)}
                            onRemove={(uid) => removeLine(group.value, uid)}
                          />
                        ) : (
                          <div className="rfq-empty-lines">
                            <Text size="sm" c="dimmed">
                              {t('quotations.noOtherFees')}
                            </Text>
                          </div>
                        )}
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          className="rfq-add-fee-button"
                          onClick={() => addLine(group.value)}
                        >
                          {t('quotations.addFee')}
                        </Button>
                      </div>
                    </Collapse>
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="rfq-form-rail">
            <div className="rfq-total-card">
              <Group justify="space-between" align="flex-start" gap="sm">
                <div>
                  <Text size="xs" tt="uppercase" fw={800} c="dimmed">
                    {t('quotations.subtotalsByCurrency')}
                  </Text>
                  {currencySummary.byCurrency.length > 0 ? (
                    <Stack gap={4} mt={6}>
                      {currencySummary.byCurrency.map((row) => (
                        <Group justify="space-between" gap="md" wrap="nowrap" key={row.currency}>
                          <Text size="sm" c="dimmed">
                            {t('quotations.subtotalPrefix')} {row.currency}
                          </Text>
                          <Text fw={900} className="tabular-nums">
                            {formatMoney(row.total, row.currency)}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text fw={900} size="xl" className="tabular-nums">
                      -
                    </Text>
                  )}
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('quotations.referenceRate')}: 1 {referenceCurrency} = {new Intl.NumberFormat('vi-VN').format(referenceRate)} VND
                  </Text>
                  {currencySummary.byCurrency.length > 1 ? (
                    <Text size="xs" c="dimmed">
                      {t('quotations.internalVndTotal')}: ≈ {formatMoney(currencySummary.internalVndTotal, 'VND')}
                    </Text>
                  ) : null}
                </div>
                <div className="rfq-total-icon">
                  <IconWallet size={18} />
                </div>
              </Group>
            </div>
            {!canSubmit ? (
              <Text size="xs" c="dimmed" className="rfq-submit-hint">
                {hasPricedLineMissingCurrency ? t('quotations.selectCurrencyForAllFees') : t('quotations.enterAtLeastOneFee')}
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
        </div>
      </Paper>
    </Stack>
  );
}
