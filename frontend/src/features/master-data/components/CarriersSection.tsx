import { Select } from '@mantine/core';

import { fetchCarriers, type Carrier } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { CARRIER_TYPE_VALUES, getCarrierTypeLabel } from '../model/masterDataModel';
import { FILTER_SELECT_WIDTH } from './MasterDataToolbar';
import { ReferenceDataPanel } from './ReferenceDataPanel';
import { buildCarrierColumns } from './referenceColumns';

export function CarriersSection({
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
  onDelete: (carrier: Carrier) => void;
  onEdit: (carrier: Carrier) => void;
  onStatusFilterChange: (value: boolean | null) => void;
  onTypeFilterChange: (value: string | null) => void;
  statusFilter: boolean | null;
  typeFilter: string | null;
}) {
  const { t } = useI18n();

  return (
    <ReferenceDataPanel
      addLabel={t('masterData.addCarrier')}
      canManage={canManage}
      title={t('masterData.carriersTitle')}
      searchPlaceholder={t('masterData.searchCarriers')}
      emptyTitle={t('masterData.noCarriers')}
      emptyDescription={t('masterData.noCarriersDescription')}
      columns={buildCarrierColumns(t)}
      queryKey={queryKeys.carriers}
      fetcher={fetchCarriers}
      pageSize={500}
      statusFilter={statusFilter}
      onStatusFilterChange={onStatusFilterChange}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      clientFilter={(carrier) => !typeFilter || carrier.carrier_type === typeFilter}
      toolbarExtra={(
        <Select
          className="md-filter-select"
          label={t('masterData.carrierType')}
          data={[
            { value: 'ALL', label: t('common.all') },
            ...CARRIER_TYPE_VALUES.map((value) => ({ value, label: getCarrierTypeLabel(value, t) })),
          ]}
          value={typeFilter ?? 'ALL'}
          onChange={(value) => onTypeFilterChange(value === 'ALL' ? null : value)}
          w={FILTER_SELECT_WIDTH}
        />
      )}
    />
  );
}
