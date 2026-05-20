import { Group, Pagination, Text } from '@mantine/core';
import { useEffect, useMemo, useState, type DependencyList } from 'react';

export const LIST_PAGE_SIZE = 20;

export function useListPagination<T>(items: T[], resetDeps: DependencyList = []) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / LIST_PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, resetDeps);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const visibleItems = useMemo(() => {
    const startIndex = (page - 1) * LIST_PAGE_SIZE;
    return items.slice(startIndex, startIndex + LIST_PAGE_SIZE);
  }, [items, page]);

  return {
    page,
    pageCount,
    pageEnd: Math.min(items.length, page * LIST_PAGE_SIZE),
    pageStart: items.length === 0 ? 0 : (page - 1) * LIST_PAGE_SIZE + 1,
    setPage,
    visibleItems,
  };
}

export function ListPagination({
  page,
  pageCount,
  pageEnd,
  pageStart,
  setPage,
  total,
}: {
  page: number;
  pageCount: number;
  pageEnd: number;
  pageStart: number;
  setPage: (page: number) => void;
  total: number;
}) {
  if (total <= LIST_PAGE_SIZE) {
    return null;
  }

  return (
    <Group justify="space-between" p="md">
      <Text size="sm" c="dimmed">
        {pageStart}-{pageEnd} / {total}
      </Text>
      <Pagination total={pageCount} value={page} onChange={setPage} size="sm" />
    </Group>
  );
}
