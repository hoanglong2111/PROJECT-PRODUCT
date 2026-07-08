import type { CSSProperties } from 'react';
import { Group, ScrollArea, Stack, UnstyledButton } from '@mantine/core';

import { getStatusBadgeConfig } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { PO_STAGES, STAGE_BY_STATUS, type PoStageKey } from '../model/poStageConfig';
import type { PurchaseOrderStatusFilter } from '../model/purchaseOrderModel';

type PoStageFilterProps = {
  value: PurchaseOrderStatusFilter;
  onChange: (value: PurchaseOrderStatusFilter) => void;
  stageCounts: Record<string, number>;
  subStageCounts: Record<string, number>;
  totalCount: number;
};

const statusColorTokens: Record<string, string> = {
  blue: 'var(--kbfe-status-blue)',
  cyan: 'var(--kbfe-status-cyan)',
  gray: 'var(--kbfe-status-gray)',
  green: 'var(--kbfe-status-teal)',
  orange: 'var(--kbfe-status-orange)',
  red: 'var(--kbfe-status-red)',
  teal: 'var(--kbfe-status-teal)',
  yellow: 'var(--kbfe-status-yellow)',
};

function colorVar(color: string): CSSProperties {
  return { '--chip-color': statusColorTokens[color] ?? 'var(--kbfe-primary-color)' } as CSSProperties;
}

function activeStageOf(value: string): PoStageKey | null {
  if (value === 'all') return null;
  if (value.startsWith('stage:')) return value.slice(6) as PoStageKey;
  return STAGE_BY_STATUS[value] ?? null;
}

export function PoStageFilter({ value, onChange, stageCounts, subStageCounts, totalCount }: PoStageFilterProps) {
  const { statusLabel, t } = useI18n();
  const activeStage = activeStageOf(value);
  const activeStageDef = activeStage ? PO_STAGES.find((stage) => stage.key === activeStage) : undefined;
  const showSubChips = Boolean(activeStageDef && activeStageDef.members.length > 1);
  const activeStageTotal = activeStageDef ? stageCounts[activeStageDef.key] ?? 0 : 0;

  return (
    <Stack gap="xs">
      <ScrollArea type="never" offsetScrollbars={false}>
        <Group gap="xs" wrap="nowrap" className="po-stage-filter">
          <StageChip
            active={value === 'all'}
            color="gray"
            label={t('common.all')}
            count={totalCount}
            onClick={() => onChange('all')}
          />
          {PO_STAGES.map((stage) => (
            <StageChip
              key={stage.key}
              active={activeStage === stage.key}
              color={getStatusBadgeConfig(stage.key).color}
              label={statusLabel(stage.labelKey)}
              count={stageCounts[stage.key] ?? 0}
              onClick={() => onChange(`stage:${stage.key}`)}
            />
          ))}
        </Group>
      </ScrollArea>

      {showSubChips && activeStageDef ? (
        <ScrollArea type="never" offsetScrollbars={false}>
          <Group gap={6} wrap="nowrap" className="po-stage-subfilter">
            <SubChip
              active={value === `stage:${activeStageDef.key}`}
              label={`${t('common.all')} ${statusLabel(activeStageDef.labelKey)}`}
              count={activeStageTotal}
              onClick={() => onChange(`stage:${activeStageDef.key}`)}
            />
            {activeStageDef.members.map((status) => (
              <SubChip
                key={status}
                active={value === status}
                label={statusLabel(status)}
                count={subStageCounts[status] ?? 0}
                onClick={() => onChange(status)}
              />
            ))}
          </Group>
        </ScrollArea>
      ) : null}
    </Stack>
  );
}

function StageChip({
  active,
  color,
  label,
  count,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={colorVar(color)}
      className={`po-stage-chip dl-chip${active ? ' is-active' : ''}`}
    >
      <span className="po-stage-chip-dot dl-chip-dot" aria-hidden="true" />
      <span className="po-stage-chip-label">{label}</span>
      <span className="po-stage-chip-count dl-chip-count">{count}</span>
    </UnstyledButton>
  );
}

function SubChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`po-stage-subchip${active ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
    >
      <span className="po-stage-subchip-label">{label}</span>
      <span className="po-stage-subchip-count">{count}</span>
    </UnstyledButton>
  );
}
