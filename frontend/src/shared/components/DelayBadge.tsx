import { Badge } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { useI18n } from '@shared/i18n';

export function DelayBadge({ days, type }: { days: number; type: 'actual' | 'forecast' | 'unknown' }) {
  const { t } = useI18n();

  if (type === 'unknown') {
    return (
      <Badge color="gray" variant="light">
        {t('delay.noEta')}
      </Badge>
    );
  }

  if (days <= -3) {
    return (
      <Badge color="teal" variant="light">
        {t('delay.onTime')}
      </Badge>
    );
  }

  if (days < 0) {
    return (
      <Badge color="orange" variant="light">
        {t('delay.dueSoon', { days: Math.abs(days) })}
      </Badge>
    );
  }

  if (days === 0) {
    return (
      <Badge color="yellow" variant="filled">
        {t('delay.dueToday')}
      </Badge>
    );
  }

  return (
    <Badge color="red" variant={type === 'actual' ? 'filled' : 'light'} leftSection={<IconAlertTriangle size={12} />}>
      {type === 'forecast' ? t('delay.lateForecast', { days }) : t('delay.late', { days })}
    </Badge>
  );
}
