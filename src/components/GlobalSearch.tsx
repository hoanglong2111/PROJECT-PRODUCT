import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Loader,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconClipboardList,
  IconFileInvoice,
  IconSearch,
  IconShoppingCart,
  IconTruckDelivery,
  IconUserCircle,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchGlobalSearch, type GlobalSearchKind } from '../api/system';
import { useI18n } from '../i18n';

const kindMeta: Record<
  GlobalSearchKind,
  {
    color: string;
    icon: typeof IconFileInvoice;
  }
> = {
  purchase_request: { color: 'blue', icon: IconFileInvoice },
  purchase_order: { color: 'teal', icon: IconShoppingCart },
  delivery_order: { color: 'orange', icon: IconTruckDelivery },
  task: { color: 'violet', icon: IconClipboardList },
  account: { color: 'gray', icon: IconUserCircle },
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const { searchKindLabel, statusLabel, t } = useI18n();
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [debouncedQuery] = useDebouncedValue(query.trim(), 250);
  const canSearch = debouncedQuery.length >= 2;

  const searchQuery = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => fetchGlobalSearch(debouncedQuery),
    enabled: canSearch,
    staleTime: 10_000,
  });

  const results = searchQuery.data ?? [];
  const shouldShowPanel = opened && (query.trim().length > 0 || searchQuery.isFetching || results.length > 0);

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

  return (
    <Box className="global-search-shell">
      <Popover opened={shouldShowPanel} onChange={setOpened} width="target" position="bottom" shadow="md">
        <Popover.Target>
          <TextInput
            aria-label={t('search.placeholder')}
            className="global-search-input"
            leftSection={<IconSearch size={16} />}
            onBlur={() => setOpened(false)}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setOpened(true);
            }}
            onFocus={() => setOpened(true)}
            placeholder={t('search.placeholder')}
            radius="md"
            rightSection={
              searchQuery.isFetching ? (
                <Loader size={16} />
              ) : query ? (
                <ActionIcon
                  aria-label={t('search.clear')}
                  color="gray"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setQuery('');
                    setOpened(false);
                  }}
                  size="sm"
                  variant="subtle"
                >
                  <IconX size={14} />
                </ActionIcon>
              ) : null
            }
            value={query}
          />
        </Popover.Target>
        <Popover.Dropdown className="global-search-dropdown" p="xs">
          {stateMessage ? (
            <Text c="dimmed" size="sm" px="xs" py={6}>
              {stateMessage}
            </Text>
          ) : (
            <ScrollArea.Autosize mah={360} type="auto">
              <Stack gap={4}>
                {results.map((result) => {
                  const meta = kindMeta[result.kind];
                  const Icon = meta.icon;

                  return (
                    <UnstyledButton
                      className="global-search-result"
                      key={`${result.kind}-${result.id}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        navigate(result.href);
                        setOpened(false);
                        setQuery('');
                      }}
                    >
                      <Group gap="sm" wrap="nowrap" align="flex-start">
                        <Box className="global-search-result-icon" data-kind={result.kind}>
                          <Icon size={16} />
                        </Box>
                        <Box flex={1} miw={0}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={700} size="sm" lineClamp={1}>
                              {result.title}
                            </Text>
                            <Badge color={meta.color} size="xs" variant="light">
                              {searchKindLabel(result.kind)}
                            </Badge>
                          </Group>
                          <Text c="dimmed" size="xs" lineClamp={1}>
                            {result.subtitle}
                          </Text>
                        </Box>
                        {result.status ? (
                          <Badge color="gray" size="xs" variant="outline">
                            {statusLabel(result.status)}
                          </Badge>
                        ) : null}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
