import {
  Button,
  Chip,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { fetchChargeCodes, type ChargeCode } from '@shared/api/chargeCodes';
import { createQuotation, type QuotationChargeLinePayload, type QuotationV1 } from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchUoms } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORY_GROUPS } from '@shared/lib/chargeCategories';
import { chargeCodeToType, getChargeFields, groupLabelKey, incotermToGroup } from '@shared/lib/quotationCharges';
import { useTradeMasterDataOptions } from '@shared/hooks/useTradeMasterDataOptions';

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
};

type MandatoryLineState = ChargeLineState & { enabled: boolean };

type OtherLine = ChargeLineState & { uid: string };

let uidCounter = 0;
function nextUid() {
  return `other-${++uidCounter}`;
}

export function QuotationForm({ onCancel, onCreated }: QuotationFormProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { incotermOptions, currencyOptions } = useTradeMasterDataOptions();

  const [customerRef, setCustomerRef] = useState('');
  const [incoterm, setIncoterm] = useState<string | null>('FOB');
  const [mode, setMode] = useState<string | null>('SEA_FCL');
  const [currency, setCurrency] = useState<string | null>('USD');

  // mandatory: keyed by catalog field.code
  const [mandatory, setMandatory] = useState<Record<string, MandatoryLineState>>({});
  // other/arising lines
  const [otherLines, setOtherLines] = useState<OtherLine[]>([]);
  // group filter for "other" section (default ANCILLARY)
  const [otherGroup, setOtherGroup] = useState<string>('ANCILLARY');

  const group = incotermToGroup(incoterm);
  const shippingMode = toShippingMode(mode);
  const sections = useMemo(() => getChargeFields(group, shippingMode), [group, shippingMode]);

  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });
  const chargeCodes = chargeCodesQuery.data?.data ?? [];

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
    const filtered = chargeCodes.filter((c) => c.category === otherGroup);
    const unique = Array.from(new Map(filtered.map((c) => [c.charge_code, c])).values());
    return unique.map((c) => ({ label: `${c.charge_code} - ${c.charge_name_en}`, value: c.charge_code }));
  }, [chargeCodes, otherGroup]);

  function findChargeCode(code: string | null | undefined): ChargeCode | null {
    return chargeCodes.find((c) => c.charge_code === code) ?? null;
  }

  function defaultCodeForField(fieldCode: string, chargeType: QuotationChargeLinePayload['charge_type']) {
    const fieldMap: Record<string, string> = {
      ORIGIN_PER_BL: 'EXD',
      ORIGIN_MAIN: 'PRE',
      DO_FEE: 'DOF',
      HANDLING: 'HDL',
      THC: 'DTH',
      CFS: 'DTL',
      CIC: 'DPC',
      EMC_EMF: 'LSS',
      CLEANING: 'CLN',
      CUSTOMS: 'IMC',
      TRUCKING: 'LMD',
      LOWERING: 'LOL',
      UNLOADING: 'HDL',
    };
    if (fieldCode === 'CARRIER_FREIGHT') {
      if (shippingMode === 'AIR') return 'AFR';
      if (shippingMode === 'LCL') return 'OFL';
      return 'OFR';
    }
    const typeMap: Partial<Record<QuotationChargeLinePayload['charge_type'], string>> = {
      AIR_FREIGHT: 'AFR',
      OCEAN_FREIGHT: shippingMode === 'LCL' ? 'OFL' : 'OFR',
      ORIGIN_CHARGE: 'PRE',
      CUSTOMS_FEE: 'IMC',
      TRUCKING: 'LMD',
      DO_FEE: 'DOF',
      HANDLING: 'HDL',
    };
    const code = fieldMap[fieldCode] ?? typeMap[chargeType] ?? 'HDL';
    return chargeCodes.some((c) => c.charge_code === code) ? code : (chargeCodes[0]?.charge_code ?? null);
  }

  const getMandatoryLine = useCallback(
    (fieldCode: string, chargeType: QuotationChargeLinePayload['charge_type']): MandatoryLineState => {
      if (mandatory[fieldCode]) return mandatory[fieldCode];
      const defaultCode = defaultCodeForField(fieldCode, chargeType);
      const cc = findChargeCode(defaultCode);
      return { enabled: false, ...seedLineState(cc), chargeCode: defaultCode };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mandatory, chargeCodes, shippingMode],
  );

  function updateMandatory(fieldCode: string, patch: Partial<MandatoryLineState>) {
    setMandatory((prev) => ({
      ...prev,
      [fieldCode]: { ...getMandatoryLine(fieldCode, 'HANDLING'), ...prev[fieldCode], ...patch },
    }));
  }

  function toggleMandatory(fieldCode: string, chargeType: QuotationChargeLinePayload['charge_type'], enabled: boolean) {
    const current = getMandatoryLine(fieldCode, chargeType);
    if (enabled && !current.chargeCode) {
      const defaultCode = defaultCodeForField(fieldCode, chargeType);
      const cc = findChargeCode(defaultCode);
      setMandatory((prev) => ({
        ...prev,
        [fieldCode]: { ...seedLineState(cc), chargeCode: defaultCode, enabled: true },
      }));
    } else {
      setMandatory((prev) => ({
        ...prev,
        [fieldCode]: { ...current, enabled },
      }));
    }
  }

  function addOtherLine() {
    // Default to first option in filtered list
    const defaultCode = filteredChargeCodeOptions[0]?.value ?? null;
    const cc = findChargeCode(defaultCode);
    setOtherLines((prev) => [...prev, { uid: nextUid(), ...seedLineState(cc), chargeCode: defaultCode }]);
  }

  function updateOtherLine(uid: string, patch: Partial<ChargeLineState>) {
    setOtherLines((prev) =>
      prev.map((line) => {
        if (line.uid !== uid) return line;
        const updated = { ...line, ...patch };
        // When charge_code changes, reseed unit from its default_uom
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

  const subtotal = useMemo(() => {
    const mandatorySum = sections
      .flatMap((s) => s.fields)
      .reduce<number>((sum, field) => {
        const line = getMandatoryLine(field.code, field.charge_type);
        if (!line.enabled) return sum;
        const val = Number(line.unitPrice);
        const qty = Number(line.quantity);
        return sum + (Number.isFinite(val) && Number.isFinite(qty) ? qty * val : 0);
      }, 0);

    const otherSum = otherLines.reduce<number>((sum, line) => {
      const val = Number(line.unitPrice);
      const qty = Number(line.quantity);
      return sum + (Number.isFinite(val) && Number.isFinite(qty) ? qty * val : 0);
    }, 0);

    return mandatorySum + otherSum;
  }, [sections, mandatory, otherLines, getMandatoryLine]);

  const canSubmit = Boolean(incoterm && mode && currency && subtotal > 0);

  const createMutation = useMutation({
    mutationFn: () => {
      const mandatoryLines: QuotationChargeLinePayload[] = sections
        .flatMap((s) => s.fields)
        .flatMap((field) => {
          const line = getMandatoryLine(field.code, field.charge_type);
          if (!line.enabled || !(Number(line.unitPrice) > 0)) return [];
          const cc = findChargeCode(line.chargeCode);
          const entry: QuotationChargeLinePayload = {
            line_no: 0,
            charge_type: field.charge_type,
            charge_code: line.chargeCode ?? cc?.charge_code,
            description: cc?.charge_name_en ?? t(field.labelKey),
            quantity: Number(line.quantity) || 1,
            unit: line.unit ?? cc?.default_uom ?? field.unit,
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
            charge_type: chargeCodeToType(line.chargeCode ?? ''),
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

      const chargeLines = [...mandatoryLines, ...otherChargeLines].map((l, i) => ({
        ...l,
        line_no: i + 1,
      }));

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

  return (
    <Stack gap="lg">
      <Group gap="xs" align="center">
        <Button variant="subtle" size="sm" leftSection={<IconArrowLeft size={16} />} onClick={onCancel}>
          {t('common.backToList')}
        </Button>
      </Group>

      <Paper withBorder p="lg">
        <Title order={3}>{t('quotations.formTitle')}</Title>
        <Text c="dimmed" size="sm" mt={4}>
          {t('quotations.formSubtitle')}
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
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

        <Text size="xs" c="dimmed" mt="sm">
          {t('quotations.incotermsGroup')}: {t(groupLabelKey(group))}
        </Text>
      </Paper>

      {/* Mandatory fees */}
      <Paper withBorder p="lg">
        <Title order={4} mb="sm">{t('quotations.mandatoryFees')}</Title>
        <Text size="xs" c="dimmed" mb="md">{t('quotations.optionalChargesHint')}</Text>
        <Stack gap="md">
          {sections.map((section) => {
            const rows: FeeRow[] = section.fields.map((field) => {
              const line = getMandatoryLine(field.code, field.charge_type);
              return {
                key: field.code,
                label: line.chargeCode ? `${t(field.labelKey)} · ${line.chargeCode}` : t(field.labelKey),
                state: line,
                enabled: line.enabled,
              };
            });

            return (
              <Stack key={section.id} gap="xs">
                <Text fw={600} size="sm">{t(section.titleKey)}</Text>
                <QuotationFeeTable
                  rows={rows}
                  chargeCodeOptions={chargeCodeOptions}
                  uoms={uoms}
                  currency={currency}
                  onToggle={(key, enabled) => {
                    const field = section.fields.find((candidate) => candidate.code === key);
                    if (field) toggleMandatory(key, field.charge_type, enabled);
                  }}
                  onChange={updateMandatory}
                />
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      {/* Other / arising fees */}
      <Paper withBorder p="lg">
        <Title order={4} mb="sm">{t('quotations.otherFees')}</Title>

        <Group gap="xs" mb="md" wrap="wrap">
          {CHARGE_CATEGORY_GROUPS.map((g) => (
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
            <Text size="sm" c="dimmed">{t('quotations.noOtherFees')}</Text>
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
            style={{ alignSelf: 'flex-start' }}
          >
            {t('quotations.addFee')}
          </Button>
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Group justify="space-between">
          <Text fw={700}>{t('quotations.computedTotal')}</Text>
          <Text fw={700} className="tabular-nums">
            {new Intl.NumberFormat('en-US').format(Math.round(subtotal))} {currency}
          </Text>
        </Group>
        {!canSubmit ? (
          <Text size="xs" c="dimmed" mt="xs">
            {t('quotations.enterAtLeastOneFee')}
          </Text>
        ) : null}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!canSubmit} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            {t('quotations.create')}
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
