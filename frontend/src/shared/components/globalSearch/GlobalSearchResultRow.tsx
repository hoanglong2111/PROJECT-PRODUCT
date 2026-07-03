import { Badge, Box, Group, Text, UnstyledButton } from '@mantine/core';
import {
  IconClipboardList,
  IconFileInvoice,
  IconShoppingCart,
  IconTruckDelivery,
  IconUserCircle,
} from '@tabler/icons-react';

import type { GlobalSearchKind, GlobalSearchResult } from '@shared/api/system';
import { useI18n } from '@shared/i18n';

export const kindMeta: Record<
  GlobalSearchKind,
  {
    color: string;
    icon: typeof IconFileInvoice;
  }
> = {
  purchase_request: { color: 'blue', icon: IconFileInvoice },
  purchase_order: { color: 'teal', icon: IconShoppingCart },
  delivery_order: { color: 'orange', icon: IconTruckDelivery },
  task: { color: 'violet', icon: IconClipboardList },
  account: { color: 'gray', icon: IconUserCircle },
};

export function GlobalSearchResultRow({
  active,
  id,
  onActivate,
  onHover,
  result,
  surface,
}: {
  active: boolean;
  id?: string;
  onActivate: (result: GlobalSearchResult) => void;
  onHover: () => void;
  result: GlobalSearchResult;
  surface?: 'palette';
}) {
  const { searchKindLabel, statusLabel } = useI18n();
  const meta = kindMeta[result.kind];
  const Icon = meta.icon;

  return (
    <UnstyledButton
      aria-selected={active}
      className="global-search-result"
      data-active={active || undefined}
      data-surface={surface}
      id={id}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={onHover}
      onClick={() => onActivate(result)}
      role="option"
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Box className="global-search-result-icon" data-kind={result.kind}>
          <Icon size={16} />
        </Box>
        <Box flex={1} miw={0}>
          <Group gap="xs" wrap="nowrap">
            <Text fw={700} size="sm" lineClamp={1}>
              {result.title}
            </Text>
            <Badge color={meta.color} size="xs" variant="light">
              {searchKindLabel(result.kind)}
            </Badge>
          </Group>
          <Text c="dimmed" size="xs" lineClamp={1}>
            {result.subtitle}
          </Text>
        </Box>
        {result.status ? (
          <Badge color="gray" size="xs" variant="outline">
            {statusLabel(result.status)}
          </Badge>
        ) : null}
      </Group>
    </UnstyledButton>
  );
}
