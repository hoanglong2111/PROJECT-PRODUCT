import { Alert, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { IconBulb } from '@tabler/icons-react';
import { useI18n } from '@shared/i18n';

export function ThemePreview() {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg">
      <Stack gap="sm">
        <Group gap="sm">
          <IconBulb size={18} />
          <Text fw={700}>{t('settings.themeSystem')}</Text>
        </Group>
        <Text c="dimmed" size="sm">
          {t('settings.themeSystemDescription')}
        </Text>
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
