import { Button, Group, Paper, Slider, Stack, Text } from '@mantine/core';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import type { VisualTheme } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  colorIntensity: number;
  contrastLevel: number;
  dimLevel: number;
  onChangeColorIntensity: (value: number) => void;
  onChangeContrastLevel: (value: number) => void;
  onChangeDimLevel: (value: number) => void;
  onReset: () => void;
  visualTheme: VisualTheme;
};

const MARKS = [{ value: 0 }, { value: 50 }, { value: 100 }];

export function FineTuneCard({
  colorIntensity,
  contrastLevel,
  dimLevel,
  onChangeColorIntensity,
  onChangeContrastLevel,
  onChangeDimLevel,
  onReset,
  visualTheme,
}: Props) {
  const { t } = useI18n();
  const locked = visualTheme === 'high-contrast';
  const isDefault = colorIntensity === 100 && dimLevel === 0 && contrastLevel === 100;

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconAdjustmentsHorizontal size={20} />
            <Text fw={700}>{t('settings.fineTune')}</Text>
          </Group>
          <Button variant="subtle" size="xs" onClick={onReset} disabled={isDefault}>
            {t('settings.fineTuneReset')}
          </Button>
        </Group>
        <Text c="dimmed" size="sm">
          {t('settings.fineTuneDescription')}
        </Text>
        {locked ? (
          <Text size="sm" c="orange">
            {t('settings.fineTuneHighContrastLocked')}
          </Text>
        ) : null}

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('settings.colorIntensity')}
          </Text>
          <Text c="dimmed" size="xs">
            {t('settings.colorIntensityDescription')}
          </Text>
          <Slider
            disabled={locked}
            marks={MARKS}
            min={0}
            max={100}
            step={5}
            value={colorIntensity}
            onChange={onChangeColorIntensity}
            label={(value) => `${value}%`}
          />
        </Stack>

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('settings.dimLevel')}
          </Text>
          <Text c="dimmed" size="xs">
            {t('settings.dimLevelDescription')}
          </Text>
          <Slider
            disabled={locked}
            marks={MARKS}
            min={0}
            max={100}
            step={5}
            value={dimLevel}
            onChange={onChangeDimLevel}
            label={(value) => `${value}%`}
          />
        </Stack>

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {t('settings.contrastLevel')}
          </Text>
          <Text c="dimmed" size="xs">
            {t('settings.contrastLevelDescription')}
          </Text>
          <Slider
            disabled={locked}
            marks={MARKS}
            min={0}
            max={100}
            step={5}
            value={contrastLevel}
            onChange={onChangeContrastLevel}
            label={(value) => `${value}%`}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
