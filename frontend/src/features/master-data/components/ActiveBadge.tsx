import { Badge } from '@mantine/core';

import { useI18n } from '@shared/i18n';

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();

  return (
    <Badge color={active ? 'teal' : 'gray'} variant="light">
      {active ? t('masterData.activeStatus') : t('masterData.inactiveStatus')}
    </Badge>
  );
}
