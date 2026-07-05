import { ActionIcon, Box, Loader, Popover, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { GlobalSearchResult } from '@shared/api/system';
import { useI18n } from '@shared/i18n';
import { GlobalSearchResultRow } from './globalSearch/GlobalSearchResultRow';
import { useGlobalSearchQuery } from './globalSearch/useGlobalSearchQuery';

export function GlobalSearch() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchShellRef = useRef<HTMLDivElement | null>(null);
  const searchViewportRef = useRef<HTMLDivElement | null>(null);
  const [opened, setOpened] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { isFetching, query, results, setQuery, stateMessage } = useGlobalSearchQuery();

  const shouldShowPanel = opened && (query.trim().length > 0 || isFetching || results.length > 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  const openResult = (result: GlobalSearchResult) => {
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

  return (
    <Box className="global-search-shell" data-focused={opened || undefined} ref={searchShellRef}>
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
            className="global-search-input kbfe-search-input"
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
              isFetching ? (
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
                {results.map((result, index) => (
                  <GlobalSearchResultRow
                    active={index === activeIndex}
                    key={`${result.kind}-${result.id}`}
                    onActivate={openResult}
                    onHover={() => setActiveIndex(index)}
                    result={result}
                  />
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Popover.Dropdown>
      </Popover>
    </Box>
  );
}
