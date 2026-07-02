import { Tooltip } from '@mantine/core';

import { useI18n } from '@shared/i18n';

export function StatusToggle({ active }: { active: boolean }) {
  const { t } = useI18n();
  const label = active ? t('masterData.activeStatus') : t('masterData.inactiveStatus');

  return (
    <Tooltip label={label}>
      <span
        aria-label={label}
        className={`md-status-toggle ${active ? 'is-active' : 'is-inactive'}`}
        role="img"
      >
        <span className="md-status-toggle__knob" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
