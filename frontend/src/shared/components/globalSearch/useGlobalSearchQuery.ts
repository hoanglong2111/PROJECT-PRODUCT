import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchGlobalSearch } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

export function useGlobalSearchQuery(initialQuery = '') {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebouncedValue(query.trim(), 250);
  const canSearch = debouncedQuery.length >= 2;

  const searchQuery = useQuery({
    queryKey: queryKeys.globalSearchResults(debouncedQuery),
    queryFn: () => fetchGlobalSearch(debouncedQuery),
    enabled: canSearch,
    staleTime: 10_000,
  });

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const stateMessage = useMemo(() => {
    if (!canSearch) {
      return t('search.minLength');
    }

    if (searchQuery.isLoading || searchQuery.isFetching) {
      return t('search.searching');
    }

    if (searchQuery.isError) {
      return t('search.error');
    }

    if (results.length === 0) {
      return t('search.noResults');
    }

    return null;
  }, [canSearch, results.length, searchQuery.isError, searchQuery.isFetching, searchQuery.isLoading, t]);

  return {
    canSearch,
    isFetching: searchQuery.isFetching,
    query,
    results,
    setQuery,
    stateMessage,
  };
}
