import { Badge, Group, Stack, Text } from '@mantine/core';

import type { Currency, Incoterm, Supplier, TransportMode } from '@shared/api/tradeMasterData';
import { useI18n } from '@shared/i18n';

import { formatDateTime } from '../model/masterDataModel';
import { ActiveBadge } from './ActiveBadge';
import type { ReferenceColumn } from './ReferenceDataPanel';

type T = ReturnType<typeof useI18n>['t'];

export function buildCurrencyColumns(t: T): Array<ReferenceColumn<Currency>> {
  return [
    {
      key: 'code',
      label: t('masterData.currencyCode'),
      render: (currency) => (
        <Group gap="xs" wrap="nowrap">
          <Badge variant="light">{currency.currency_code}</Badge>
          <Text fw={600}>{currency.currency_name}</Text>
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
      width: 140,
      render: (currency) => <ActiveBadge active={currency.is_active} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 170,
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
      width: 150,
      render: (incoterm) => <Badge variant="light">{incoterm.incoterm_code}</Badge>,
    },
    {
      key: 'name',
      label: t('masterData.incotermName'),
      render: (incoterm) => <Text fw={600}>{incoterm.incoterm_name}</Text>,
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
      width: 140,
      render: (incoterm) => <ActiveBadge active={incoterm.is_active} />,
    },
    {
      key: 'updated',
      label: t('masterData.updatedAt'),
      width: 170,
      render: (incoterm) => formatDateTime(incoterm.update_at),
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
          <Text fw={600}>{mode.mode_name}</Text>
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
      key: 'scope',
      label: t('masterData.transportScope'),
      hint: t('glossary.transportScope'),
      width: 160,
      render: (mode) => (
        <Badge color={mode.is_international ? 'teal' : 'gray'} variant="light">
          {mode.is_international ? t('masterData.international') : t('masterData.domestic')}
        </Badge>
      ),
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
      width: 140,
      render: (mode) => <ActiveBadge active={mode.is_active} />,
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
          <Group gap={4}>
            {supplier.supplier_roles.map((role) => (
              <Badge key={role} size="xs" color="gray" variant="outline">
                {role}
              </Badge>
            ))}
          </Group>
        </Stack>
      ),
    },
    {
      key: 'country',
      label: t('masterData.country'),
      width: 130,
      render: (supplier) => supplier.country || '-',
    },
    {
      key: 'contact',
      label: t('masterData.contact'),
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm">{supplier.contact_name || '-'}</Text>
          <Text size="xs" c="dimmed">
            {[supplier.contact_email, supplier.contact_phone].filter(Boolean).join(' | ') || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'terms',
      label: t('masterData.defaultTerms'),
      hint: t('glossary.paymentTerm'),
      render: (supplier) => (
        <Stack gap={2}>
          <Text size="sm">
            {supplier.default_currency?.currency_code || supplier.default_currency_code || '-'} /{' '}
            {supplier.default_incoterm?.incoterm_code || supplier.default_incoterm_code || '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {supplier.payment_term || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'transport_modes',
      label: t('masterData.supplierTransportModes'),
      hint: t('glossary.supplierTransportModes'),
      render: (supplier) => {
        const modes = supplier.supplier_transport_modes ?? [];

        if (modes.length === 0) {
          return <Text c="dimmed">-</Text>;
        }

        return (
          <Group gap={4}>
            {modes.slice(0, 3).map((mode) => (
              <Badge key={mode.id} color={mode.is_default ? 'teal' : 'gray'} variant="light">
                {mode.transport_mode?.mode_code ?? mode.transport_mode_id}
                {mode.is_default ? ` ${t('masterData.defaultShort')}` : ''}
              </Badge>
            ))}
            {modes.length > 3 ? (
              <Text size="xs" c="dimmed">
                +{modes.length - 3}
              </Text>
            ) : null}
          </Group>
        );
      },
    },
    {
      key: 'lead_time',
      label: t('masterData.leadTimeDays'),
      hint: t('glossary.leadTimeDays'),
      width: 150,
      render: (supplier) => supplier.lead_time_days ?? '-',
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 140,
      render: (supplier) => <ActiveBadge active={supplier.is_active} />,
    },
  ];
}
