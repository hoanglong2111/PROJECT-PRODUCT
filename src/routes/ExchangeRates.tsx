import {
  Badge,
  Group,
  Loader,
  NumberFormatter,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconExchange, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { fetchExchangeRates } from '../api/system';
import { EmptyState } from '../components/EmptyState';
import { PageError, PageLoading } from '../components/PageFeedback';
import { useI18n } from '../i18n';

const baseCurrencyOptions = ['USD', 'VND', 'EUR', 'JPY', 'CNY', 'KRW', 'THB', 'SGD'].map((currency) => ({
  label: currency,
  value: currency,
}));
const quickCurrencyCodes = ['VND', 'USD', 'EUR', 'CNY'];

export function ExchangeRates() {
  const { t } = useI18n();
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [search, setSearch] = useState('');

  const exchangeRatesQuery = useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: () => fetchExchangeRates(baseCurrency),
  });

  const rates = exchangeRatesQuery.data?.rates ?? [];
  const updatedAtLabel = exchangeRatesQuery.data?.updatedAt
    ? new Date(exchangeRatesQuery.data.updatedAt).toLocaleString()
    : '-';

  const filteredRates = useMemo(() => {
    const normalizedSearch = search.trim().toUpperCase();
    if (!normalizedSearch) {
      return rates;
    }

    return rates.filter((item) => item.currency.includes(normalizedSearch));
  }, [rates, search]);

  const quickRates = useMemo(
    () =>
      quickCurrencyCodes
        .map((currency) => ({
          currency,
          rate: rates.find((item) => item.currency === currency)?.rate ?? null,
        }))
        .filter((item) => item.rate !== null),
    [rates],
  );

  if (exchangeRatesQuery.isError) {
    return (
      <PageError
        title={t('exchangeRates.errorTitle')}
        description={t('exchangeRates.errorDescription')}
        error={exchangeRatesQuery.error}
        onRetry={() => {
          void exchangeRatesQuery.refetch();
        }}
      />
    );
  }

  if (exchangeRatesQuery.isLoading) {
    return (
      <PageLoading
        title={t('exchangeRates.title')}
        description={t('exchangeRates.loadingDescription')}
        tableColumns={[t('exchangeRates.currency'), t('exchangeRates.rate')]}
      />
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('exchangeRates.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('exchangeRates.subtitle')}
          </Text>
        </div>
        <Badge leftSection={<IconExchange size={14} />} size="lg" variant="light">
          {exchangeRatesQuery.data?.provider}
        </Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Metric label={t('exchangeRates.base')} value={exchangeRatesQuery.data?.base ?? baseCurrency} />
        <Metric label={t('exchangeRates.totalCurrencies')} value={String(rates.length)} />
        <Metric label={t('exchangeRates.lastUpdated')} value={updatedAtLabel} />
      </SimpleGrid>

      {quickRates.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          {quickRates.map((item) => (
            <Metric
              key={item.currency}
              label={`${t('exchangeRates.oneBase')} ${baseCurrency}`}
              value={`${item.rate?.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${item.currency}`}
            />
          ))}
        </SimpleGrid>
      ) : null}

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <Select
            label={t('exchangeRates.baseCurrency')}
            data={baseCurrencyOptions}
            value={baseCurrency}
            onChange={(value) => setBaseCurrency(value ?? 'USD')}
            searchable
          />
          <TextInput
            label={t('common.search')}
            placeholder={t('exchangeRates.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Group justify="flex-end" align="end" gap="xs">
            {exchangeRatesQuery.isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed">
              {t('common.shown', { count: filteredRates.length })}
            </Text>
          </Group>
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0}>
        {filteredRates.length === 0 ? (
          <EmptyState title={t('exchangeRates.emptyTitle')} description={t('exchangeRates.emptyDescription')} />
        ) : (
          <ScrollArea>
            <Table miw={520} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('exchangeRates.currency')}</Table.Th>
                  <Table.Th>{t('exchangeRates.rate')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredRates.map((item) => (
                  <Table.Tr key={item.currency}>
                    <Table.Td>
                      <Text fw={700}>{item.currency}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={item.rate} thousandSeparator decimalScale={6} />
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Paper>
    </Stack>
  );
}

export default ExchangeRates;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {value}
      </Text>
    </Paper>
  );
}
