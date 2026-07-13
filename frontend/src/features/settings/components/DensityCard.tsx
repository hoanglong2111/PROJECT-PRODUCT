import { Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import type { DensityPreference } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  density: DensityPreference;
  onChange: (density: DensityPreference) => void;
};

export function DensityCard({ density, onChange }: Props) {
  const { densityLabel, t } = useI18n();

  const options = [
    { label: densityLabel('standard'), value: 'standard' as const },
    { label: densityLabel('compact'), value: 'compact' as const },
  ];

  return (
    <Paper withBorder p="lg" className="settings-density-card">
      <Stack gap="sm">
        <Group gap="sm">
          <IconSettings size={20} />
          <Text fw={700}>{t('settings.density')}</Text>
        </Group>
        <SegmentedControl
          data={options}
          value={density}
          onChange={(value) => onChange(value as DensityPreference)}
        />
        <Text c="dimmed" size="sm">
          {t('settings.densityDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
