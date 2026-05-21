import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';

import { useI18n } from '@shared/i18n';

export function Unauthorized() {
  const { t } = useI18n();

  return (
    <Center h="100vh" p="md">
      <Paper withBorder p="xl" maw={520}>
        <Stack>
          <Title order={2}>{t('unauthorized.title')}</Title>
          <Text c="dimmed">
            {t('unauthorized.description')}
          </Text>
          <Button component={Link} to="/" variant="light">
            {t('unauthorized.action')}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
