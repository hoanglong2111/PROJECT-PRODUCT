import { Button, Tooltip } from '@mantine/core';
import { IconAnchor, IconChecklist, IconFileInvoice, IconGitBranch, IconShoppingCart, IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';

type EntityType = 'po' | 'do' | 'task' | 'shp';

const ROUTE: Record<EntityType, string> = {
  po: '/purchase-orders',
  do: '/delivery-orders',
  task: '/tasks',
  shp: '/shipments',
};

const ICON = {
  po: IconShoppingCart,
  do: IconTruckDelivery,
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

  const queryKey = type;

  return (
    <Button component={Link} to={`${ROUTE[type]}?${queryKey}=${id}`} size="xs" variant="light" leftSection={<Icon size={14} />}>
      {compact ? id : `${label[type]} · ${id}`}
    </Button>
  );
}
