import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildRateLookup, fetchCurrencyRates } from '@shared/api/currencyRates';
import { queryKeys } from '@shared/api/queryKeys';

const EMPTY_RATES: never[] = [];

export function useExchangeRates() {
  const query = useQuery({
    queryKey: queryKeys.currencyRates,
    queryFn: fetchCurrencyRates,
    staleTime: 5 * 60 * 1000,
  });
  const rateToVnd = useMemo(() => buildRateLookup(query.data ?? EMPTY_RATES), [query.data]);

  return { rateToVnd, isLoading: query.isLoading };
}
