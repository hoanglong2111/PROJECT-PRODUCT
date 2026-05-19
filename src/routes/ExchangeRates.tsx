import {
  Badge,
  Button,
  Group,
  Loader,
  NumberFormatter,
  NumberInput,
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
import { IconExchange, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { fetchExchangeRates } from '../api/system';
import { EmptyState } from '../components/EmptyState';
import { PageError, PageLoading } from '../components/PageFeedback';
import { useI18n } from '../i18n';

const baseCurrencyCodes = ['USD', 'VND', 'EUR', 'JPY', 'CNY', 'KRW', 'THB', 'SGD'];
const quickCurrencyCodes = ['VND', 'USD', 'EUR', 'CNY'];

function formatRate(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function ExchangeRates() {
  const { currencyLabel, t } = useI18n();
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [estimateAmount, setEstimateAmount] = useState<number | string>(1000);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [search, setSearch] = useState('');
  const [toCurrency, setToCurrency] = useState('VND');

  const exchangeRatesQuery = useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: () => fetchExchangeRates(baseCurrency),
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
    staleTime: 60 * 1000,
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

    return rates.filter((item) => {
      const label = currencyLabel(item.currency).toUpperCase();
      return item.currency.includes(normalizedSearch) || label.includes(normalizedSearch);
    });
  }, [currencyLabel, rates, search]);

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
  const currencyOptions = useMemo(() => {
    const currencies = Array.from(new Set([baseCurrency, ...rates.map((item) => item.currency)])).sort();
    return currencies.map((currency) => ({ label: currencyLabel(currency), value: currency }));
  }, [baseCurrency, currencyLabel, rates]);
  const baseCurrencyOptions = useMemo(
    () => baseCurrencyCodes.map((currency) => ({ label: currencyLabel(currency), value: currency })),
    [currencyLabel],
  );
  const rateByCurrency = useMemo(() => {
    const entries = new Map(rates.map((item) => [item.currency, item.rate]));
    entries.set(baseCurrency, 1);
    return entries;
  }, [baseCurrency, rates]);
  const estimate = useMemo(() => {
    const amount = Number(estimateAmount);
    const fromRate = rateByCurrency.get(fromCurrency);
    const toRate = rateByCurrency.get(toCurrency);

    if (!Number.isFinite(amount) || amount < 0 || !fromRate || !toRate) {
      return null;
    }

    return {
      amount,
      rate: toRate / fromRate,
      value: amount * (toRate / fromRate),
    };
  }, [estimateAmount, fromCurrency, rateByCurrency, toCurrency]);

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
        <Group gap="xs">
          <Badge leftSection={<IconExchange size={14} />} size="lg" variant="light">
            {exchangeRatesQuery.data?.provider}
          </Badge>
          <Button
            leftSection={<IconRefresh size={16} />}
            loading={exchangeRatesQuery.isFetching}
            onClick={() => void exchangeRatesQuery.refetch()}
            variant="light"
          >
            {t('exchangeRates.refreshNow')}
          </Button>
        </Group>
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
              label={`${t('exchangeRates.oneBase')} ${currencyLabel(baseCurrency)}`}
              value={`${formatRate(item.rate)} ${currencyLabel(item.currency)}`}
            />
          ))}
        </SimpleGrid>
      ) : null}

      <Paper withBorder p="md">
        <Stack gap="sm">
          <div>
            <Title order={3}>{t('exchangeRates.estimateTitle')}</Title>
            <Text size="sm" c="dimmed">
              {t('exchangeRates.estimateDescription')}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, md: 4 }}>
            <NumberInput
              label={t('exchangeRates.amount')}
              min={0}
              thousandSeparator=","
              value={estimateAmount}
              onChange={setEstimateAmount}
            />
            <Select
              label={t('exchangeRates.fromCurrency')}
              data={currencyOptions}
              value={fromCurrency}
              onChange={(value) => setFromCurrency(value ?? baseCurrency)}
              searchable
            />
            <Select
              label={t('exchangeRates.toCurrency')}
              data={currencyOptions}
              value={toCurrency}
              onChange={(value) => setToCurrency(value ?? baseCurrency)}
              searchable
            />
            <Metric
              label={t('exchangeRates.estimatedValue')}
              value={estimate ? `${formatRate(estimate.value)} ${toCurrency}` : '-'}
            />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            {estimate
              ? t('exchangeRates.estimateFormula', {
                  amount: formatRate(estimate.amount),
                  from: currencyLabel(fromCurrency),
                  rate: formatRate(estimate.rate),
                  to: currencyLabel(toCurrency),
                })
              : t('exchangeRates.estimateUnavailable')}
          </Text>
        </Stack>
      </Paper>

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
              {t('common.shown', { count: filteredRates.length })} · {t('exchangeRates.autoRefresh')}
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
                      <Text fw={700}>{currencyLabel(item.currency)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        <NumberFormatter value={item.rate} thousandSeparator decimalScale={2} fixedDecimalScale />
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
