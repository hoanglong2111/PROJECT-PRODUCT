import { Alert, Button, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createQuotationRequest,
  type CreateQuotationRequestContainerPayload,
  type CreateQuotationRequestLinePayload,
  type CreateQuotationRequestPackagePayload,
  type QuotationRequestV1,
} from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { DateField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { FormSection, SummaryTile } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import { ContainerListEditor } from './ContainerListEditor';
import { PackageListEditor } from './PackageListEditor';
import { useRfqMasterData } from '../hooks/useRfqMasterData';
import {
  isAirMode,
  newRfqContainer,
  newRfqContainerLine,
  newRfqPackage,
  newRfqPackageLine,
  rfqChargeableWeightKg,
  rfqContainersTotalWeight,
  rfqLclChargeableRevenueTon,
  rfqPackageCbm,
  rfqPackagesDimWeightKg,
  rfqPackagesTotals,
  rfqModeOptions,
  type RfqContainerDraft,
  type RfqPackageDraft,
} from '../model/quotationRequestModel';

const isFclMode = (mode?: string | null) => (mode ?? '').toUpperCase() === 'SEA_FCL';
type PackageModeKey = 'AIR' | 'SEA_LCL';
type PackagesByMode = Record<PackageModeKey, RfqPackageDraft[]>;
type ActivePackageIdByMode = Record<PackageModeKey, string | null>;

type Props = {
  onCancel: () => void;
  onCreated: (request: QuotationRequestV1) => void;
  source?: QuotationRequestV1;
};

const num = (value: unknown): number | null => {
  if (value === '' || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const textOrEmpty = (value: string | null | undefined) => value ?? '';

const numOrDefault = (value: unknown, fallback = 0) => num(value) ?? fallback;

type EffectiveLine = {
  item_id: string;
  item_description: string;
  qty: number;
  unit: string;
  unit_price: number;
  note: string;
};

function packagesToLines(packages: RfqPackageDraft[]): EffectiveLine[] {
  return packages.flatMap((pkg) => pkg.lines
    .filter((line) => line.item_id && Number(line.qty) > 0)
    .map((line) => ({
      item_id: line.item_id,
      item_description: line.item_description,
      qty: numOrDefault(line.qty, 1),
      unit: line.unit,
      unit_price: numOrDefault(line.unit_price),
      note: line.note,
    })));
}

function containersToLines(containers: RfqContainerDraft[]): EffectiveLine[] {
  return containers.flatMap((container) => container.lines
    .filter((line) => line.item_id && Number(line.qty) > 0)
    .map((line) => ({
      item_id: line.item_id,
      item_description: line.item_description,
      qty: numOrDefault(line.qty, 1),
      unit: line.unit,
      unit_price: numOrDefault(line.unit_price),
      note: line.note,
    })));
}

function sourcePackagesToDrafts(source?: QuotationRequestV1): RfqPackageDraft[] {
  if (source?.packages?.length) {
    const drafts = source.packages.map((pkg, index) => newRfqPackage(index, {
      package_type: pkg.package_type ?? '',
      length_cm: num(pkg.length_cm) ?? '',
      width_cm: num(pkg.width_cm) ?? '',
      height_cm: num(pkg.height_cm) ?? '',
      qty: numOrDefault(pkg.qty, 1),
      gross_weight_per_package_kg: num(pkg.gross_weight_per_package_kg) ?? '',
      lines: pkg.lines?.length
        ? pkg.lines.map((line) => newRfqPackageLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty: numOrDefault(line.qty, 1),
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          note: line.note ?? '',
        }))
        : [newRfqPackageLine()],
      note: pkg.note ?? '',
    }));
    const clientIdByPackageNo = new Map(source.packages.map((pkg, index) => [pkg.package_no, drafts[index].clientId]));
    source.packages.forEach((pkg, index) => {
      if (pkg.parent_package_no != null) {
        drafts[index].parent_client_id = clientIdByPackageNo.get(pkg.parent_package_no) ?? '';
      }
    });
    return drafts;
  }
  const legacyLines = source?.lines?.filter((line) => num(line.length_cm) && num(line.width_cm) && num(line.height_cm));
  if (legacyLines?.length) {
    return legacyLines.map((line, index) => {
      const qty = numOrDefault(line.qty, 1);
      const grossTotal = num(line.gross_weight_kg) ?? 0;
      return newRfqPackage(index, {
        package_type: '',
        length_cm: num(line.length_cm) ?? '',
        width_cm: num(line.width_cm) ?? '',
        height_cm: num(line.height_cm) ?? '',
        qty,
        gross_weight_per_package_kg: qty > 0 ? Number((grossTotal / qty).toFixed(3)) : '',
        lines: [newRfqPackageLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty,
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          note: line.note ?? '',
        })],
      });
    });
  }
  return [newRfqPackage(0)];
}

