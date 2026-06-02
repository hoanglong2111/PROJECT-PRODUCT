import { Button, Center, Container, Group, Paper, SimpleGrid, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import { useNavigate, Link } from 'react-router-dom';
import { IconArrowLeft, IconChecklist, IconLayoutDashboard, IconMapPinOff, IconSettings } from '@tabler/icons-react';

import { useI18n } from '@shared/i18n';

export function NotFound() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Center style={{ minHeight: 'calc(100vh - 128px)', padding: '2rem 1rem' }}>
      <Container size="md">
        <Paper
          withBorder
          p={{ base: 'xl', md: 50 }}
          radius="lg"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--kbfe-surface-elevated)',
            backdropFilter: 'blur(16px)',
            boxShadow: 'var(--kbfe-shadow-lg)',
            border: '1px solid var(--kbfe-border-primary)',
          }}
        >
          {/* Subtle Ambient Glowing Background element */}
          <div
            style={{
              position: 'absolute',
              top: '-150px',
              right: '-150px',
              width: '350px',
              height: '350px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, transparent 70%)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40} style={{ position: 'relative', zIndex: 1 }}>
            <Stack justify="center" gap="lg">
              <Group gap="xs">
                <ThemeIcon size={44} radius="md" color="teal" variant="light">
                  <IconMapPinOff size={24} />
                </ThemeIcon>
                <Text size="sm" fw={700} lts="0.05em" tt="uppercase" c="teal">
                  Error 404
                </Text>
              </Group>

              <div>
                <Title order={1} fw={900} size="3.5rem" style={{ lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>
                  404
                </Title>
                <Title order={2} fw={800} mt="xs" style={{ textWrap: 'balance' }}>
                  {t('notFound.title')}
                </Title>
                <Text c="dimmed" mt="md" size="sm" style={{ textWrap: 'pretty', lineHeight: 1.6 }}>
                  {t('notFound.description')}
                </Text>
              </div>

              <Group gap="sm" mt="md">
                <Button
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate(-1)}
                  variant="outline"
                  radius="md"
                >
                  {t('pageFeedback.retry') || 'Back'}
                </Button>
                <Button
                  leftSection={<IconLayoutDashboard size={16} />}
                  onClick={() => navigate('/')}
                  variant="filled"
                  color="teal"
                  radius="md"
                >
                  {t('notFound.action')}
                </Button>
              </Group>
            </Stack>

            <Center>
              <Stack gap="md" style={{ width: '100%' }}>
                <Text size="xs" fw={700} lts="0.05em" tt="uppercase" c="dimmed">
                  Quick Navigation
                </Text>

                <Paper
                  withBorder
                  p="sm"
                  component={Link}
                  to="/"
                  radius="md"
                  className="metric-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 200ms ease',
                  }}
                >
                  <ThemeIcon size={40} radius="md" variant="light" color="blue">
                    <IconLayoutDashboard size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {t('shell.dashboard')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Control tower hub & real-time analytics
                    </Text>
                  </div>
                </Paper>

                <Paper
                  withBorder
                  p="sm"
                  component={Link}
                  to="/tasks"
                  radius="md"
                  className="metric-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 200ms ease',
                  }}
                >
                  <ThemeIcon size={40} radius="md" variant="light" color="teal">
                    <IconChecklist size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {t('shell.tasks')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Your checklist & logistical operations
                    </Text>
                  </div>
                </Paper>

                <Paper
                  withBorder
                  p="sm"
                  component={Link}
                  to="/settings"
                  radius="md"
                  className="metric-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 200ms ease',
                  }}
                >
                  <ThemeIcon size={40} radius="md" variant="light" color="gray">
                    <IconSettings size={20} />
                  </ThemeIcon>
                  <div>
                    <Text fw={600} size="sm">
                      {t('shell.settings')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Theme preferences & local customizations
                    </Text>
                  </div>
                </Paper>
              </Stack>
            </Center>
          </SimpleGrid>
        </Paper>
      </Container>
    </Center>
  );
}

export default NotFound;
