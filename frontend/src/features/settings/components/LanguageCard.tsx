import { Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconLanguage } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';
import type { WorkspaceLanguage } from '@shared/preferences/WorkspacePreferencesContext';

type Props = {
  language: WorkspaceLanguage;
  onChange: (language: WorkspaceLanguage) => void;
};

export function LanguageCard({ language, onChange }: Props) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconLanguage size={20} />
          <Text fw={700}>{t('settings.language')}</Text>
        </Group>
        <SegmentedControl
          data={[
            { label: 'VN', value: 'vi' },
            { label: 'EN', value: 'en' },
          ]}
          value={language}
          onChange={(value) => onChange(value as WorkspaceLanguage)}
        />
        <Text c="dimmed" size="sm">
          {t('settings.languageDescription')}
        </Text>
      </Stack>
    </Paper>
  );
}
