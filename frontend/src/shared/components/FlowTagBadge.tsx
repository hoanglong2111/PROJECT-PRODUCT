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
  const visibleTags = tags && tags.length > 0 ? tags : ['LINEAR' as const];

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
