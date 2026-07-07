import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  buildRateLookup,
  buildRateLookupOrNull,
  fetchCurrencyRates,
  STATIC_VND_RATE_FALLBACKS,
} from '@shared/api/currencyRates';
import { queryKeys } from '@shared/api/queryKeys';

const EMPTY_RATES: never[] = [];

export function useExchangeRates() {
  const query = useQuery({
    queryKey: queryKeys.currencyRates,
    queryFn: fetchCurrencyRates,
    staleTime: 5 * 60 * 1000,
  });
  const rateToVnd = useMemo(() => buildRateLookup(query.data ?? EMPTY_RATES), [query.data]);
  const rateToVndOrNull = useMemo(
    () => buildRateLookupOrNull(query.data ?? EMPTY_RATES, STATIC_VND_RATE_FALLBACKS),
    [query.data],
  );

  return { rateToVnd, rateToVndOrNull, isLoading: query.isLoading };
}
