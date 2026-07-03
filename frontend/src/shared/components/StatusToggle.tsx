import { Loader, Tooltip } from '@mantine/core';

import { useI18n } from '@shared/i18n';

export function StatusToggle({
  active,
  onToggle,
  loading,
  disabled,
}: {
  active: boolean;
  onToggle?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const label = active ? t('masterData.activeStatus') : t('masterData.inactiveStatus');

  const content = onToggle ? (
    <button
      type="button"
      className={`md-status-toggle is-clickable ${active ? 'is-active' : 'is-inactive'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={loading || disabled}
      aria-pressed={active}
      aria-label={label}
      style={{
        appearance: 'none',
        padding: 0,
      }}
    >
      {loading ? (
        <Loader size={12} color={active ? 'teal' : 'gray'} />
      ) : (
        <span className="md-status-toggle__knob" aria-hidden="true" />
      )}
    </button>
  ) : (
    <span
      aria-label={label}
      className={`md-status-toggle ${active ? 'is-active' : 'is-inactive'}`}
      role="img"
    >
      <span className="md-status-toggle__knob" aria-hidden="true" />
    </span>
  );

  return (
    <Tooltip label={label}>
      {content}
    </Tooltip>
  );
}
