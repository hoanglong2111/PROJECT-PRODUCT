import type { CSSProperties, ReactNode } from 'react';
import { Group, UnstyledButton } from '@mantine/core';

export type FilterSegmentOption = {
  value: string;
  label: ReactNode;
  count?: number;
  /** Mantine color name (e.g. 'red', 'teal') used to tint the active pill + badge. */
  color?: string;
};

/**
 * FilterSegment — the shared "pill + count badge" status control (design-language
 * `dl-chip` row). This is a presentational primitive only: it renders the options
 * and calls `onChange`. It owns no filter state — the active value and handler come
 * from each page's own store/useState, so swapping a page from Mantine Tabs/Button
 * to this control changes presentation only, never logic.
 */
export function FilterSegment({
  ariaLabel,
  fill = false,
  onChange,
  options,
  value,
}: {
  ariaLabel?: string;
  fill?: boolean;
  onChange: (value: string) => void;
  options: FilterSegmentOption[];
  value: string;
}) {
  return (
    <Group
      className={`dl-chip-row${fill ? ' is-fill' : ''}`}
      gap="xs"
      wrap="nowrap"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        const style = option.color
          ? ({ '--chip-color': `var(--mantine-color-${option.color}-6)` } as CSSProperties)
          : undefined;
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
