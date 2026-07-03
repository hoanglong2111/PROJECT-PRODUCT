import type { ReactNode } from 'react';
import {
  IconAnchor,
  IconChecklist,
  IconDatabase,
  IconFileInvoice,
  IconSettings,
  IconShoppingCart,
  IconTruck,
  IconTruckDelivery,
} from '@tabler/icons-react';

export type ModalTitleFeature =
  | 'delivery-orders'
  | 'dto'
  | 'master-data'
  | 'purchase-orders'
  | 'quotations'
  | 'settings'
  | 'shipments'
  | 'tasks';

const defaultIcons: Record<ModalTitleFeature, ReactNode> = {
  'delivery-orders': <IconTruckDelivery size={18} stroke={1.8} />,
  dto: <IconTruck size={18} stroke={1.8} />,
  'master-data': <IconDatabase size={18} stroke={1.8} />,
  'purchase-orders': <IconShoppingCart size={18} stroke={1.8} />,
  quotations: <IconFileInvoice size={18} stroke={1.8} />,
  settings: <IconSettings size={18} stroke={1.8} />,
  shipments: <IconAnchor size={18} stroke={1.8} />,
  tasks: <IconChecklist size={18} stroke={1.8} />,
};

export function ModalTitle({
  feature,
  icon,
  subtitle,
  title,
}: {
  feature: ModalTitleFeature;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={`kbfe-modal-title kbfe-modal-title--${feature}`}>
      <span className="kbfe-modal-title__icon" aria-hidden="true">
        {icon ?? defaultIcons[feature]}
      </span>
      <span className="kbfe-modal-title__text">
        <span className="kbfe-modal-title__label">{title}</span>
        {subtitle ? <span className="kbfe-modal-title__subtitle">{subtitle}</span> : null}
      </span>
    </div>
  );
}
