import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { Currency, Incoterm, Supplier, TransportMode } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';

import { formatDateTime, getSupplierTypeLabel } from '../model/masterDataModel';
import { ActiveBadge } from './ActiveBadge';
import type { ReferenceColumn } from './ReferenceDataPanel';

type T = ReturnType<typeof useI18n>['t'];

function applicabilityLabel(label: string, active: boolean) {
  return `${label}: ${active ? 'applicable' : 'not applicable'}`;
}

export function buildCurrencyColumns(t: T): Array<ReferenceColumn<Currency>> {
  return [
    {
      key: 'code',
      label: t('masterData.currencyCode'),
      render: (currency) => (
        <Group gap="xs" wrap="nowrap">
          <Badge variant="light">{currency.currency_code}</Badge>
          <Text fw={600} lineClamp={1}>
            {currency.currency_name}
          </Text>
        </Group>
      ),
    },
    {
      key: 'symbol',
      label: t('masterData.currencySymbol'),
      hint: t('glossary.currencySymbol'),
      width: 110,
      render: (currency) => currency.symbol || '-',
    },
    {
      key: 'decimal_places',
      label: t('masterData.decimalPlaces'),
      hint: t('glossary.decimalPlaces'),
      width: 140,
      render: (currency) => currency.decimal_places,
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (currency) => <ActiveBadge active={currency.is_active} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 150,
      render: (currency) => formatDateTime(currency.update_at),
    },
  ];
}

