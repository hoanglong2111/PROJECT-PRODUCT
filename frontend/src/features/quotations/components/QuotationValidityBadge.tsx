import { Badge } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { useI18n } from '@shared/i18n';

import { quotationValidityState } from '../model/quotationValidity';

export function QuotationValidityBadge({ validUntil }: { validUntil: string | null }) {
  const { t } = useI18n();
  const { level, days } = quotationValidityState(validUntil);

  switch (level) {
    case 'expired':
      return (
        <Badge color="red" variant="light" size="xs" leftSection={<IconAlertTriangle size={12} />}>
          {t('quotations.validity.expired', { days: Math.abs(days) })}
        </Badge>
      );
    case 'today':
      return (
        <Badge color="yellow" variant="light" size="xs">
          {t('quotations.validity.expiresToday')}
        </Badge>
      );
    case 'soon':
      return (
        <Badge color="orange" variant="light" size="xs">
          {t('quotations.validity.expiresIn', { days })}
        </Badge>
      );
    case 'valid':
      return (
        <Badge color="teal" variant="light" size="xs">
          {t('quotations.validity.validUntil', { date: validUntil })}
        </Badge>
      );
    case 'none':
    default:
      return (
        <Badge color="gray" variant="light" size="xs">
          {t('quotations.validity.noLimit')}
        </Badge>
      );
  }
}
