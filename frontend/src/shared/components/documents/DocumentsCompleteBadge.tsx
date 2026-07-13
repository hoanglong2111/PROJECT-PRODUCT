import { Badge, type BadgeProps, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconFileAlert } from '@tabler/icons-react';

import { useI18n } from '@shared/i18n';

export type DocumentsCompleteState = {
  complete: boolean;
  outstanding?: string[];
  unverified?: string[];
};

export type DocumentsCompleteTone = 'complete' | 'incomplete' | 'unverified';

// Derived, reversible "documents complete" signal (source of truth = backend DO gate).
// Two tiers: outstanding (required type with no uploaded file) blocks; unverified
// (uploaded but none VERIFIED) is a soft warning only.
export function documentsCompleteTone({ complete, outstanding = [], unverified = [] }: DocumentsCompleteState): DocumentsCompleteTone {
  if (!complete || outstanding.length > 0) return 'incomplete';
  if (unverified.length > 0) return 'unverified';
  return 'complete';
}

export function DocumentsCompleteBadge({
  complete,
  outstanding = [],
  unverified = [],
  size = 'xs',
  variant = 'light',
}: DocumentsCompleteState & { size?: BadgeProps['size']; variant?: BadgeProps['variant'] }) {
  const { t, documentLabel } = useI18n();
  const tone = documentsCompleteTone({ complete, outstanding, unverified });
  const labelList = (codes: string[]) => codes.map((code) => documentLabel(code)).join(', ');

  if (tone === 'incomplete') {
    return (
      <Tooltip label={t('documents.outstandingTooltip', { documents: labelList(outstanding) })} withArrow multiline>
        <Badge color="red" size={size} variant={variant} leftSection={<IconFileAlert size={12} />}>
          {t('documents.missingCount', { count: outstanding.length })}
        </Badge>
      </Tooltip>
    );
  }

  if (tone === 'unverified') {
    return (
      <Tooltip label={t('documents.unverifiedTooltip', { documents: labelList(unverified) })} withArrow multiline>
        <Badge color="yellow" size={size} variant={variant} leftSection={<IconAlertTriangle size={12} />}>
          {t('documents.unverifiedCount', { count: unverified.length })}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Badge color="teal" size={size} variant={variant} leftSection={<IconCircleCheck size={12} />}>
      {t('documents.complete')}
    </Badge>
  );
}
