import type { CSSProperties, ReactNode } from 'react';
import { Group, UnstyledButton } from '@mantine/core';

import { statusColorVar } from '@shared/components/statusColors';
import { getStatusBadgeConfig } from '@shared/components/StatusBadge';

export type FilterSegmentOption = {
  value: string;
  label: ReactNode;
  count?: number;
  /** Status color name used to tint the active pill + badge. */
  color?: string;
};

const semanticColors: Record<string, string> = {
  all: 'blue',
  blocked: 'red',
  cancelled: 'gray',
  completed: 'teal',
  confirmed: 'teal',
  customs: 'yellow',
  customsCleared: 'teal',
  customsWaiting: 'yellow',
  delivered: 'teal',
  delivering: 'orange',
  draft: 'gray',
  handover: 'cyan',
  in_progress: 'blue',
  in_transit: 'cyan',
  internationalTransit: 'cyan',
  issues: 'red',
  pending: 'yellow',
  processing: 'blue',
  quoted: 'yellow',
  received: 'cyan',
  rejected: 'red',
  submitted: 'blue',
  todo: 'gray',
  waiting: 'orange',
};

function optionColor(option: FilterSegmentOption) {
  if (option.color) return option.color;
  const semanticColor = semanticColors[option.value] ?? semanticColors[option.value.toLowerCase()];
  if (semanticColor) return semanticColor;
  return getStatusBadgeConfig(option.value.toUpperCase()).color;
}

/**
 * FilterSegment — the shared "pill + count badge" status control (design-language
 * `dl-chip` row). This is a presentational primitive only: it renders the options
 * and calls `onChange`. It owns no filter state — the active value and handler come
 * from each page's own store/useState, so swapping a page from Mantine Tabs/Button
 * to this control changes presentation only, never logic.
 */
export function FilterSegment({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel?: string;
  onChange: (value: string) => void;
  options: FilterSegmentOption[];
  value: string;
}) {
  return (
    <Group
      className="dl-chip-row"
      gap="xs"
      wrap="nowrap"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        const style = { '--chip-color': statusColorVar(optionColor(option)) } as CSSProperties;
        return (
          <UnstyledButton
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            style={style}
            className={`dl-chip${active ? ' is-active' : ''}`}
          >
            <span className="dl-chip-label">{option.label}</span>
            {option.count === undefined ? null : <span className="dl-chip-count">{option.count}</span>}
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
