import { Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconDropletHalf2 } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import type { SurfaceTransparency, VisualTheme } from '@shared/preferences/WorkspacePreferencesContext';

type Props = { onChange: (value: SurfaceTransparency) => void; transparency: SurfaceTransparency; visualTheme: VisualTheme };

export function TransparencyCard({ onChange, transparency, visualTheme }: Props) {
  const { t } = useI18n();
  const locked = visualTheme === 'high-contrast';
  return <Paper withBorder p="lg" className="settings-transparency-card"><Stack gap="sm">
    <Group gap="sm"><IconDropletHalf2 size={20} /><Text fw={700}>{t('settings.transparency')}</Text></Group>
    <SegmentedControl fullWidth disabled={locked} data={(['low', 'medium', 'high', 'ultra'] as const).map((value) => ({
      label: t(`settings.transparencyLevels.${value}`), value,
    }))} onChange={(value) => onChange(value as SurfaceTransparency)} value={transparency} />
    <div className={`settings-transparency-preview is-${transparency}`} aria-label={t('settings.transparencyPreview')}>
      <span /><span /><span />
    </div>
    <Text c="dimmed" size="sm">{locked ? t('settings.transparencyLockedHint') : t('settings.transparencyDescription')}</Text>
  </Stack></Paper>;
}