function packageModeKey(mode?: string | null): PackageModeKey {
  return isAirMode(mode) ? 'AIR' : 'SEA_LCL';
}

function sourcePackagesByModeToDrafts(source?: QuotationRequestV1): PackagesByMode {
  const sourceModeKey = packageModeKey(source?.mode);
  const sourceDrafts = sourcePackagesToDrafts(source);
  return {
    AIR: sourceModeKey === 'AIR' ? sourceDrafts : [newRfqPackage(0)],
    SEA_LCL: sourceModeKey === 'SEA_LCL' ? sourceDrafts : [newRfqPackage(0)],
  };
}

function sourceContainersToDrafts(source?: QuotationRequestV1): RfqContainerDraft[] {
  if (source?.containers?.length) {
    return source.containers.map((container) => newRfqContainer({
      container_type: container.container_type ?? '',
      qty: numOrDefault(container.qty, 1),
      lines: container.lines?.length
        ? container.lines.map((line) => newRfqContainerLine({
          item_id: line.item_id ?? '',
          item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
          qty: numOrDefault(line.qty, 1),
          unit: line.unit ?? line.item?.base_uom ?? '',
          unit_price: num(line.unit_price) ?? '',
          gross_weight_kg: num(line.gross_weight_kg) ?? '',
          note: line.note ?? '',
        }))
        : [newRfqContainerLine()],
    }));
  }
  if (source?.lines?.length) {
    return [newRfqContainer({
      container_type: source.container_type ?? '',
      qty: 1,
      lines: source.lines.map((line) => newRfqContainerLine({
        item_id: line.item_id ?? '',
        item_description: line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '',
        qty: numOrDefault(line.qty, 1),
        unit: line.unit ?? line.item?.base_uom ?? '',
        unit_price: num(line.unit_price) ?? '',
        gross_weight_kg: num(line.gross_weight_kg) ?? '',
        note: line.note ?? '',
      })),
    })];
  }
  if (source?.container_type) {
    return [newRfqContainer({ container_type: source.container_type, qty: 1 })];
  }
  return [newRfqContainer()];
}

