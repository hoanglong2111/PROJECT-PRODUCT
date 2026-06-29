import { Alert, Group, Paper, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBulb, IconInfoCircle } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { useI18n } from '@shared/i18n';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import { colorPresets } from '@shared/theme/colorPresets';
import { eventThemes, getAutoEventTheme } from '@shared/theme/eventThemes';
import type { EventThemeId } from '@shared/theme/eventThemes';

type Props = {
  eventTheme: EventThemeId;
  onChange: (theme: EventThemeId) => void;
};

export function EventThemeCard({ eventTheme, onChange }: Props) {
  const { t } = useI18n();
  const { resolvedColorScheme } = useWorkspacePreferences();

  const autoTheme = getAutoEventTheme();
  const showAutoHint = autoTheme !== 'none' && eventTheme !== autoTheme;

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        <Group gap="sm">
          <IconBulb size={20} />
          <Text fw={700}>{t('settings.eventTheme')}</Text>
        </Group>

        {showAutoHint && (
          <Alert
            variant="light"
            color="teal"
            title={t('common.info')}
            icon={<IconInfoCircle size={18} />}
          >
            {t('settings.eventThemeAutoDetected', {
              name: t(`settings.eventThemes.${(eventThemes[autoTheme] ?? eventThemes.none).id}`),
            })}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 3, sm: 5, lg: 9 }} spacing="sm">
          {(Object.keys(eventThemes) as EventThemeId[]).map((themeId) => {
            const ev = eventThemes[themeId];
            const isActive = eventTheme === themeId;
            const fallbackPalette = colorPresets.teal.colors[resolvedColorScheme];
            const palette = colorPresets[ev.colorPresetId]?.colors[resolvedColorScheme] ?? fallbackPalette;
            const eventAccent = resolvedColorScheme === 'dark'
              ? ev.accentOverride?.primaryDark ?? palette[7]
              : ev.accentOverride?.primaryLight ?? palette[6];
            return (
              <UnstyledButton
                key={themeId}
                className={`settings-event-card ${isActive ? 'is-active' : ''}`}
                onClick={() => onChange(themeId)}
              >
                <span
                  className="settings-event-mark"
                  style={{ '--settings-event-accent': eventAccent } as CSSProperties}
                  aria-hidden="true"
                />
                <span className="settings-swatch-label">
                  {t(`settings.eventThemes.${themeId}`)}
                </span>
                {themeId === 'none' && (
                  <Text size="10px" c="dimmed" mt={2} style={{ textAlign: 'center' }}>
                    {t('settings.eventThemeDefaultHint')}
                  </Text>
                )}
              </UnstyledButton>
            );
          })}
        </SimpleGrid>

        <Text c="dimmed" size="sm">
          {t('settings.eventThemeDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
