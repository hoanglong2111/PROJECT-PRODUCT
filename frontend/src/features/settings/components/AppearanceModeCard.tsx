import { Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconPalette } from '@tabler/icons-react';
import type { AppearanceMode } from '@shared/preferences/WorkspacePreferencesContext';
import { useI18n } from '@shared/i18n';

type Props = {
  appearanceMode: AppearanceMode;
  onChange: (mode: AppearanceMode) => void;
};

export function AppearanceModeCard({ appearanceMode, onChange }: Props) {
  const { appearanceModeLabel, t } = useI18n();

  const options: { label: AppearanceModeLabel; value: AppearanceMode }[] = [
    { label: appearanceModeLabel('light'), value: 'light' },
    { label: appearanceModeLabel('dark'), value: 'dark' },
    { label: appearanceModeLabel('auto'), value: 'auto' },
  ];

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconPalette size={20} />
          <Text fw={700}>{t('settings.appearanceMode')}</Text>
        </Group>
        <SegmentedControl
          data={options}
          value={appearanceMode}
          onChange={(value) => onChange(value as AppearanceMode)}
        />
        <Text c="dimmed" size="sm">
          {t('settings.appearanceModeDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}

type AppearanceModeLabel = string;
