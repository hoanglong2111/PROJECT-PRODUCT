import { Alert, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconBulb } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import { getEffectivePalette } from '@shared/theme/theme';
import { colorPresets } from '@shared/theme/colorPresets';

export function ThemePreview() {
  const { t } = useI18n();
  const { colorPreset, resolvedColorScheme } = useWorkspacePreferences();

  const preset = colorPresets[colorPreset] ?? colorPresets.teal;
  const colors = getEffectivePalette(colorPreset, resolvedColorScheme);

  // We display 5 representative shades of the current theme
  const previewShades = [
    { shade: 2, hex: colors[2], label: 'Light Accent' },
    { shade: 4, hex: colors[4], label: 'Subtle' },
    { shade: 6, hex: colors[6], label: 'Primary (Accent)' },
    { shade: 7, hex: colors[7], label: 'Primary Hover' },
    { shade: 8, hex: colors[8], label: 'Deep' },
  ];

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconBulb size={18} />
            <Text fw={700}>{t('settings.themeSystem')}</Text>
          </Group>
          <Badge variant="light" size="lg" color={preset.primaryColor}>
            {t(`settings.colorPresets.${colorPreset}`)}
          </Badge>
        </Group>

        <Text c="dimmed" size="sm">
          {t('settings.themeSystemDescription')}
        </Text>

        {/* Live Interactive Palette Bar */}
        <Stack gap="xs">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Live Palette Preview
          </Text>
          <div className="settings-palette-bar">
            {previewShades.map((shadeInfo) => (
              <div
                key={shadeInfo.shade}
                className="settings-palette-color"
                style={{ background: shadeInfo.hex }}
                title={`${shadeInfo.label}: ${shadeInfo.hex}`}
              />
            ))}
          </div>
        </Stack>

        <Group gap="sm">
          <Button variant="filled" size="compact-sm">
            {t('common.save')}
          </Button>
          <Button variant="default" size="compact-sm">
            {t('common.cancel')}
          </Button>
          <Badge variant="light">{t('common.status')}</Badge>
          <Badge color="red" variant="filled">
            {t('common.risk')}
          </Badge>
        </Group>

        <Alert color="blue" variant="light" icon={<IconBulb size={16} />}>
          {t('settings.appearanceModeDescription')}
        </Alert>
      </Stack>
    </Paper>
  );
}

