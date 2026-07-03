import { Group, Paper, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPalette } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import { colorPresets } from '@shared/theme/colorPresets';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import type { ColorPresetId } from '@shared/theme/colorPresets';

type Props = {
  colorPreset: ColorPresetId;
  onChange: (preset: ColorPresetId) => void;
};

export function ColorPresetGrid({ colorPreset, onChange }: Props) {
  const { t } = useI18n();
  const { resolvedColorScheme } = useWorkspacePreferences();

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconPalette size={20} />
            <Text fw={700}>{t('settings.colorPreset')}</Text>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 3, sm: 4, lg: 5 }} spacing="sm">
          {(Object.keys(colorPresets) as ColorPresetId[]).map((presetId) => {
            const preset = colorPresets[presetId];
            const isPresetActive = colorPreset === presetId;
            const colors = preset.colors[resolvedColorScheme] ?? preset.colors.light;

            const swatchColors = [colors[3], colors[5], colors[7]];

            return (
              <UnstyledButton
                key={presetId}
                className={`settings-swatch-card ${isPresetActive ? 'is-active' : ''}`}
                onClick={() => onChange(presetId)}
              >
                <div className="settings-swatch-gradient">
                  {swatchColors.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                  {isPresetActive && (
                    <div className="settings-swatch-checkmark">
                      <IconCheck size={18} stroke={3} />
                    </div>
                  )}
                </div>
                <span className="settings-swatch-label">
                  {t(`settings.colorPresets.${presetId}`)}
                </span>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>

        <Text c="dimmed" size="sm">
          {t('settings.colorPresetDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
