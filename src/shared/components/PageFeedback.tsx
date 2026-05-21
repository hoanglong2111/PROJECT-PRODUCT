import {
  Alert,
  Button,
  Center,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useI18n } from '@shared/i18n';

type PageLoadingProps = {
  description: string;
  metricCount?: number;
  tableColumns?: string[];
  title: string;
};

type PageErrorProps = {
  actionLabel?: string;
  description: string;
  error?: unknown;
  onRetry?: () => void;
  title: string;
};

export function PageLoading({
  description,
  metricCount = 3,
  tableColumns,
  title,
}: PageLoadingProps) {
  const { t } = useI18n();
  const columns = tableColumns ?? [
    t('pageFeedback.entity'),
    t('pageFeedback.owner'),
    t('pageFeedback.status'),
    t('pageFeedback.deadline'),
    t('pageFeedback.action'),
  ];

  return (
    <Stack gap="lg" aria-busy="true">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{title}</Title>
          <Text c="dimmed" mt={4}>
            {description}
          </Text>
        </div>
        <Skeleton height={36} width={148} radius="md" />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: metricCount }}>
        {Array.from({ length: metricCount }).map((_, index) => (
          <Paper key={index} withBorder p="md" className="metric-card">
            <Skeleton height={14} width="45%" mb="sm" />
            <Skeleton height={32} width="32%" />
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: Math.min(columns.length, 4) }}>
          {columns.slice(0, 4).map((column) => (
            <Skeleton key={column} height={38} radius="md" />
          ))}
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0}>
        <ScrollArea>
          <Table miw={920} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {columns.map((column) => (
                  <Table.Th key={column}>{column}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <Table.Tr key={rowIndex}>
                  {columns.map((column, columnIndex) => (
                    <Table.Td key={column}>
                      <Skeleton height={16} width={`${90 - columnIndex * 10}%`} />
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}

export function FullPageLoading({ description, title }: { description: string; title: string }) {
  return (
    <Center h="100vh" p="md">
      <Paper withBorder p="xl" maw={520} w="100%">
        <Stack gap="md" align="center">
          <Skeleton height={44} circle />
          <div>
            <Title order={3} ta="center">
              {title}
            </Title>
            <Text c="dimmed" size="sm" ta="center" mt={4}>
              {description}
            </Text>
          </div>
        </Stack>
      </Paper>
    </Center>
  );
}

export function PageError({ actionLabel, description, error, onRetry, title }: PageErrorProps) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg" className="page-state-panel page-state-panel-error">
      <Stack gap="md">
        <Group align="flex-start" gap="sm" wrap="nowrap">
          <ThemeIcon color="red" variant="light" size={42} radius="md">
            <IconAlertTriangle size={24} />
          </ThemeIcon>
          <div>
            <Title order={3}>{title}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {description}
            </Text>
          </div>
        </Group>

        {error ? (
          <Alert color="red" variant="light">
            {getErrorMessage(error, t('pageFeedback.defaultErrorDetail'))}
          </Alert>
        ) : null}

        {onRetry ? (
          <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={onRetry} w={{ base: '100%', sm: 180 }}>
            {actionLabel ?? t('pageFeedback.retry')}
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <RouteErrorBoundaryInner
      description={t('pageFeedback.routeErrorDescription')}
      resetKey={`${location.pathname}${location.search}`}
      title={t('pageFeedback.routeErrorTitle')}
    >
      {children}
    </RouteErrorBoundaryInner>
  );
}

class RouteErrorBoundaryInner extends Component<
  { children: ReactNode; description: string; resetKey: string; title: string },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <PageError
          title={this.props.title}
          description={this.props.description}
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }

    return this.props.children;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}
