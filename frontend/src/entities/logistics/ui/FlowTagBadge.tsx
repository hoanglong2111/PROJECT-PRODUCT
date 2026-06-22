import { Badge, Group } from '@mantine/core';

import type { BusinessFlowTag } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';

const flowTagColor: Record<BusinessFlowTag, string> = {
  BULK_PURCHASE: 'indigo',
  CONTAINER_CONSOLIDATION: 'grape',
  LINEAR: 'blue',
  PARTIAL_DELIVERY: 'orange',
  SPLIT_PURCHASE: 'cyan',
};

export function FlowTagBadge({ compact = false, tags }: { compact?: boolean; tags?: BusinessFlowTag[] }) {
  const { flowTagLabel } = useI18n();
  const visibleTags = (tags ?? []).filter((tag) => tag !== 'LINEAR');

  if (visibleTags.length === 0) return null;

  return (
    <Group gap={4}>
      {visibleTags.map((tag) => (
        <Badge key={tag} color={flowTagColor[tag]} size={compact ? 'xs' : 'sm'} variant="light">
          {flowTagLabel(tag)}
        </Badge>
      ))}
    </Group>
  );
}
