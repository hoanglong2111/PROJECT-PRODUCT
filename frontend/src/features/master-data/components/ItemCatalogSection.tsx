import { ActionIcon, Alert, Badge, Button, Group, Loader, Paper, ScrollArea, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';

import type { Item } from '@shared/api/items';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { LIST_PAGE_SIZE, ListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import {
  formatDateTime,
  formatDecimal,
  getItemCategoryLabel,
  getItemTypeLabel,
  getStatusFilterOptions,
  ITEM_CATEGORY_VALUES,
  ITEM_TYPE_VALUES,
  selectValueToStatus,
  statusToSelectValue,
} from '../model/masterDataModel';

export function ItemCatalogSection({
  canManage,
  categoryFilter,
  deleteItemIsPending,
  error,
  hasActiveFilters,
  isError,
  isFetching,
  isLoading,
  itemTypeFilter,
  items,
  onAddItem,
  onCategoryFilterChange,
  onClearFilters,
  onDeleteItem,
  onEditItem,
  onItemTypeFilterChange,
  onSearchChange,
  onStatusFilterChange,
  page,
  pageCount,
  pageEnd,
  pageStart,
  search,
  setPage,
  statusFilter,
  total,
}: {
  canManage: boolean;
  categoryFilter: string | null;
  deleteItemIsPending: boolean;
  error: unknown;
  hasActiveFilters: boolean;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  itemTypeFilter: string | null;
  items: Item[];
  onAddItem: () => void;
  onCategoryFilterChange: (value: string | null) => void;
  onClearFilters: () => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: Item) => void;
  onItemTypeFilterChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: boolean | null) => void;
  page: number;
  pageCount: number;
  pageEnd: number;
  pageStart: number;
  search: string;
  setPage: (page: number) => void;
  statusFilter: boolean | null;
  total: number;
}) {
  const { t } = useI18n();
  const hasSearch = search.trim().length > 0;
  const showClearFilters = hasActiveFilters || hasSearch;
  const categoryValue = categoryFilter ?? 'ALL';
  const typeValue = itemTypeFilter ?? 'ALL';

  const categoryOptions = useMemo(
    () => [
      { value: 'ALL', label: t('common.all') },
      ...ITEM_CATEGORY_VALUES.map((value) => ({ value, label: getItemCategoryLabel(value, t) })),
    ],
    [t],
  );
  const typeOptions = useMemo(
    () => [
      { value: 'ALL', label: t('common.all') },
      ...ITEM_TYPE_VALUES.map((value) => ({ value, label: getItemTypeLabel(value, t) })),
    ],
    [t],
  );

  const handleClearFilters = () => {
    onClearFilters();
  };
  const resultCountLabel = t('common.shown', { count: total });

  return (
    <Stack gap="md">
      <Paper withBorder p="md" className="dl-filter-panel">
        <Group align="flex-end" gap="sm" wrap="wrap" className="dl-filter-row">
          <TextInput
            className="dl-filter-search"
            label={t('masterData.itemCatalogTitle')}
            placeholder={t('masterData.searchItems')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => {
              onSearchChange(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            className="md-filter-select"
            label={t('common.status')}
            data={getStatusFilterOptions(t)}
            value={statusToSelectValue(statusFilter)}
            onChange={(value) => onStatusFilterChange(selectValueToStatus(value))}
            w={170}
          />
          <Select
            className="md-filter-select"
            label={t('masterData.itemCategory')}
            data={categoryOptions}
            value={categoryValue}
            onChange={(value) => onCategoryFilterChange(value === 'ALL' ? null : value)}
            w={200}
          />
          <Select
            className="md-filter-select"
            label={t('masterData.itemType')}
            data={typeOptions}
            value={typeValue}
            onChange={(value) => onItemTypeFilterChange(value === 'ALL' ? null : value)}
            w={200}
          />
          <Group gap="xs" wrap="nowrap" align="flex-end" ml="auto" className="md-filter-tail">
            {isFetching ? <Loader size="sm" /> : null}
            <Text size="sm" c="dimmed" className="md-filter-count">
              {resultCountLabel}
            </Text>
            {canManage ? (
              <Button onClick={onAddItem} leftSection={<IconPlus size={16} />}>
                {t('masterData.addItem')}
              </Button>
            ) : null}
            {showClearFilters ? (
              <Button variant="subtle" onClick={handleClearFilters}>
                {t('masterData.clearFilters')}
              </Button>
            ) : null}
          </Group>
        </Group>
      </Paper>

      {isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      <Paper withBorder p={0} className="dl-data-panel">
        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader size="sm" />
          </Group>
        ) : items.length === 0 ? (
          <EmptyState
            title={showClearFilters ? t('masterData.noFilteredResults') : t('masterData.noItems')}
            description={showClearFilters ? t('masterData.noFilteredResultsDescription') : t('masterData.noItemsDescription')}
            action={showClearFilters
              ? { label: t('masterData.clearFilters'), onClick: handleClearFilters }
              : canManage
                ? { label: t('masterData.addItem'), onClick: onAddItem }
                : undefined}
          />
        ) : (
          <>
            <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
              <Table stickyHeader verticalSpacing="md" highlightOnHover style={{ tableLayout: 'fixed', width: '100%' }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 56 }}>
                      <HeaderLabel label={t('common.rowNumber')} />
                    </Table.Th>
                    <Table.Th>
                      <HeaderLabel label={t('masterData.itemName')} />
                    </Table.Th>
                    <Table.Th style={{ width: 210 }}>
                      <HeaderLabel
                        label={t('masterData.commercialInfo')}
                        hint={t('glossary.commercialInfo')}
                      />
                    </Table.Th>
                    <Table.Th style={{ width: 180 }}>
                      <HeaderLabel label={t('masterData.logisticsInfo')} hint={t('glossary.logisticsInfo')} />
                    </Table.Th>
                    <Table.Th style={{ width: 80 }}>{t('common.status')}</Table.Th>
                    <Table.Th style={{ width: 80 }}>{t('masterData.actions')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, index) => (
                    <Table.Tr key={item.id}>
                      <Table.Td className="tabular-nums">{(page - 1) * LIST_PAGE_SIZE + index + 1}</Table.Td>
                      <Table.Td className="md-cell-clamp">
                        <Group gap={8} mb={4} wrap="nowrap">
                          <Text size="sm" fw={700}>
                            {item.item_code}
                          </Text>
                          <Badge color="blue" variant="light">
                            {getItemCategoryLabel(item.item_category, t)}
                          </Badge>
                        </Group>
                        <Text size="sm" fw={600} lineClamp={2} title={item.item_name}>
                          {item.item_name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {item.item_name_en || item.note || '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDateTime(item.update_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td className="md-cell-clamp">
                        <Text size="sm" fw={600}>
                          {[item.base_uom, item.purchase_uom].filter(Boolean).join(' / ') || '-'}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {t('masterData.uomConversion')}: {formatDecimal(item.uom_conversion)}
                        </Text>
                        <Badge size="xs" color="gray" variant="light">
                          {getItemTypeLabel(item.item_type, t)}
                        </Badge>
                      </Table.Td>
                      <Table.Td className="md-cell-clamp">
                        <Text size="sm">{item.country_of_origin || '-'}</Text>
                        <Text size="xs" c="dimmed">
                          {t('masterData.unitPriceUsd')}: {formatDecimal(item.unit_price_usd)}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {t('masterData.barcode')}: {item.barcode || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={item.is_active === false ? 'gray' : 'teal'} variant="light">
                          {item.is_active === false
                            ? t('masterData.inactiveStatus')
                            : t('masterData.activeStatus')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label={canManage ? t('common.edit') : t('masterData.viewItem')}>
                            <ActionIcon
                              variant="subtle"
                              color={canManage ? 'blue' : 'gray'}
                              aria-label={canManage ? t('common.edit') : t('masterData.viewItem')}
                              onClick={() => onEditItem(item)}
                            >
                              {canManage ? <IconPencil size={16} /> : <IconEye size={16} />}
                            </ActionIcon>
                          </Tooltip>
                          {canManage ? (
                            <Tooltip label={t('common.delete')}>
                              <ActionIcon
                                aria-label={t('common.delete')}
                                variant="subtle"
                                color="red"
                                loading={deleteItemIsPending}
                                onClick={() => onDeleteItem(item.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          ) : null}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            <ListPagination
              page={page}
              pageCount={pageCount}
              pageEnd={pageEnd}
              pageStart={pageStart}
              setPage={setPage}
              total={total}
            />
          </>
        )}
      </Paper>
    </Stack>
  );
}
