import { Group, Paper, Select, Stack, Text } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useI18n } from '@shared/i18n';
import type { VisualTheme } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  visualTheme: VisualTheme;
  onChange: (theme: VisualTheme) => void;
};

export function VisualThemeCard({ visualTheme, onChange }: Props) {
  const { visualThemeLabel, t } = useI18n();

  const options = useMemo(
    () =>
      (['standard', 'high-contrast', 'eye-comfort'] as VisualTheme[]).map(
        (theme) => ({
          label: visualThemeLabel(theme),
          value: theme,
        }),
      ),
    [visualThemeLabel],
  );

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconSettings size={20} />
          <Text fw={700}>{t('settings.visualTheme')}</Text>
        </Group>
        <Select
          data={options}
          value={visualTheme}
          onChange={(value) => onChange((value ?? 'standard') as VisualTheme)}
        />
        <Text c="dimmed" size="sm">
          {t('settings.visualThemeDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
