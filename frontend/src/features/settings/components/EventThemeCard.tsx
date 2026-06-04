import { Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconBulb } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import { eventThemes, getAutoEventTheme } from '@shared/theme/eventThemes';
import type { EventThemeId } from '@shared/theme/eventThemes';

type Props = {
  eventTheme: EventThemeId;
  onChange: (theme: EventThemeId) => void;
};

export function EventThemeCard({ eventTheme, onChange }: Props) {
  const { t } = useI18n();

  const autoTheme = getAutoEventTheme();
  const showAutoHint = autoTheme !== 'none' && eventTheme !== autoTheme;

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconBulb size={20} />
          <Text fw={700}>{t('settings.eventTheme')}</Text>
        </Group>
        <SimpleGrid cols={{ base: 3, sm: 5 }} spacing="sm">
          {(Object.keys(eventThemes) as EventThemeId[]).map((themeId) => {
            const ev = eventThemes[themeId];
            const isActive = eventTheme === themeId;
            return (
              <Button
                key={themeId}
                variant={isActive ? 'filled' : 'default'}
                size="compact-sm"
                radius="md"
                onClick={() => onChange(themeId)}
              >
                <Group gap={6}>
                  <span style={{ fontSize: 14 }}>{ev.emoji}</span>
                  {t(`settings.eventThemes.${themeId}`)}
                </Group>
              </Button>
            );
          })}
        </SimpleGrid>
        {showAutoHint && (
          <Text c="dimmed" size="sm">
            {t('settings.eventThemeAutoDetected', {
              emoji: eventThemes[autoTheme].emoji,
              name: t(`settings.eventThemes.${autoTheme}`),
            })}
          </Text>
        )}
        <Text c="dimmed" size="sm">
          {t('settings.eventThemeDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
