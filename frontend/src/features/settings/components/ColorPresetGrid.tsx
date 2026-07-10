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
<<<<<<< Updated upstream
=======
      <Modal opened={dialog !== null} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? t('settings.savePresetTitle') : dialog?.mode === 'rename' ? t('settings.renamePresetTitle') : t('settings.deletePresetTitle')} centered>
        {dialog?.mode === 'delete' ? <><Text size="sm">{t('settings.deletePresetConfirm', { name: dialog.preset.name })}</Text><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setDialog(null)}>{t('common.cancel')}</Button><Button color="red" onClick={() => { onDeletePreset(dialog.preset.id); setDialog(null); }}>{t('common.delete')}</Button></Group></> : <>
          <TextInput autoFocus label={t('settings.presetName')} value={name} maxLength={40} onChange={(event) => setName(event.currentTarget.value)} error={name.length > 0 && error ? t(`settings.presetNameError.${error}`) : undefined} />
          <Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setDialog(null)}>{t('common.cancel')}</Button><Button disabled={error !== null} onClick={() => {
            if (!dialog || error) return;
            if (dialog.mode === 'create') {
              onSavePreset(name);
            } else {
              onRenamePreset(dialog.preset.id, name);
            }
            setDialog(null);
          }}>{t('common.save')}</Button></Group>
        </>}
      </Modal>
>>>>>>> Stashed changes
    </Paper>
  );
}
