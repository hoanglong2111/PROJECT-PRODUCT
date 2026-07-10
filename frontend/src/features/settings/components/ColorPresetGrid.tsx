import { ActionIcon, Button, Group, Menu, Modal, Paper, SimpleGrid, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconDots, IconEdit, IconPalette, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import { colorPresets } from '@shared/theme/colorPresets';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import type { ColorPresetId } from '@shared/theme/colorPresets';
import { validatePresetName, type FineTunePreset } from '@shared/preferences/fineTune';

type Props = {
  colorPreset: ColorPresetId;
  onChange: (preset: ColorPresetId) => void;
  presets: FineTunePreset[];
  onApplyPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onRenamePreset: (id: string, name: string) => void;
  onSavePreset: (name: string) => void;
};

export function ColorPresetGrid({ colorPreset, onChange, presets, onApplyPreset, onDeletePreset, onRenamePreset, onSavePreset }: Props) {
  const { t } = useI18n();
  const { resolvedColorScheme } = useWorkspacePreferences();
  const [dialog, setDialog] = useState<{ mode: 'create' } | { mode: 'rename' | 'delete'; preset: FineTunePreset } | null>(null);
  const [name, setName] = useState('');
  const error = dialog?.mode === 'delete' ? null : validatePresetName(name, presets, dialog?.mode === 'rename' ? dialog.preset.id : undefined);
  const openNameDialog = (next: { mode: 'create' } | { mode: 'rename'; preset: FineTunePreset }) => {
    setName(next.mode === 'rename' ? next.preset.name : ''); setDialog(next);
  };

  return (
    <Paper withBorder p="lg" className="settings-palette-card">
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

            const swatchColors = resolvedColorScheme === 'dark' ? [colors[8], colors[5], colors[2]] : [colors[1], colors[5], colors[9]];

            return (
              <Tooltip key={presetId} label={t(`settings.colorPresets.${presetId}`)} openDelay={250}>
              <UnstyledButton
                key={presetId}
                className={`settings-swatch-card ${isPresetActive ? 'is-active' : ''}`}
                onClick={() => onChange(presetId)}
                aria-label={t(`settings.colorPresets.${presetId}`)}
                aria-pressed={isPresetActive}
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
              </UnstyledButton>
              </Tooltip>
            );
          })}
        </SimpleGrid>
        <div className="settings-preset-section">
          <Group justify="space-between" gap="sm">
            <div><Text fw={700} size="sm">{t('settings.myFineTunePresets')}</Text>
              <Text c="dimmed" size="xs">{t('settings.myFineTunePresetsDescription')}</Text></div>
            <Button size="xs" variant="light" leftSection={<IconPlus size={15} />} onClick={() => openNameDialog({ mode: 'create' })}>
              {t('settings.saveCurrentPreset')}
            </Button>
          </Group>
          {presets.length === 0 ? <Text className="settings-preset-empty" c="dimmed" size="sm">{t('settings.noFineTunePresets')}</Text> : (
            <Stack gap="xs" mt="sm">{presets.map((preset) => <Group key={preset.id} className="settings-preset-row" gap="xs" wrap="nowrap">
              <UnstyledButton className="settings-preset-apply" onClick={() => onApplyPreset(preset.id)}>
                <Text fw={600} size="sm">{preset.name}</Text>
                <Text c="dimmed" size="xs">{[preset.colorIntensityLevel, preset.dimLevel, preset.contrastLevel, preset.transparencyLevel].map((v) => t(`settings.fineTuneShort.${v}`)).join(' · ')}</Text>
              </UnstyledButton>
              <Menu position="bottom-end"><Menu.Target><ActionIcon variant="subtle" aria-label={t('settings.presetActions')}><IconDots size={17} /></ActionIcon></Menu.Target>
                <Menu.Dropdown><Menu.Item leftSection={<IconEdit size={15} />} onClick={() => openNameDialog({ mode: 'rename', preset })}>{t('settings.renamePresetAction')}</Menu.Item>
                  <Menu.Item color="red" leftSection={<IconTrash size={15} />} onClick={() => setDialog({ mode: 'delete', preset })}>{t('common.delete')}</Menu.Item></Menu.Dropdown>
              </Menu>
            </Group>)}</Stack>
          )}
        </div>
      </Stack>
<<<<<<< HEAD
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
=======
      <Modal opened={dialog !== null} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? t('settings.savePresetTitle') : dialog?.mode === 'rename' ? t('settings.renamePresetTitle') : t('settings.deletePresetTitle')} centered>
        {dialog?.mode === 'delete' ? <><Text size="sm">{t('settings.deletePresetConfirm', { name: dialog.preset.name })}</Text><Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setDialog(null)}>{t('common.cancel')}</Button><Button color="red" onClick={() => { onDeletePreset(dialog.preset.id); setDialog(null); }}>{t('common.delete')}</Button></Group></> : <>
          <TextInput autoFocus label={t('settings.presetName')} value={name} maxLength={40} onChange={(event) => setName(event.currentTarget.value)} error={name.length > 0 && error ? t(`settings.presetNameError.${error}`) : undefined} />
          <Group justify="flex-end" mt="lg"><Button variant="default" onClick={() => setDialog(null)}>{t('common.cancel')}</Button><Button disabled={error !== null} onClick={() => { if (!dialog || error) return; if (dialog.mode === 'create') { onSavePreset(name); } else { onRenamePreset(dialog.preset.id, name); } setDialog(null); }}>{t('common.save')}</Button></Group>
        </>}
      </Modal>
>>>>>>> main
    </Paper>
  );
}
