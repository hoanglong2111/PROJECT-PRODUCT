import { Select } from '@mantine/core';

import { fetchForwarders, type Forwarder } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { FORWARDER_TYPE_VALUES, getForwarderTypeLabel } from '../model/masterDataModel';
import { FILTER_SELECT_WIDTH } from './MasterDataToolbar';
import { ReferenceDataPanel } from './ReferenceDataPanel';
import { buildForwarderColumns } from './referenceColumns';

export function ForwardersSection({
  canManage,
  hasActiveFilters,
  onAdd,
  onClearFilters,
  onDelete,
  onEdit,
  onStatusFilterChange,
  onTypeFilterChange,
  statusFilter,
  typeFilter,
}: {
  canManage: boolean;
  hasActiveFilters: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
  onDelete: (forwarder: Forwarder) => void;
  onEdit: (forwarder: Forwarder) => void;
  onStatusFilterChange: (value: boolean | null) => void;
  onTypeFilterChange: (value: string | null) => void;
  statusFilter: boolean | null;
  typeFilter: string | null;
}) {
  const { t } = useI18n();

  return (
    <ReferenceDataPanel
      addLabel={t('masterData.addForwarder')}
      canManage={canManage}
      title={t('masterData.forwardersTitle')}
      searchPlaceholder={t('masterData.searchForwarders')}
      emptyTitle={t('masterData.noForwarders')}
      emptyDescription={t('masterData.noForwardersDescription')}
      columns={buildForwarderColumns(t)}
      queryKey={queryKeys.forwarders}
      fetcher={fetchForwarders}
      pageSize={500}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      clientFilter={(forwarder) => !typeFilter || forwarder.forwarder_type === typeFilter}
      toolbarExtra={(
        <Select
          className="md-filter-select"
          label={t('masterData.forwarderType')}
          data={[
            { value: 'ALL', label: t('common.all') },
            ...FORWARDER_TYPE_VALUES.map((value) => ({ value, label: getForwarderTypeLabel(value, t) })),
          ]}
          value={typeFilter ?? 'ALL'}
          onChange={(value) => onTypeFilterChange(value === 'ALL' ? null : value)}
          w={FILTER_SELECT_WIDTH}
        />
      )}
    />
  );
}
