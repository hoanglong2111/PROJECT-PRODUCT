import { Text, type TextProps } from '@mantine/core';

import { APP_TZ_LABEL, formatDateTime, formatIso } from '@shared/utils/date';

type DateTimeTextProps = Omit<TextProps, 'children' | 'component' | 'title'> & {
  fallback?: string;
  showZone?: boolean;
  value: string | number | Date | null | undefined;
};

export function DateTimeText({
  className,
  fallback = '-',
  showZone = false,
  value,
  ...textProps
}: DateTimeTextProps) {
  const display = formatDateTime(value, fallback);
  const iso = formatIso(value, fallback);
  const classes = ['date-time-text', 'tabular-nums', className].filter(Boolean).join(' ');

  return (
    <Text component="span" className={classes} title={iso} {...textProps}>
      {display}
      {showZone && display !== fallback ? ` ${APP_TZ_LABEL}` : ''}
    </Text>
  );
}
