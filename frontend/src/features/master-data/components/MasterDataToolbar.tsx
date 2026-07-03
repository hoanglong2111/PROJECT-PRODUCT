import { ActionIcon, Button, Group, Loader, Menu, Paper, Text, TextInput, Tooltip } from '@mantine/core';
import { IconChevronDown, IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react';
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
  addMenu,
}: {
  addLabel: string;
  canManage: boolean;
  filters?: ReactNode;
  hasActiveFilters: boolean;
  isFetching?: boolean;
  onAdd?: () => void;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange?: (value: boolean | null) => void;
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  statusValue?: boolean | null;
  addMenu?: { label: string; onClick: () => void }[];
}) {
  const { t } = useI18n();
  const showRightActions = hasActiveFilters || (canManage && (!!onAdd || !!(addMenu && addMenu.length > 0)));

  return (
    <Paper withBorder p="sm" className="dl-filter-panel md-toolbar">
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

        {showRightActions ? (
          <div className="md-toolbar-inline-actions">
            <Group gap="xs" wrap="nowrap">
              {hasActiveFilters ? (
                <Tooltip label={t('masterData.clearFilters')}>
                  <ActionIcon variant="subtle" color="gray" size="lg" onClick={onClear} aria-label={t('masterData.clearFilters')}>
                    <IconRefresh size={16} />
                  </ActionIcon>
                </Tooltip>
              ) : null}
              {canManage ? (
                addMenu && addMenu.length > 0 ? (
                  <Menu position="bottom-end" transitionProps={{ transition: 'pop' }} withinPortal>
                    <Menu.Target>
                      <Button
                        leftSection={<IconPlus size={16} />}
                        rightSection={<IconChevronDown size={16} />}
                      >
                        {addLabel}
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      {addMenu.map((item, index) => (
                        <Menu.Item key={index} onClick={item.onClick}>
                          {item.label}
                        </Menu.Item>
                      ))}
                    </Menu.Dropdown>
                  </Menu>
                ) : onAdd ? (
                  <Button leftSection={<IconPlus size={16} />} onClick={onAdd}>
                    {addLabel}
                  </Button>
                ) : null
              ) : null}
            </Group>
          </div>
        ) : null}
      </Group>
    </Paper>
  );
}

