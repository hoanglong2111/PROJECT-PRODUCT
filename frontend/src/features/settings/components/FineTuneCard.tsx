import { Badge, Button, Group, Paper, Slider, Stack, Text } from '@mantine/core';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@shared/i18n';
import {
  FINE_TUNE_LEVELS,
  TRANSPARENCY_LEVELS,
  type FineTuneLevel,
  type SurfaceTransparency,
} from '@shared/preferences/fineTune';
import type { VisualTheme } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  colorIntensityLevel: FineTuneLevel;
  contrastLevel: FineTuneLevel;
  dimLevel: FineTuneLevel;
  onColorIntensityChange: (level: FineTuneLevel) => void;
  onContrastChange: (level: FineTuneLevel) => void;
  onDimChange: (level: FineTuneLevel) => void;
  onReset: () => void;
  onTransparencyChange: (level: SurfaceTransparency) => void;
  transparencyLevel: SurfaceTransparency;
  visualTheme: VisualTheme;
};

function TuneSlider<T extends string>({ label, level, levels, locked, onChange, valueLabel }: {
  label: string;
  level: T;
  levels: readonly T[];
  locked: boolean;
  onChange: (level: T) => void;
  valueLabel: (level: T) => string;
}) {
  const value = Math.max(0, levels.indexOf(level));
  const [dragValue, setDragValue] = useState(value);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setDragValue(value);
  }, [value]);

  const updateValue = (nextValue: number) => {
    setDragValue(nextValue);
    const nextLevel = levels[Math.round(nextValue)];
    if (nextLevel !== level) onChange(nextLevel);
  };

  return (
    <div className="settings-tuner-control">
      <Group justify="space-between" gap="sm" wrap="nowrap">
        <Text fw={600} size="sm">{label}</Text>
        <Badge size="sm" variant="light">{valueLabel(level)}</Badge>
      </Group>
      <Slider
        aria-label={label}
        className="settings-tuner-slider"
        disabled={locked}
        label={(nextValue) => valueLabel(levels[Math.round(nextValue)])}
        marks={levels.map((_, index) => ({ value: index }))}
        max={levels.length - 1}
        min={0}
        onChange={updateValue}
        onChangeEnd={(nextValue) => {
          draggingRef.current = false;
          setDragValue(Math.round(nextValue));
        }}
        onPointerDown={() => {
          draggingRef.current = true;
        }}
        step={0.01}
        value={dragValue}
      />
      <Group className="settings-tuner-range-labels" justify="space-between" wrap="nowrap">
        <Text c="dimmed" size="xs">{valueLabel(levels[0])}</Text>
        <Text c="dimmed" size="xs">{valueLabel(levels[levels.length - 1])}</Text>
      </Group>
    </div>
  );
}

export function FineTuneCard(props: Props) {
  const { t } = useI18n();
  const locked = props.visualTheme === 'high-contrast';
  const changed = [props.colorIntensityLevel, props.dimLevel, props.contrastLevel, props.transparencyLevel]
    .some((level) => level !== 'medium');
  return (
    <Paper withBorder p="lg" className="settings-fine-tune-card">
      <Stack gap="md">
        <Group className="settings-fine-tune-header" justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <IconAdjustmentsHorizontal size={20} />
            <div>
              <Text fw={700}>{t('settings.fineTune')}</Text>
              <Text c="dimmed" size="sm">{t('settings.fineTuneDescription')}</Text>
            </div>
          </Group>
          {changed ? <Button variant="subtle" size="xs" onClick={props.onReset}>{t('settings.fineTuneReset')}</Button> : null}
        </Group>
        {locked ? <Text size="sm" c="orange">{t('settings.fineTuneHighContrastLocked')}</Text> : null}
        <div className="settings-tuner-selectors">
          <TuneSlider label={t('settings.colorIntensity')} level={props.colorIntensityLevel} levels={FINE_TUNE_LEVELS}
            locked={locked} onChange={props.onColorIntensityChange} valueLabel={(level) => t(`settings.fineTuneLevels.${level}`)} />
          <TuneSlider label={t('settings.dimLevel')} level={props.dimLevel} levels={FINE_TUNE_LEVELS}
            locked={locked} onChange={props.onDimChange} valueLabel={(level) => t(`settings.fineTuneLevels.${level}`)} />
          <TuneSlider label={t('settings.contrastLevel')} level={props.contrastLevel} levels={FINE_TUNE_LEVELS}
            locked={locked} onChange={props.onContrastChange} valueLabel={(level) => t(`settings.fineTuneLevels.${level}`)} />
          <TuneSlider label={t('settings.transparency')} level={props.transparencyLevel} levels={TRANSPARENCY_LEVELS}
            locked={locked} onChange={props.onTransparencyChange} valueLabel={(level) => t(`settings.transparencyLevels.${level}`)} />
        </div>
        <div className={`settings-transparency-preview is-${props.transparencyLevel}`} aria-label={t('settings.transparencyPreview')}>
          <span /><span /><span />
        </div>
      </Stack>
    </Paper>
  );
}
