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
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { reportRenderError } from '@shared/lib/errors';

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
  const columnItems = columns.map((label, index) => ({
    id: `${index}-${label}`,
    label,
  }));

  return (
    <Stack gap="lg" aria-busy="true" className="page-loading-layout">
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

      <Paper withBorder p="md" className="page-loading-filter">
        <SimpleGrid cols={{ base: 1, md: Math.min(columnItems.length, 4) }}>
          {columnItems.slice(0, 4).map((column) => (
            <Skeleton key={column.id} height={38} radius="md" />
          ))}
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0} className="page-loading-table">
        <ScrollArea>
          <Table miw={920} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                {columnItems.map((column) => (
                  <Table.Th key={column.id}>{column.label}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Array.from({ length: 6 }).map((_, rowIndex) => (
                <Table.Tr key={rowIndex}>
                  {columnItems.map((column, columnIndex) => (
                    <Table.Td key={`${rowIndex}-${column.id}`}>
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
    <Center h="100dvh" p="md">
      <Paper withBorder p="xl" maw={520} w="100%" className="page-state-panel">
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

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportRenderError(error, info);
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

/**
 * Full-page fallback used by the app-level boundary (e.g. a lazy chunk failed to
 * load, or the shell/auth layer threw before any route mounted).
 */
export function FullPageError({
  actionLabel,
  description,
  error,
  onReload,
  title,
}: {
  actionLabel: string;
  description: string;
  error?: unknown;
  onReload: () => void;
  title: string;
}) {
  const { t } = useI18n();

  return (
    <Center h="100dvh" p="md">
      <Paper withBorder p="xl" maw={520} w="100%">
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

          <Button
            leftSection={<IconRefresh size={16} />}
            variant="filled"
            onClick={onReload}
            w={{ base: '100%', sm: 200 }}
          >
            {actionLabel}
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}

/**
 * App-level (root) error boundary. Catches anything the per-route boundary can't:
 * lazy chunk-load rejections surfaced through Suspense, and throws in the shell,
 * auth, or public pages. Recovery is a hard reload (safest for a failed chunk).
 */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <AppErrorBoundaryInner
      title={t('pageFeedback.appErrorTitle')}
      description={t('pageFeedback.appErrorDescription')}
      reloadLabel={t('pageFeedback.reload')}
    >
      {children}
    </AppErrorBoundaryInner>
  );
}

class AppErrorBoundaryInner extends Component<
  { children: ReactNode; description: string; reloadLabel: string; title: string },
  { error: unknown }
> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportRenderError(error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <FullPageError
          title={this.props.title}
          description={this.props.description}
          error={this.state.error}
          actionLabel={this.props.reloadLabel}
          onReload={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
