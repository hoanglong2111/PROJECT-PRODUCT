import { Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconPalette } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import { colorPresets } from '@shared/theme/colorPresets';
import type { ColorPresetId } from '@shared/theme/colorPresets';

type Props = {
  colorPreset: ColorPresetId;
  onChange: (preset: ColorPresetId) => void;
};

export function ColorPresetGrid({ colorPreset, onChange }: Props) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconPalette size={20} />
          <Text fw={700}>{t('settings.colorPreset')}</Text>
        </Group>
        <SimpleGrid cols={{ base: 3, sm: 5 }} spacing="sm">
          {(Object.keys(colorPresets) as ColorPresetId[]).map((presetId) => {
            const preset = colorPresets[presetId];
            const isActive = colorPreset === presetId;
            return (
              <Button
                key={presetId}
                variant={isActive ? 'filled' : 'default'}
                size="compact-sm"
                radius="md"
                onClick={() => onChange(presetId)}
                style={{
                  borderColor: isActive ? undefined : `var(--mantine-color-${preset.primaryColor}-filled)`,
                  borderWidth: isActive ? 0 : 1.5,
                }}
              >
                <Group gap={6}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: `var(--mantine-color-${preset.primaryColor}-filled)`,
                      flexShrink: 0,
                    }}
                  />
                  {t(`settings.colorPresets.${presetId}`)}
                </Group>
              </Button>
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
