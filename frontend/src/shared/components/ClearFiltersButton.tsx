import { ActionIcon, Button, Tooltip } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';

/**
 * Standard "clear filters" control. `variant="text"` (default) is the
 * labeled toolbar button used by list screens; `variant="icon"` is the
 * compact icon-only control used by the dense master-data toolbar and
 * renders nothing when there is nothing to clear.
 */
export function ClearFiltersButton({
  className,
  hasActiveFilters,
  label,
  onClick,
  variant = 'text',
}: {
  className?: string;
  hasActiveFilters: boolean;
  label: string;
  onClick: () => void;
  variant?: 'icon' | 'text';
}) {
  if (variant === 'icon') {
    if (!hasActiveFilters) return null;
    return (
      <Tooltip label={label}>
        <ActionIcon variant="subtle" c="var(--kbfe-text-secondary)" size="lg" onClick={onClick} aria-label={label}>
          <IconRefresh size={16} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Button
      className={className}
      variant={hasActiveFilters ? 'light' : 'subtle'}
      leftSection={<IconX size={16} />}
      onClick={onClick}
      disabled={!hasActiveFilters}
    >
      {label}
    </Button>
  );
}
