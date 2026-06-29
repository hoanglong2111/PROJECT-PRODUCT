import { Button, Tooltip } from '@mantine/core';
import { IconAnchor, IconChecklist, IconShoppingCart, IconTruck, IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';

type EntityType = 'po' | 'do' | 'dto' | 'task' | 'shp';

const ROUTE: Record<EntityType, string> = {
  po: '/purchase-orders',
  do: '/delivery-orders',
  dto: '/domestic-transport-orders',
  task: '/tasks',
  shp: '/shipments',
};

const ICON = {
  po: IconShoppingCart,
  do: IconTruckDelivery,
  dto: IconTruck,
  task: IconChecklist,
  shp: IconAnchor,
};

export function EntityLink({
  compact,
  disabledReason,
  id,
  type,
}: {
  compact?: boolean;
  disabledReason?: string;
  id?: string | null;
  type: EntityType;
}) {
  const { t } = useI18n();
  const Icon = ICON[type];
  const label: Record<EntityType, string> = {
    do: t('entityLink.openDo'),
    dto: 'Open DTO',
    po: t('entityLink.openPo'),
    shp: t('entityLink.openShipment'),
    task: t('entityLink.openTask'),
  };

  if (!id) {
    return (
      <Tooltip label={disabledReason ?? t('entityLink.disabled', { type: type.toUpperCase() })}>
        <Button size="xs" variant="default" disabled leftSection={<Icon size={14} />}>
          {label[type]}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      component={Link}
      to={`${ROUTE[type]}?${type}=${id}`}
      size="xs"
      variant="light"
      className={`entity-link entity-link-${type}`}
      leftSection={<Icon size={14} />}
    >
      {compact ? id : `${label[type]} - ${id}`}
    </Button>
  );
}
