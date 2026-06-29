import { ActionIcon, Alert, Badge, Button, Group, Loader, Paper, ScrollArea, Select, SimpleGrid, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';

import type { Item, ItemTaxProfile } from '@shared/api/items';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination } from '@shared/components/ListPagination';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { formatDateTime, formatDecimal } from '../model/masterDataModel';
import { TaxProfilesCell } from './TaxProfilesCell';

export function ItemCatalogSection({
  canManage,
  deleteItemIsPending,
  error,
  groupFilter,
  groupOptions,
  isError,
  isLoading,
  items,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onGroupFilterChange,
  onSearchChange,
  page,
  pageCount,
  pageEnd,
  pageStart,
  search,
  setPage,
  taxProfileQueries,
  taxProfilesByItemId,
  total,
}: {
  canManage: boolean;
  deleteItemIsPending: boolean;
  error: unknown;
  groupFilter: string | null;
  groupOptions: Array<{ label: string; value: string }>;
  isError: boolean;
  isLoading: boolean;
  items: Item[];
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: Item) => void;
  onGroupFilterChange: (value: string | null) => void;
  onSearchChange: (value: string) => void;
  page: number;
  pageCount: number;
  pageEnd: number;
  pageStart: number;
  search: string;
  setPage: (page: number) => void;
  taxProfileQueries: Array<{ isLoading: boolean }>;
  taxProfilesByItemId: Map<string, ItemTaxProfile[]>;
  total: number;
}) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="md" className="dl-data-panel">
      <Stack gap="md">
        <Group justify="space-between" align="end" className="dl-data-panel-header">
          <SimpleGrid cols={{ base: 1, sm: 2 }} style={{ flex: 1 }}>
            <TextInput
              label={t('masterData.itemCatalogTitle')}
              placeholder={t('masterData.searchItems')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => onSearchChange(e.currentTarget.value)}
            />
            <Select
              label={t('masterData.itemGroup')}
              placeholder={t('masterData.allItemGroups')}
              data={groupOptions}
              value={groupFilter}
              onChange={onGroupFilterChange}
              clearable
              searchable
            />
          </SimpleGrid>
          {canManage && (
            <Button onClick={onAddItem} leftSection={<IconPlus size={16} />}>
              {t('masterData.addItem')}
            </Button>
          )}
        </Group>

        {isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(error)}
          </Alert>
        ) : isLoading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('masterData.noItems')}
            description={t('masterData.noItemsDescription')}
            action={canManage ? { label: t('masterData.addItem'), onClick: onAddItem } : undefined}
          />
        ) : (
          <Paper withBorder p={0}>
            <ScrollArea>
              <Table miw={1120} verticalSpacing="md" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('masterData.itemName')}</Table.Th>
                    <Table.Th>{t('masterData.itemGroup')}</Table.Th>
                    <Table.Th>
                      <HeaderLabel
                        label={t('masterData.commercialInfo')}
                        hint={t('glossary.commercialInfo')}
                      />
                    </Table.Th>
                    <Table.Th>
                      <HeaderLabel label={t('masterData.logisticsInfo')} hint={t('glossary.logisticsInfo')} />
                    </Table.Th>
                    <Table.Th>
                      <HeaderLabel label={t('masterData.taxProfiles')} hint={t('glossary.taxProfiles')} />
                    </Table.Th>
                    <Table.Th>{t('common.status')}</Table.Th>
                    <Table.Th>{t('masterData.updatedAt')}</Table.Th>
                    <Table.Th style={{ width: canManage ? 132 : 52 }}>{t('masterData.actions')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((item, index) => {
                    const profiles = taxProfilesByItemId.get(item.id) ?? [];
                    const profileQuery = taxProfileQueries[index];

                    return (
                      <Table.Tr key={item.id}>
                        <Table.Td className="table-cell-truncate" style={{ maxWidth: '26rem' }}>
                          <Group gap={8} mb={4} wrap="nowrap">
                            <Text size="sm" fw={700}>
                              {item.item_code}
                            </Text>
                            <Badge color="blue" variant="light">
                              {item.item_category || '-'}
                            </Badge>
                          </Group>
                          <Text size="sm" fw={600} lineClamp={2} title={item.item_name}>
                            {item.item_name}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {item.item_name_en || item.note || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ minWidth: '12rem' }}>
                          <Text size="sm" fw={600}>
                            {item.item_group?.group_name || '-'}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.item_group?.group_code || item.item_group_id || ''}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {t('masterData.defaultHsCode')}: {item.item_group?.default_hs_code || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ minWidth: '11rem' }}>
                          <Text size="sm" fw={600}>
                            {[item.base_uom, item.purchase_uom].filter(Boolean).join(' / ') || '-'}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {t('masterData.uomConversion')}: {formatDecimal(item.uom_conversion)} |{' '}
                            {item.item_type || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ minWidth: '9rem' }}>
                          <Text size="sm">{item.country_of_origin || '-'}</Text>
                          <Text size="xs" c="dimmed">
                            {t('masterData.unitPriceUsd')}: {formatDecimal(item.unit_price_usd)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {t('masterData.barcode')}: {item.barcode || '-'}
                          </Text>
                        </Table.Td>
                        <Table.Td style={{ minWidth: '10rem' }}>
                          <TaxProfilesCell
                            profiles={profiles}
                            isLoading={profiles.length === 0 && Boolean(profileQuery?.isLoading)}
                            loadingLabel={t('masterData.taxProfileLoading')}
                            preferentialLabel={t('masterData.preferentialShort')}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Badge color={item.is_active === false ? 'gray' : 'teal'} variant="light">
                            {item.is_active === false
                              ? t('masterData.inactiveStatus')
                              : t('masterData.activeStatus')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{formatDateTime(item.update_at)}</Table.Td>
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
                            {canManage && (
                              <Tooltip label={t('common.delete')}>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  loading={deleteItemIsPending}
                                  onClick={() => onDeleteItem(item.id)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
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
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}
