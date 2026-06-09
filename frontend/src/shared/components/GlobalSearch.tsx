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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchGlobalSearch, type GlobalSearchKind } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

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
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const searchViewportRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [debouncedQuery] = useDebouncedValue(query.trim(), 250);
  const canSearch = debouncedQuery.length >= 2;

  const searchQuery = useQuery({
    queryKey: queryKeys.globalSearchResults(debouncedQuery),
    queryFn: () => fetchGlobalSearch(debouncedQuery),
    enabled: canSearch,
    staleTime: 10_000,
  });

  const results = searchQuery.data ?? [];
  const shouldShowPanel = opened && (query.trim().length > 0 || searchQuery.isFetching || results.length > 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, results.length]);

  const openResult = (result: (typeof results)[number]) => {
    navigate(result.href);
    setOpened(false);
    setQuery('');
  };

  useEffect(() => {
    if (!opened || typeof window === 'undefined') {
      return;
    }

    const isInsideSearchTarget = (target: EventTarget | null) =>
      target instanceof Node &&
      (Boolean(searchShellRef.current?.contains(target)) || Boolean(searchDropdownRef.current?.contains(target)));

    const closeSearch = () => {
      setOpened(false);
      searchInputRef.current?.blur();
    };

    const closeSearchWhenPageWheelStarts = (event: globalThis.WheelEvent) => {
      if (!isInsideSearchTarget(event.target)) {
        closeSearch();
      }
    };

    const closeSearchWhenPageScrolls = (event: Event) => {
      if (!isInsideSearchTarget(event.target)) {
        closeSearch();
      }
    };

    window.addEventListener('wheel', closeSearchWhenPageWheelStarts, { capture: true, passive: true });
    window.addEventListener('scroll', closeSearchWhenPageScrolls, { capture: true, passive: true });

    return () => {
      window.removeEventListener('wheel', closeSearchWhenPageWheelStarts, { capture: true });
      window.removeEventListener('scroll', closeSearchWhenPageScrolls, { capture: true });
    };
  }, [opened]);

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
    <Box className="global-search-shell" ref={searchShellRef}>
      <Popover
        opened={shouldShowPanel}
        onChange={setOpened}
        position="bottom"
        shadow="md"
        transitionProps={{
          duration: 150,
          exitDuration: 100,
          timingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          transition: 'pop-top-left',
        }}
        width="target"
      >
        <Popover.Target>
          <TextInput
            aria-label={t('search.placeholder')}
            className="global-search-input"
            ref={searchInputRef}
            leftSection={<IconSearch size={16} />}
            onBlur={() => setOpened(false)}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setOpened(true);
            }}
            onFocus={() => setOpened(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setOpened(false);
                return;
              }

              if (results.length === 0) {
                return;
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpened(true);
                setActiveIndex((currentIndex) => Math.min(currentIndex + 1, results.length - 1));
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setOpened(true);
                setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
              }

              if (event.key === 'Enter' && shouldShowPanel) {
                event.preventDefault();
                openResult(results[activeIndex] ?? results[0]);
              }
            }}
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
        <Popover.Dropdown className="global-search-dropdown" p="xs" ref={searchDropdownRef} role="listbox">
          {stateMessage ? (
            <Text c="dimmed" size="sm" px="xs" py={6}>
              {stateMessage}
            </Text>
          ) : (
            <ScrollArea.Autosize
              className="global-search-scroll"
              mah={360}
              offsetScrollbars="y"
              overscrollBehavior="auto"
              scrollbars="y"
              type="auto"
              viewportProps={{ className: 'global-search-scroll-viewport' }}
              viewportRef={searchViewportRef}
            >
              <Stack gap={4}>
                {results.map((result, index) => {
                  const isActive = index === activeIndex;
                  const meta = kindMeta[result.kind];
                  const Icon = meta.icon;

                  return (
                    <UnstyledButton
                      aria-selected={isActive}
                      className="global-search-result"
                      data-active={isActive || undefined}
                      key={`${result.kind}-${result.id}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openResult(result)}
                      role="option"
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
