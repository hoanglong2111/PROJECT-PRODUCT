import { Button, Group, Loader, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { FilterSegment } from '@shared/components/FilterSegment';
import { StatusDot } from '@shared/components/StatusDot';
import { useI18n } from '@shared/i18n';

import { selectValueToStatus, statusToSelectValue } from '../model/masterDataModel';

export const FILTER_SELECT_WIDTH = 200;

export function MasterDataToolbar({
  addLabel,
  canManage,
  filters,
  hasActiveFilters,
  isFetching,
  onAdd,
  onClear,
  onSearchChange,
  onStatusChange,
  searchLabel,
  searchPlaceholder,
  searchValue,
  statusValue,
}: {
  addLabel: string;
  canManage: boolean;
  filters?: ReactNode;
  hasActiveFilters: boolean;
  isFetching?: boolean;
  onAdd: () => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange?: (value: boolean | null) => void;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  statusValue?: boolean | null;
}) {
  const { t } = useI18n();
  const showActions = hasActiveFilters || canManage;

  return (
    <Paper withBorder p="md" className="dl-filter-panel md-toolbar">
      <Stack gap="sm">
        <Group align="flex-end" gap="sm" wrap="wrap" className="dl-filter-row md-toolbar-filters">
          <TextInput
            className="dl-filter-search"
            label={searchLabel}
            placeholder={searchPlaceholder}
            leftSection={<IconSearch size={16} />}
            value={searchValue}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
          />
          {onStatusChange ? (
            <div className="md-status-filter">
              <Text size="xs" fw={700} className="md-toolbar-label">
                {t('common.status')}
              </Text>
              <FilterSegment
                ariaLabel={t('common.status')}
                value={statusToSelectValue(statusValue)}
                onChange={(value) => onStatusChange(selectValueToStatus(value))}
                options={[
                  { value: 'ALL', label: t('common.all') },
                  {
                    value: 'active',
                    label: <StatusDot active />,
                    color: 'teal',
                  },
                  {
                    value: 'inactive',
                    label: <StatusDot active={false} />,
                    color: 'red',
                  },
                ]}
              />
            </div>
          ) : null}
          {filters}
          {isFetching ? <Loader size="sm" className="md-toolbar-loader" /> : null}
        </Group>
        {showActions ? (
          <Group gap="xs" wrap="wrap" justify="flex-end" className="md-toolbar-actions">
            {hasActiveFilters ? (
              <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={onClear}>
                {t('masterData.clearFilters')}
              </Button>
            ) : null}
            {canManage ? (
              <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
                {addLabel}
              </Button>
            ) : null}
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
