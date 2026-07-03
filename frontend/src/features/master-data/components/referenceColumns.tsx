import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconStarFilled } from '@tabler/icons-react';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { Carrier, Forwarder } from '@shared/api/forwarders';
import type { Item } from '@shared/api/items';
import type { Currency, Incoterm, Supplier, TransportMode } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import { DateTimeText } from '@shared/components/DateTimeText';
import { StatusToggle } from '@shared/components/StatusToggle';
import { useI18n } from '@shared/i18n';
import { CHARGE_CATEGORIES, CHARGE_GROUPS } from '@shared/lib/chargeCategories';

import {
  formatDecimal,
  getCarrierTypeLabel,
  getForwarderTypeLabel,
  getItemCategoryLabel,
  getItemTypeLabel,
  getRevCostLabel,
  getSupplierTypeLabel,
} from '../model/masterDataModel';
import type { ReferenceColumn } from './ReferenceDataPanel';

type T = ReturnType<typeof useI18n>['t'];

function empty(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

function statusLabel(active: boolean, t: T) {
  return active ? t('masterData.activeStatus') : t('masterData.inactiveStatus');
}

function modeLabel(label: string, active: boolean, t: T) {
  return `${label}: ${statusLabel(active, t)}`;
}

function revCostShort(value: string) {
  if (value === 'REVENUE') return 'REV';
  if (value === 'COST') return 'COST';
  return 'BOTH';
}

function revCostColor(value: string) {
  if (value === 'REVENUE') return 'blue';
  if (value === 'COST') return 'orange';
  return 'teal';
}

export function buildItemColumns(t: T, onToggleActive?: (record: Item) => void): Array<ReferenceColumn<Item>> {
  return [
    {
      key: 'identity',
      label: t('masterData.itemName'),
      width: 260,
      render: (item) => (
        <Stack gap={4}>
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{item.item_code}</Badge>
            <Text fw={700} lineClamp={1} title={item.item_name}>
              {item.item_name}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.item_name_en || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'category',
      label: t('masterData.itemCategory'),
      width: 150,
      render: (item) => <Badge color="blue" variant="light">{getItemCategoryLabel(item.item_category, t)}</Badge>,
    },
    {
      key: 'type',
      label: t('masterData.itemType'),
      width: 135,
      render: (item) => <Badge color="gray" variant="outline">{getItemTypeLabel(item.item_type, t)}</Badge>,
    },
    {
      key: 'uom',
      label: t('masterData.commercialInfo'),
      hint: t('glossary.defaultUom'),
      width: 165,
      render: (item) => (
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            {[item.base_uom, item.purchase_uom].filter(Boolean).join(' / ') || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {t('masterData.purchaseUom')} x {formatDecimal(item.uom_conversion)}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'hsCode',
      label: t('masterData.defaultHsCode'),
      width: 120,
      render: (item) => empty(item.hs_code),
    },
    {
      key: 'origin',
      label: t('masterData.countryOfOrigin'),
      width: 120,
      render: (item) => empty(item.country_of_origin),
    },
    {
      key: 'price',
      label: t('masterData.unitPriceUsd'),
      width: 125,
      render: (item) => formatDecimal(item.unit_price_usd),
    },
    {
      key: 'status',
      label: t('common.status'),
      align: 'center',
      width: 96,
      render: (item) => <StatusToggle active={item.is_active !== false} onToggle={onToggleActive ? () => onToggleActive(item) : undefined} />,
    },
  ];
}

export function buildCurrencyColumns(t: T, onToggleActive?: (record: Currency) => void): Array<ReferenceColumn<Currency>> {
  return [
    {
      key: 'code',
      label: t('masterData.currencyCode'),
      width: 180,
      render: (currency) => (
        <Stack gap={3}>
          <Badge variant="light">{currency.currency_code}</Badge>
          <Text fw={700} lineClamp={1}>
            {currency.currency_name}
          </Text>
        </Stack>
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
      align: 'center',
      width: 96,
      render: (currency) => <StatusToggle active={currency.is_active} onToggle={onToggleActive ? () => onToggleActive(currency) : undefined} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 150,
      render: (currency) => <DateTimeText value={currency.update_at} />,
    },
  ];
}

export function buildIncotermColumns(t: T, onToggleActive?: (record: Incoterm) => void): Array<ReferenceColumn<Incoterm>> {
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
      width: 240,
      render: (incoterm) => (
        <Stack gap={4}>
          <Text fw={700} lineClamp={1}>
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
      align: 'center',
      width: 96,
      render: (incoterm) => <StatusToggle active={incoterm.is_active} onToggle={onToggleActive ? () => onToggleActive(incoterm) : undefined} />,
    },
  ];
}

export function buildTransportModeColumns(t: T, onToggleActive?: (record: TransportMode) => void): Array<ReferenceColumn<TransportMode>> {
  return [
    {
      key: 'code',
      label: t('masterData.transportModeCode'),
      width: 240,
      render: (mode) => (
        <Stack gap={3}>
          <Badge variant="light">{mode.mode_code}</Badge>
          <Text fw={700} lineClamp={1}>
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
      align: 'center',
      width: 96,
      render: (mode) => <StatusToggle active={mode.is_active} onToggle={onToggleActive ? () => onToggleActive(mode) : undefined} />,
    },
  ];
}

export function buildChargeCodeColumns(t: T, onToggleActive?: (record: ChargeCode) => void): Array<ReferenceColumn<ChargeCode>> {
  const groupLabelMap = Object.fromEntries(CHARGE_GROUPS.map((group) => [group.value, group.docLabel]));
  const categoryLabelMap = Object.fromEntries(CHARGE_CATEGORIES.map((category) => [category.value, category.docLabel]));

  return [
    {
      key: 'identity',
      label: t('masterData.chargeCode'),
      width: 260,
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
      key: 'group',
      label: t('masterData.chargeGroup'),
      width: 170,
      render: (chargeCode) => groupLabelMap[chargeCode.group] ?? chargeCode.group,
    },
    {
      key: 'category',
      label: t('masterData.chargeCategory'),
      width: 145,
      render: (chargeCode) => <Badge variant="light">{categoryLabelMap[chargeCode.category] ?? chargeCode.category}</Badge>,
    },
    {
      key: 'uom',
      label: t('masterData.defaultUom'),
      hint: t('glossary.defaultUom'),
      align: 'center',
      width: 104,
      render: (chargeCode) => <Badge color="gray" variant="light">{chargeCode.default_uom}</Badge>,
    },
    {
      key: 'revCost',
      label: t('masterData.revCost'),
      align: 'center',
      width: 104,
      render: (chargeCode) => (
        <Tooltip label={getRevCostLabel(chargeCode.rev_cost)}>
          <Badge color={revCostColor(chargeCode.rev_cost)} variant="light">
            {revCostShort(chargeCode.rev_cost)}
          </Badge>
        </Tooltip>
      ),
    },
    {
      key: 'taxable',
      label: t('masterData.taxable'),
      hint: t('glossary.taxableCharge'),
      align: 'center',
      width: 104,
      render: (chargeCode) => {
        const label = chargeCode.taxable ? t('masterData.taxable') : t('masterData.nonTaxable');

        return (
          <Tooltip label={label}>
            <span
              aria-label={label}
              className={`md-icon-flag ${chargeCode.taxable ? 'is-on' : 'is-off'}`}
              role="img"
            >
              <IconCheck size={16} />
            </span>
          </Tooltip>
        );
      },
    },
    {
      key: 'scope',
      label: t('masterData.transportApplicability'),
      align: 'center',
      width: 156,
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
              <Tooltip key={mode.key} label={modeLabel(mode.label, mode.active, t)}>
                <span
                  aria-label={modeLabel(mode.label, mode.active, t)}
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
      align: 'center',
      width: 96,
      render: (chargeCode) => <StatusToggle active={chargeCode.is_active} onToggle={onToggleActive ? () => onToggleActive(chargeCode) : undefined} />,
    },
  ];
}

export function buildUomColumns(t: T, onToggleActive?: (record: Uom) => void): Array<ReferenceColumn<Uom>> {
  return [
    {
      key: 'identity',
      label: t('masterData.uomCode'),
      width: 220,
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
      align: 'center',
      width: 96,
      render: (uom) => <StatusToggle active={uom.is_active} onToggle={onToggleActive ? () => onToggleActive(uom) : undefined} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 150,
      render: (uom) => <DateTimeText value={uom.update_at} />,
    },
  ];
}

export function buildSupplierColumns(t: T, onToggleActive?: (record: Supplier) => void): Array<ReferenceColumn<Supplier>> {
  return [
    {
      key: 'identity',
      label: t('masterData.supplier'),
      width: 240,
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
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.supplierType'),
      width: 160,
      render: (supplier) => <Badge color="blue" variant="light">{getSupplierTypeLabel(supplier.supplier_type, t)}</Badge>,
    },
    {
      key: 'country',
      label: t('masterData.country'),
      width: 135,
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm">{supplier.country || '-'}</Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {supplier.city || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'contact',
      label: t('masterData.contact'),
      width: 220,
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm" fw={600} lineClamp={1}>
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
      width: 170,
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm">
            {supplier.default_currency_code || '-'} / {supplier.default_incoterm_code || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {supplier.payment_term || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'lead',
      label: t('masterData.leadTimeDays'),
      width: 100,
      render: (supplier) => empty(supplier.lead_time_production_days),
    },
    {
      key: 'status',
      label: t('common.status'),
      align: 'center',
      width: 96,
      render: (supplier) => <StatusToggle active={supplier.is_active} onToggle={onToggleActive ? () => onToggleActive(supplier) : undefined} />,
    },
  ];
}

export function buildForwarderColumns(t: T, onToggleActive?: (record: Forwarder) => void): Array<ReferenceColumn<Forwarder>> {
  return [
    {
      key: 'identity',
      label: t('masterData.forwarder'),
      width: 200,
      render: (forwarder) => (
        <Stack gap={4}>
          <Badge variant="light">{forwarder.forwarder_code}</Badge>
          <Text fw={700} lineClamp={1} title={forwarder.forwarder_name}>
            {forwarder.forwarder_name}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.forwarderType'),
      width: 160,
      render: (forwarder) => <Badge color="blue" variant="outline">{getForwarderTypeLabel(forwarder.forwarder_type, t)}</Badge>,
    },
    {
      key: 'country',
      label: t('masterData.country'),
      width: 120,
      render: (forwarder) => empty(forwarder.country),
    },
    {
      key: 'contact',
      label: t('masterData.contact'),
      width: 220,
      render: (forwarder) => (
        <Stack gap={2}>
          <Text size="sm" fw={600} lineClamp={1}>{forwarder.contact_person || '-'}</Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {[forwarder.contact_email, forwarder.contact_phone].filter(Boolean).join(' | ') || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'primary',
      label: t('masterData.isPrimary'),
      align: 'center',
      width: 100,
      render: (forwarder) => {
        const label = forwarder.is_primary
          ? t('masterData.isPrimary')
          : `${t('masterData.isPrimary')}: ${t('common.no')}`;

        return (
          <Tooltip label={label}>
            <span
              aria-label={label}
              className={`md-icon-flag is-star ${forwarder.is_primary ? 'is-on' : 'is-off'}`}
              role="img"
            >
              <IconStarFilled size={16} />
            </span>
          </Tooltip>
        );
      },
    },
    {
      key: 'status',
      label: t('common.status'),
      align: 'center',
      width: 96,
      render: (forwarder) => <StatusToggle active={forwarder.is_active !== false} onToggle={onToggleActive ? () => onToggleActive(forwarder) : undefined} />,
    },
  ];
}

export function buildCarrierColumns(t: T, onToggleActive?: (record: Carrier) => void): Array<ReferenceColumn<Carrier>> {
  return [
    {
      key: 'identity',
      label: t('masterData.carrier'),
      width: 200,
      render: (carrier) => (
        <Stack gap={4}>
          <Badge variant="light">{carrier.carrier_code}</Badge>
          <Text fw={700} lineClamp={1} title={carrier.carrier_name}>
            {carrier.carrier_name}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.carrierType'),
      width: 170,
      render: (carrier) => <Badge color="blue" variant="outline">{getCarrierTypeLabel(carrier.carrier_type, t)}</Badge>,
    },
    {
      key: 'scacIata',
      label: t('masterData.scacIataCode'),
      width: 125,
      render: (carrier) => empty(carrier.scac_iata_code),
    },
    {
      key: 'route',
      label: t('masterData.serviceRouteNote'),
      render: (carrier) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {carrier.service_route_note || '-'}
        </Text>
      ),
    },
    {
      key: 'booking',
      label: t('masterData.contactBooking'),
      width: 210,
      render: (carrier) => (
        <Stack gap={2}>
          <Text size="sm" fw={600} lineClamp={1}>{carrier.contact_booking || '-'}</Text>
          <Text size="xs" c="dimmed" lineClamp={2}>{carrier.contact_email || '-'}</Text>
        </Stack>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      align: 'center',
      width: 96,
      render: (carrier) => <StatusToggle active={carrier.is_active !== false} onToggle={onToggleActive ? () => onToggleActive(carrier) : undefined} />,
    },
  ];
}