export function buildIncotermColumns(t: T): Array<ReferenceColumn<Incoterm>> {
  return [
    {
      key: 'code',
      label: t('masterData.incotermCode'),
      hint: t('glossary.incoterm'),
      width: 130,
      render: (incoterm) => <Badge variant="light">{incoterm.incoterm_code}</Badge>,
    },
    {
      key: 'name',
      label: t('masterData.incotermName'),
      render: (incoterm) => (
        <Stack gap={4}>
          <Text fw={600} lineClamp={1}>
            {incoterm.incoterm_name}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {incoterm.incoterm_name_vn || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'description',
      label: t('masterData.description'),
      render: (incoterm) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {incoterm.description || '-'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (incoterm) => <ActiveBadge active={incoterm.is_active} />,
    },
  ];
}

export function buildTransportModeColumns(t: T): Array<ReferenceColumn<TransportMode>> {
  return [
    {
      key: 'code',
      label: t('masterData.transportModeCode'),
      render: (mode) => (
        <Stack gap={2}>
          <Badge variant="light">{mode.mode_code}</Badge>
          <Text fw={600} lineClamp={1}>
            {mode.mode_name}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.transportModeType'),
      hint: t('glossary.transportModeType'),
      width: 150,
      render: (mode) => <Badge color="blue" variant="outline">{mode.mode_type}</Badge>,
    },
    {
      key: 'description',
      label: t('masterData.description'),
      render: (mode) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {mode.description || '-'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (mode) => <ActiveBadge active={mode.is_active} />,
    },
  ];
}

export function buildChargeCodeColumns(t: T): Array<ReferenceColumn<ChargeCode>> {
  const groupLabelMap = Object.fromEntries(CHARGE_GROUPS.map((group) => [group.value, t(group.labelKey)]));
  const categoryLabelMap = Object.fromEntries(CHARGE_CATEGORIES.map((category) => [category.value, t(category.labelKey)]));

  return [
    {
      key: 'identity',
      label: t('masterData.chargeCode'),
      render: (chargeCode) => (
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{chargeCode.charge_code}</Badge>
            <Text fw={700} lineClamp={1} title={chargeCode.charge_name_en}>
              {chargeCode.charge_name_en}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {chargeCode.charge_name_vn || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'classification',
      label: t('masterData.chargeGroup'),
      width: 180,
      render: (chargeCode) => (
        <Stack gap={4}>
          <Badge variant="light">{groupLabelMap[chargeCode.group] ?? chargeCode.group}</Badge>
          <Badge variant="outline">{categoryLabelMap[chargeCode.category] ?? chargeCode.category}</Badge>
        </Stack>
      ),
    },
    {
      key: 'billing',
      label: t('masterData.defaultUom'),
      hint: t('glossary.defaultUom'),
      width: 140,
      render: (chargeCode) => (
        <Stack gap={4}>
          <Badge color="gray" variant="light">{chargeCode.default_uom}</Badge>
          <Badge color="teal" variant="light">{chargeCode.rev_cost}</Badge>
          <Text size="xs" c="dimmed">
            {chargeCode.taxable ? t('masterData.taxable') : t('masterData.nonTaxable')}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'scope',
      label: t('masterData.transportApplicability'),
      width: 150,
      render: (chargeCode) => {
        const modes = [
          { key: 'sea_fcl', label: t('masterData.seaFcl'), short: 'F', active: chargeCode.sea_fcl },
          { key: 'sea_lcl', label: t('masterData.seaLcl'), short: 'L', active: chargeCode.sea_lcl },
          { key: 'air', label: t('masterData.air'), short: 'A', active: chargeCode.air },
          { key: 'road', label: t('masterData.road'), short: 'D', active: chargeCode.road },
          { key: 'rail', label: t('masterData.rail'), short: 'R', active: chargeCode.rail },
        ];

        return (
          <div className="md-scope-row">
            {modes.map((mode) => (
              <Tooltip key={mode.key} label={applicabilityLabel(mode.label, mode.active)}>
                <span
                  aria-label={applicabilityLabel(mode.label, mode.active)}
                  className={`md-scope-dot ${mode.active ? 'is-on' : 'is-off'}`}
                  role="img"
                >
                  {mode.short}
                </span>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (chargeCode) => <ActiveBadge active={chargeCode.is_active} />,
    },
  ];
}

export function buildUomColumns(t: T): Array<ReferenceColumn<Uom>> {
  return [
    {
      key: 'identity',
      label: t('masterData.uomCode'),
      render: (uom) => (
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{uom.uom_code}</Badge>
            <Text fw={700} lineClamp={1} title={uom.uom_name_en}>
              {uom.uom_name_en}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {uom.uom_name_vn || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'description',
      label: t('masterData.description'),
      render: (uom) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {uom.description || '-'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (uom) => <ActiveBadge active={uom.is_active} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 150,
      render: (uom) => formatDateTime(uom.update_at),
    },
  ];
}

export function buildSupplierColumns(t: T): Array<ReferenceColumn<Supplier>> {
  return [
    {
      key: 'identity',
      label: t('masterData.supplier'),
      render: (supplier) => (
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{supplier.supplier_code}</Badge>
            <Text fw={700} lineClamp={1} title={supplier.supplier_name}>
              {supplier.supplier_name}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {supplier.supplier_name_en || '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {t('masterData.leadTimeProductionDays')}: {supplier.lead_time_production_days ?? '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'typeContact',
      label: t('masterData.contact'),
      width: 220,
      render: (supplier) => (
        <Stack gap={3}>
          <Badge color="blue" variant="light">
            {getSupplierTypeLabel(supplier.supplier_type, t)}
          </Badge>
          <Text size="xs" c="dimmed">
            {[supplier.country, supplier.city].filter(Boolean).join(' / ') || '-'}
          </Text>
          <Text size="sm" lineClamp={1}>
            {supplier.contact_person || supplier.contact_name || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {[supplier.contact_email, supplier.contact_phone].filter(Boolean).join(' | ') || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'terms',
      label: t('masterData.defaultTerms'),
      hint: t('glossary.paymentTerm'),
      width: 160,
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm">
            {supplier.default_currency_code || '-'} / {supplier.default_incoterm_code || '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {supplier.payment_term || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (supplier) => <ActiveBadge active={supplier.is_active} />,
    },
  ];
}
