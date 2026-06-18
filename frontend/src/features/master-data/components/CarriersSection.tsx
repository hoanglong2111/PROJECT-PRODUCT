import { Badge, Stack, Text } from '@mantine/core';

import { fetchCarriers, type Carrier } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { ReferenceDataPanel, type ReferenceColumn } from './ReferenceDataPanel';

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
        <Stack gap={2}>
          <Badge variant="light">{carrier.carrier_code}</Badge>
          <Text fw={700}>{carrier.carrier_name}</Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.carrierType'),
      width: 160,
      render: (carrier) => <Badge color="blue" variant="outline">{formatCarrierType(carrier.carrier_type, t)}</Badge>,
    },
    {
      key: 'code',
      label: t('masterData.scacIataCode'),
      width: 140,
      render: (carrier) => carrier.scac_iata_code || '-',
    },
    {
      key: 'route',
      label: t('masterData.serviceRouteNote'),
      render: (carrier) => (
        <Text size="sm" lineClamp={2}>
          {carrier.service_route_note || '-'}
        </Text>
      ),
    },
    {
      key: 'booking',
      label: t('masterData.contactBooking'),
      render: (carrier) => (
        <Stack gap={2}>
          <Text size="sm">{carrier.contact_booking || '-'}</Text>
          <Text size="xs" c="dimmed">{carrier.contact_email || '-'}</Text>
        </Stack>
      ),
    },
    {
      key: 'note',
      label: t('masterData.note'),
      render: (carrier) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {carrier.note || '-'}
        </Text>
      ),
    },
  ];
}

export function CarriersSection({
  canManage,
  onAdd,
  onDelete,
  onEdit,
}: {
  canManage: boolean;
  onAdd: () => void;
  onDelete: (carrier: Carrier) => void;
  onEdit: (carrier: Carrier) => void;
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
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
