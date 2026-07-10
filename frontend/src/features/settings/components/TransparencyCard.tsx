import { Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconDropletHalf2 } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import type { SurfaceTransparency, VisualTheme } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  onChange: (transparency: SurfaceTransparency) => void;
  transparency: SurfaceTransparency;
  visualTheme: VisualTheme;
};

export function TransparencyCard({ onChange, transparency, visualTheme }: Props) {
  const { t } = useI18n();
  const highContrastActive = visualTheme === 'high-contrast';

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconDropletHalf2 size={20} />
          <Text fw={700}>{t('settings.transparency')}</Text>
        </Group>
        <SegmentedControl
          data={[
            { label: t('settings.transparencyFull'), value: 'full' },
            { label: t('settings.transparencyReduced'), value: 'reduced' },
          ]}
          onChange={(value) => onChange(value as SurfaceTransparency)}
          value={transparency}
        />
        <Text c="dimmed" size="sm">
          {highContrastActive ? t('settings.transparencyLockedHint') : t('settings.transparencyDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