export function QuotationRequestForm({ onCancel, onCreated, source }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const masterData = useRfqMasterData();

  const [customerRef, setCustomerRef] = useState(() => textOrEmpty(source?.customer_ref) || 'KBI');
  const [customerPoRef, setCustomerPoRef] = useState(() => textOrEmpty(source?.customer_po_ref));
  const [customerContractRef, setCustomerContractRef] = useState(() => textOrEmpty(source?.customer_contract_ref));
  const [supplierId, setSupplierId] = useState<string | null>(() => source?.supplier_id ?? null);
  const [incoterm, setIncoterm] = useState<string | null>(() => source?.incoterm_code ?? 'FOB');
  const [mode, setMode] = useState<string | null>(() => source?.mode ?? 'SEA_FCL');
  const [currency, setCurrency] = useState<string | null>(() => source?.currency_code ?? 'USD');
  const [originPort, setOriginPort] = useState(() => textOrEmpty(source?.origin_port));
  const [destinationPort, setDestinationPort] = useState(() => textOrEmpty(source?.destination_port) || 'Hai Phong (VNHPH)');
  const [readyDate, setReadyDate] = useState<string | null>(null);
  const [note, setNote] = useState(() => textOrEmpty(source?.note));
  const [packagesByMode, setPackagesByMode] = useState<PackagesByMode>(() => sourcePackagesByModeToDrafts(source));
  const [containers, setContainers] = useState<RfqContainerDraft[]>(() => sourceContainersToDrafts(source));
  const [activePackageIdByMode, setActivePackageIdByMode] = useState<ActivePackageIdByMode>({ AIR: null, SEA_LCL: null });
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);

  const selectedSupplier = masterData.suppliers.find((supplier) => supplier.id === supplierId);
  const fclMode = isFclMode(mode);
  const airMode = isAirMode(mode);
  const lclMode = !fclMode && !airMode;
  const activePackageMode = airMode ? 'AIR' : 'SEA_LCL';
  const packages = packagesByMode[activePackageMode];
  const activePackageId = activePackageIdByMode[activePackageMode];
  const packagesTotals = useMemo(() => rfqPackagesTotals(packages), [packages]);
  const { totalCbm, grossKg: packagesWeight } = packagesTotals;
  const containersWeight = useMemo(() => rfqContainersTotalWeight(containers), [containers]);
  const totalWeight = fclMode ? containersWeight : packagesWeight;
  const dimWeight = airMode ? rfqPackagesDimWeightKg(packages) : 0;
  const chargeableWeight = airMode ? rfqChargeableWeightKg(totalWeight, dimWeight) : 0;
  const chargeableRevenueTon = lclMode ? rfqLclChargeableRevenueTon(totalCbm, totalWeight) : 0;
  const effectiveLines = useMemo(
    () => (fclMode ? containersToLines(containers) : packagesToLines(packages)),
    [fclMode, containers, packages],
  );
  const requestTotal = effectiveLines.reduce((total, line) => total + line.qty * line.unit_price, 0);
  const cargoMetric = fclMode
    ? null
    : airMode
      ? {
        label: t('quotationRequests.field.chargeableWeight'),
        hint: t('quotationRequests.field.chargeableWeightHint'),
        value: `${Number(chargeableWeight.toFixed(3)).toLocaleString()} kg`,
      }
      : {
        label: t('quotationRequests.field.chargeableRevenueTon'),
        hint: t('quotationRequests.field.chargeableRevenueTonHint'),
        value: `${Number(chargeableRevenueTon.toFixed(3)).toLocaleString()} RT`,
      };
  const validLineCount = effectiveLines.length;
  const validPackageCount = packages.filter((pkg) => rfqPackageCbm(pkg) > 0).length;
  const validContainerCount = containers.filter((container) => container.container_type && Number(container.qty) > 0).length;
  const cargoValid = fclMode ? validContainerCount > 0 : validPackageCount > 0;
  const canSubmit = Boolean(
    customerRef.trim() && supplierId && incoterm && mode && currency && validLineCount > 0 && cargoValid,
  );

  const setActivePackageId = (clientId: string | null) => {
    setActivePackageIdByMode((current) => ({ ...current, [activePackageMode]: clientId }));
  };

  const updatePackage = (clientId: string, patch: Partial<RfqPackageDraft>) => {
    setPackagesByMode((current) => ({
      ...current,
      [activePackageMode]: current[activePackageMode].map((pkg) => (
        pkg.clientId === clientId ? { ...pkg, ...patch } : pkg
      )),
    }));
  };

  const addPackage = () => {
    const next = newRfqPackage(packages.length);
    setPackagesByMode((current) => ({
      ...current,
      [activePackageMode]: [...current[activePackageMode], next],
    }));
    setActivePackageId(next.clientId);
  };

  const removePackage = (clientId: string) => {
    setPackagesByMode((current) => {
      const currentPackages = current[activePackageMode];
      if (currentPackages.length === 1) return current;
      const next = currentPackages
        .filter((pkg) => pkg.clientId !== clientId)
        .map((pkg, index) => ({ ...pkg, package_no: index + 1 }));
      setActivePackageIdByMode((activeIds) => ({
        ...activeIds,
        [activePackageMode]: activeIds[activePackageMode] === clientId ? next[0]?.clientId ?? null : activeIds[activePackageMode],
      }));
      return { ...current, [activePackageMode]: next };
    });
  };

  const updateContainer = (clientId: string, patch: Partial<RfqContainerDraft>) => {
    setContainers((current) => current.map((container) => (container.clientId === clientId ? { ...container, ...patch } : container)));
  };

  const addContainer = () => {
    const next = newRfqContainer();
    setContainers((current) => [...current, next]);
    setActiveContainerId(next.clientId);
  };

  const removeContainer = (clientId: string) => {
    setContainers((current) => {
      if (current.length === 1) return current;
      const next = current.filter((container) => container.clientId !== clientId);
      setActiveContainerId((activeId) => (activeId === clientId ? next[0]?.clientId ?? null : activeId));
      return next;
    });
  };

  const packagesForPayload = packages.filter((pkg) => rfqPackageCbm(pkg) > 0);
  const packageNoByClientId = new Map(packagesForPayload.map((pkg, index) => [pkg.clientId, index + 1]));

  const createMutation = useMutation({
    mutationFn: () =>
      createQuotationRequest({
        customer_ref: customerRef.trim() || null,
        customer_po_ref: customerPoRef.trim() || null,
        customer_contract_ref: customerContractRef.trim() || null,
        supplier_id: supplierId,
        incoterm_code: incoterm,
        mode,
        currency_code: currency,
        origin_port: originPort.trim() || null,
        destination_port: destinationPort.trim() || null,
        desired_cargo_ready_date: readyDate,
        gross_weight_kg: totalWeight || null,
        volume_cbm: fclMode ? null : totalCbm || null,
        dim_weight_kg: airMode ? dimWeight || null : null,
        chargeable_weight_kg: airMode ? chargeableWeight || null : null,
        chargeable_revenue_ton: lclMode ? chargeableRevenueTon || null : null,
        container_type: fclMode ? containers[0]?.container_type.trim() || null : null,
        note: note.trim() || null,
        lines: effectiveLines.map<CreateQuotationRequestLinePayload>((line, index) => ({
          line_no: index + 1,
          item_id: line.item_id,
          item_description: line.item_description || null,
          qty: line.qty,
          unit: line.unit || null,
          unit_price: line.unit_price || null,
          note: line.note || null,
        })),
        packages: fclMode
          ? []
          : packagesForPayload.map<CreateQuotationRequestPackagePayload>((pkg, index) => ({
            package_no: index + 1,
            package_type: pkg.package_type,
            length_cm: num(pkg.length_cm),
            width_cm: num(pkg.width_cm),
            height_cm: num(pkg.height_cm),
            qty: numOrDefault(pkg.qty, 1),
            gross_weight_per_package_kg: num(pkg.gross_weight_per_package_kg),
            cbm: rfqPackageCbm(pkg) || null,
            lines: pkg.lines
              .filter((line) => line.item_id && Number(line.qty) > 0)
              .map((line, lineIndex) => ({
                line_no: lineIndex + 1,
                item_id: line.item_id,
                item_description: line.item_description || null,
                qty: numOrDefault(line.qty, 1),
                unit: line.unit || null,
                unit_price: num(line.unit_price),
                note: line.note || null,
              })),
            note: pkg.note || null,
            parent_package_no: pkg.parent_client_id ? packageNoByClientId.get(pkg.parent_client_id) ?? null : null,
          })),
        containers: fclMode
          ? containers
              .filter((container) => container.container_type && Number(container.qty) > 0)
              .map<CreateQuotationRequestContainerPayload>((container, index) => ({
                container_no: index + 1,
                container_type: container.container_type,
                qty: numOrDefault(container.qty, 1),
                lines: container.lines
                  .filter((line) => line.item_id && Number(line.qty) > 0)
                  .map((line, lineIndex) => ({
                    line_no: lineIndex + 1,
                    item_id: line.item_id,
                    item_description: line.item_description || null,
                    qty: numOrDefault(line.qty, 1),
                    unit: line.unit || null,
                    unit_price: num(line.unit_price),
                    gross_weight_kg: num(line.gross_weight_kg),
                    note: line.note || null,
                  })),
              }))
          : [],
      }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(request);
    },
  });

  return (
    <form
      className="purchase-order-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) createMutation.mutate();
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700} size="lg">
              {t('quotationRequests.formTitle')}
            </Text>
            <Text c="dimmed" size="sm">
              {t('quotationRequests.formSubtitle')}
            </Text>
            {source ? (
              <Text c="dimmed" size="xs" mt={2}>
                {t('quotationRequests.copiedFrom', { rfqNo: source.rfq_no })}
              </Text>
            ) : null}
          </div>
          <Group gap="xs">
            <Button type="button" variant="subtle" leftSection={<IconX size={16} />} onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || masterData.isLoading}
              disabled={!canSubmit}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              {t('common.save')}
            </Button>
          </Group>
        </Group>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>
            {(createMutation.error as Error).message}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <SummaryTile label={t('quotationRequests.field.customerRef')} value={customerRef || 'KBI'} />
          <SummaryTile label={t('quotationRequests.field.supplier')} value={selectedSupplier?.supplier_name ?? '-'} />
          <SummaryTile label={t('quotationRequests.field.incoterm')} value={incoterm ?? '-'} />
          {cargoMetric ? (
            <SummaryTile
              label={cargoMetric.label}
              hint={cargoMetric.hint}
              value={cargoMetric.value}
              tone="accent"
            />
          ) : null}
          <SummaryTile
            label={t('quotationRequests.totalCbm')}
            hint={t('quotationRequests.field.volumeDerivedHint')}
            value={Number(totalCbm.toFixed(4)).toLocaleString()}
          />
          <SummaryTile
            label={t('quotationRequests.field.requestTotalUsd')}
            value={requestTotal.toLocaleString()}
            tone="accent"
          />
        </SimpleGrid>

        <div className="purchase-order-form-core-grid">
          <FormSection
            title={t('quotationRequests.section.identification')}
            description={t('quotationRequests.section.identificationHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={t('quotationRequests.field.customerRef')}
                value={customerRef}
                onChange={(event) => setCustomerRef(event.currentTarget.value)}
                required
              />
              <TextInput
                label={t('quotationRequests.field.customerPoRef')}
                value={customerPoRef}
                onChange={(event) => setCustomerPoRef(event.currentTarget.value)}
              />
              <TextInput
                label={t('quotationRequests.field.customerContractRef')}
                value={customerContractRef}
                onChange={(event) => setCustomerContractRef(event.currentTarget.value)}
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title={t('quotationRequests.section.commercial')}
            description={t('quotationRequests.section.commercialHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label={t('quotationRequests.field.supplier')}
                data={masterData.supplierOptions}
                value={supplierId}
                searchable
                required
                onChange={(value) => {
                  const supplier = masterData.suppliers.find((item) => item.id === value);
                  setSupplierId(value);
                  setCurrency(supplier?.default_currency_code ?? currency);
                  setIncoterm(supplier?.default_incoterm_code ?? incoterm);
                }}
              />
              <Select
                label={t('quotationRequests.field.incoterm')}
                data={masterData.incotermOptions}
                value={incoterm}
                onChange={setIncoterm}
                searchable
                required
              />
              <Select label={t('quotationRequests.field.mode')} data={rfqModeOptions} value={mode} onChange={setMode} required />
              <Select
                label={t('quotations.currency')}
                data={masterData.currencyOptions}
                value={currency}
                onChange={setCurrency}
                searchable
                required
              />
            </SimpleGrid>
          </FormSection>

          <FormSection
            title={t('quotationRequests.section.logistics')}
            description={t('quotationRequests.section.logisticsHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label={<HeaderLabel label={t('quotations.originPort')} hint={t('quotations.originPortHint')} />}
                description={`${t('purchaseOrders.originCountry')}: ${selectedSupplier?.country ?? '-'}`}
                value={originPort}
                onChange={(event) => setOriginPort(event.currentTarget.value)}
              />
              <TextInput
                label={<HeaderLabel label={t('quotations.destinationPort')} hint={t('quotations.destinationPortHint')} />}
                description={`${t('purchaseOrders.destinationCountry')}: VN`}
                value={destinationPort}
                onChange={(event) => setDestinationPort(event.currentTarget.value)}
              />
              <DateField
                label={
                  <HeaderLabel
                    label={t('quotationRequests.field.readyDate')}
                    hint={t('quotationRequests.field.readyDateHint')}
                  />
                }
                value={readyDate}
                onChange={setReadyDate}
              />
              <NumberInput
                label={
                  <HeaderLabel
                    label={t('quotationRequests.field.weightDerived')}
                    hint={t('quotationRequests.field.weightDerivedHint')}
                  />
                }
                value={Number(totalWeight.toFixed(3))}
                min={0}
                thousandSeparator=","
                decimalScale={3}
                readOnly
              />
              {!fclMode ? (
                <NumberInput
                  label={
                    <HeaderLabel
                      label={t('quotationRequests.field.volumeDerived')}
                      hint={t('quotationRequests.field.volumeDerivedHint')}
                    />
                  }
                  value={Number(totalCbm.toFixed(4))}
                  min={0}
                  decimalScale={4}
                  readOnly
                />
              ) : null}
              {airMode ? (
                <>
                  <NumberInput
                    label={
                      <HeaderLabel
                        label={t('quotationRequests.field.dimWeight')}
                        hint={t('quotationRequests.field.dimWeightHint')}
                      />
                    }
                    value={Number(dimWeight.toFixed(3))}
                    min={0}
                    thousandSeparator=","
                    decimalScale={3}
                    readOnly
                    styles={{ input: { fontWeight: 700 } }}
                  />
                  <NumberInput
                    label={
                      <HeaderLabel
                        label={t('quotationRequests.field.chargeableWeight')}
                        hint={t('quotationRequests.field.chargeableWeightHint')}
                      />
                    }
                    value={Number(chargeableWeight.toFixed(3))}
                    min={0}
                    thousandSeparator=","
                    decimalScale={3}
                    readOnly
                    styles={{ input: { fontWeight: 700 } }}
                  />
                </>
              ) : null}
              {lclMode ? (
                <NumberInput
                  label={
                    <HeaderLabel
                      label={t('quotationRequests.field.chargeableRevenueTon')}
                      hint={t('quotationRequests.field.chargeableRevenueTonHint')}
                    />
                  }
                  value={Number(chargeableRevenueTon.toFixed(3))}
                  min={0}
                  thousandSeparator=","
                  decimalScale={3}
                  readOnly
                  styles={{ input: { fontWeight: 700 } }}
                />
              ) : null}
            </SimpleGrid>
            <Textarea
              label={t('quotationRequests.field.note')}
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
              autosize
              minRows={2}
              mt="sm"
            />
          </FormSection>
        </div>

        <Paper withBorder p="sm" className="purchase-order-form-section purchase-order-lines-panel">
          <Group justify="space-between" align="flex-start" mb="sm">
            <div>
              <Text fw={700}>
                {fclMode ? t('quotationRequests.section.containerLines') : t('quotationRequests.section.packages')}
              </Text>
              <Text size="sm" c="dimmed">
                {fclMode ? t('quotationRequests.section.containerLinesHint') : t('quotationRequests.section.packagesHint')}
              </Text>
            </div>
            <SummaryTile
              label={t('quotationRequests.field.requestTotalUsd')}
              tone="accent"
              value={requestTotal.toLocaleString()}
            />
          </Group>
          {fclMode ? (
            <ContainerListEditor
              containers={containers}
              activeId={activeContainerId}
              onActiveChange={setActiveContainerId}
              containerTypeOptions={masterData.containerTypeOptions}
              items={masterData.items}
              itemOptions={masterData.itemOptions}
              unitOptions={masterData.uomOptions}
              onChange={updateContainer}
              onAdd={addContainer}
              onRemove={removeContainer}
            />
          ) : (
            <PackageListEditor
              packages={packages}
              activeId={activePackageId}
              onActiveChange={setActivePackageId}
              items={masterData.items}
              itemOptions={masterData.itemOptions}
              unitOptions={masterData.uomOptions}
              onChange={updatePackage}
              onAdd={addPackage}
              onRemove={removePackage}
            />
          )}
        </Paper>
      </Stack>
    </form>
  );
}
