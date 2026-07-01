import { Badge, Select, Stack, Text } from '@mantine/core';

import { fetchForwarders, type Forwarder } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { ActiveBadge } from './ActiveBadge';
import { ReferenceDataPanel, type ReferenceColumn } from './ReferenceDataPanel';

const FORWARDER_TYPES = ['SEA', 'AIR', 'TRUCKING', 'MULTI'];

function formatForwarderType(type: string, t: ReturnType<typeof useI18n>['t']) {
  const labels: Record<string, string> = {
    SEA: t('masterData.forwarderTypeSea'),
    AIR: t('masterData.forwarderTypeAir'),
    TRUCKING: t('masterData.forwarderTypeTrucking'),
    MULTI: t('masterData.forwarderTypeMulti'),
  };

  return labels[type] ?? type;
}

function buildForwarderColumns(t: ReturnType<typeof useI18n>['t']): Array<ReferenceColumn<Forwarder>> {
  return [
    {
      key: 'identity',
      label: t('masterData.forwarder'),
      render: (forwarder) => (
        <Stack gap={3}>
          <Badge variant="light">{forwarder.forwarder_code}</Badge>
          <Text fw={700} lineClamp={1}>{forwarder.forwarder_name}</Text>
          <Text size="xs" c="dimmed">{forwarder.country || '-'}</Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.forwarderType'),
      width: 170,
      render: (forwarder) => <Badge color="blue" variant="outline">{formatForwarderType(forwarder.forwarder_type, t)}</Badge>,
    },
    {
      key: 'contact',
      label: t('masterData.contact'),
      render: (forwarder) => (
        <Stack gap={2}>
          <Text size="sm" lineClamp={1}>{forwarder.contact_person || '-'}</Text>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {[forwarder.contact_email, forwarder.contact_phone].filter(Boolean).join(' | ') || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'primary',
      label: t('masterData.isPrimary'),
      width: 110,
      render: (forwarder) => (
        <Badge color={forwarder.is_primary ? 'teal' : 'gray'} variant="light">
          {forwarder.is_primary ? t('common.yes') : t('common.no')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('common.status'),
      width: 80,
      render: (forwarder) => <ActiveBadge active={forwarder.is_active !== false} />,
    },
  ];
}

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
            ...FORWARDER_TYPES.map((value) => ({ value, label: formatForwarderType(value, t) })),
          ]}
          value={typeFilter ?? 'ALL'}
          onChange={(value) => onTypeFilterChange(value === 'ALL' ? null : value)}
          w={240}
        />
      )}
    />
  );
}
