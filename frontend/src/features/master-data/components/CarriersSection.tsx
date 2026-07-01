import { Badge, Select, Stack, Text } from '@mantine/core';

import { fetchCarriers, type Carrier } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { ActiveBadge } from './ActiveBadge';
import { ReferenceDataPanel, type ReferenceColumn } from './ReferenceDataPanel';

const CARRIER_TYPES = ['SHIPPING_LINE', 'AIRLINE'];

function formatCarrierType(type: string, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<string, string> = {
    SHIPPING_LINE: t('masterData.carrierTypeShippingLine'),
    AIRLINE: t('masterData.carrierTypeAirline'),
  };

  return labels[type] ?? type;
}

function buildCarrierColumns(t: ReturnType<typeof useI18n>['t']): Array<ReferenceColumn<Carrier>> {
  return [
    {
      key: 'identity',
      label: t('masterData.carrier'),
      render: (carrier) => (
        <Stack gap={3}>
          <Badge variant="light">{carrier.carrier_code}</Badge>
          <Text fw={700} lineClamp={1}>{carrier.carrier_name}</Text>
          <Text size="xs" c="dimmed">{carrier.scac_iata_code || '-'}</Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.carrierType'),
      width: 180,
      render: (carrier) => <Badge color="blue" variant="outline">{formatCarrierType(carrier.carrier_type, t)}</Badge>,
    },
    {
      key: 'route',
      label: t('masterData.serviceRouteNote'),
      render: (carrier) => (
        <Stack gap={2}>
          <Text size="sm" lineClamp={2}>
            {carrier.service_route_note || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {carrier.note || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'booking',
      label: t('masterData.contactBooking'),
      width: 190,
      render: (carrier) => (
        <Stack gap={2}>
          <Text size="sm" lineClamp={1}>{carrier.contact_booking || '-'}</Text>
          <Text size="xs" c="dimmed" lineClamp={2}>{carrier.contact_email || '-'}</Text>
        </Stack>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (carrier) => <ActiveBadge active={carrier.is_active !== false} />,
    },
  ];
}

export function CarriersSection({
  canManage,
  hasActiveFilters,
  onAdd,
  onClearFilters,
  onDelete,
  onEdit,
  onStatusFilterChange,
  onTypeFilterChange,
  statusFilter,
  typeFilter,
}: {
  canManage: boolean;
  hasActiveFilters: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
  onDelete: (carrier: Carrier) => void;
  onEdit: (carrier: Carrier) => void;
  onStatusFilterChange: (value: boolean | null) => void;
  onTypeFilterChange: (value: string | null) => void;
  statusFilter: boolean | null;
  typeFilter: string | null;
}) {
  const { t } = useI18n();

  return (
    <ReferenceDataPanel
      addLabel={t('masterData.addCarrier')}
      canManage={canManage}
      title={t('masterData.carriersTitle')}
      searchPlaceholder={t('masterData.searchCarriers')}
      emptyTitle={t('masterData.noCarriers')}
      emptyDescription={t('masterData.noCarriersDescription')}
      columns={buildCarrierColumns(t)}
      queryKey={queryKeys.carriers}
      fetcher={fetchCarriers}
      pageSize={500}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      clientFilter={(carrier) => !typeFilter || carrier.carrier_type === typeFilter}
      toolbarExtra={(
        <Select
          className="md-filter-select"
          label={t('masterData.carrierType')}
          data={[
            { value: 'ALL', label: t('common.all') },
            ...CARRIER_TYPES.map((value) => ({ value, label: formatCarrierType(value, t) })),
          ]}
          value={typeFilter ?? 'ALL'}
          onChange={(value) => onTypeFilterChange(value === 'ALL' ? null : value)}
          w={240}
        />
      )}
    />
  );
}
