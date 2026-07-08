import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { createQuotationRequest, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import {
  isAirMode,
  isFclMode,
  newRfqContainer,
  newRfqPackage,
  rfqChargeableWeightKg,
  rfqContainersTotalWeight,
  rfqLclChargeableRevenueTon,
  rfqPackageCbm,
  rfqPackagesDimWeightKg,
  rfqPackagesTotals,
  type RfqContainerDraft,
  type RfqPackageDraft,
} from '../model/quotationRequestModel';
import {
  buildCreateQuotationRequestPayload,
  containersToLines,
  packagesToLines,
  sourceContainersToDrafts,
  sourcePackagesByModeToDrafts,
  textOrEmpty,
  type ActivePackageIdByMode,
  type PackagesByMode,
} from '../model/quotationRequestFormModel';
import { useRfqMasterData } from './useRfqMasterData';

type UseQuotationRequestFormArgs = {
  source?: QuotationRequestV1;
  onCreated: (request: QuotationRequestV1) => void;
};

export type RfqFormApi = ReturnType<typeof useQuotationRequestForm>;

export function useQuotationRequestForm({ source, onCreated }: UseQuotationRequestFormArgs) {
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

  const onSupplierChange = (value: string | null) => {
    const supplier = masterData.suppliers.find((item) => item.id === value);
    setSupplierId(value);
    setCurrency(supplier?.default_currency_code ?? currency);
    setIncoterm(supplier?.default_incoterm_code ?? incoterm);
  };

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

  const createMutation = useMutation({
    mutationFn: () =>
      createQuotationRequest(buildCreateQuotationRequestPayload({
        customerRef,
        customerPoRef,
        customerContractRef,
        supplierId,
        incoterm,
        mode,
        currency,
        originPort,
        destinationPort,
        readyDate,
        note,
        fclMode,
        airMode,
        lclMode,
        totalWeight,
        totalCbm,
        dimWeight,
        chargeableWeight,
        chargeableRevenueTon,
        effectiveLines,
        packages,
        containers,
      })),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
      onCreated(request);
    },
  });

  const submit = () => {
    if (canSubmit) createMutation.mutate();
  };

  return {
    masterData,
    // fields
    customerRef, setCustomerRef,
    customerPoRef, setCustomerPoRef,
    customerContractRef, setCustomerContractRef,
    supplierId, onSupplierChange,
    incoterm, setIncoterm,
    mode, setMode,
    currency, setCurrency,
    originPort, setOriginPort,
    destinationPort, setDestinationPort,
    readyDate, setReadyDate,
    note, setNote,
    // cargo editors
    packages, activePackageId, setActivePackageId, updatePackage, addPackage, removePackage,
    containers, activeContainerId, setActiveContainerId, updateContainer, addContainer, removeContainer,
    // derived
    selectedSupplier,
    fclMode, airMode, lclMode,
    totalCbm, totalWeight, dimWeight, chargeableWeight, chargeableRevenueTon,
    requestTotal, cargoMetric, canSubmit,
    // submit
    createMutation, submit,
  };
}
