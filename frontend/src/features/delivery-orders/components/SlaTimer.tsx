import { Badge, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

import { useI18n } from '@shared/i18n';

export function SlaTimer({ dueAt }: { dueAt: string | null | undefined }) {
  const { t } = useI18n();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const dueDate = parseSlaDueAt(dueAt);
  const isValid = dueDate.isValid();
  const now = dayjs();
  const isOverdue = isValid && dueDate.isBefore(now);
  const countdown = isValid ? formatSlaCountdown(dueDate.diff(now), t) : '-';

  return (
    <Stack gap={2}>
      <Text size="xs" fw={700} className="tabular-nums">
        {isValid ? dueDate.format('DD/MM/YYYY HH:mm:ss') : '-'}
      </Text>
      <Badge color={isOverdue ? 'red' : 'orange'} variant="light" size="sm">
        {isValid
          ? t(isOverdue ? 'deliveryOrders.slaOverdue' : 'deliveryOrders.slaRemaining', { countdown })
          : '-'}
      </Badge>
    </Stack>
  );
}

function parseSlaDueAt(value: string | null | undefined) {
  if (!value) return dayjs('');
  const rawValue = String(value).trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawValue);
  return isDateOnly ? dayjs(rawValue).endOf('day') : dayjs(rawValue);
}

function formatSlaCountdown(diffMs: number, t: ReturnType<typeof useI18n>['t']) {
  const totalSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1_000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');

  return days > 0 ? `${t('deliveryOrders.slaDays', { count: days })} ${time}` : time;
}
