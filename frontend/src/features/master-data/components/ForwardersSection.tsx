import { Badge, Stack, Text } from '@mantine/core';

import { fetchForwarders, type Forwarder } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

import { ReferenceDataPanel, type ReferenceColumn } from './ReferenceDataPanel';

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
        <Stack gap={2}>
          <Badge variant="light">{forwarder.forwarder_code}</Badge>
          <Text fw={700}>{forwarder.forwarder_name}</Text>
        </Stack>
      ),
    },
    {
      key: 'type',
      label: t('masterData.forwarderType'),
      width: 150,
      render: (forwarder) => <Badge color="blue" variant="outline">{formatForwarderType(forwarder.forwarder_type, t)}</Badge>,
    },
    {
      key: 'country',
      label: t('masterData.country'),
      width: 120,
      render: (forwarder) => forwarder.country || '-',
    },
    {
      key: 'contact',
      label: t('masterData.contact'),
      render: (forwarder) => (
        <Stack gap={2}>
          <Text size="sm">{forwarder.contact_person || '-'}</Text>
          <Text size="xs" c="dimmed">
            {[forwarder.contact_email, forwarder.contact_phone].filter(Boolean).join(' | ') || '-'}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'primary',
      label: t('masterData.isPrimary'),
      width: 130,
      render: (forwarder) => (
        <Badge color={forwarder.is_primary ? 'teal' : 'gray'} variant="light">
          {forwarder.is_primary ? t('common.yes') : t('common.no')}
        </Badge>
      ),
    },
    {
      key: 'note',
      label: t('masterData.note'),
      render: (forwarder) => (
        <Text size="sm" c="dimmed" lineClamp={2}>
          {forwarder.note || '-'}
        </Text>
      ),
    },
  ];
}

export function ForwardersSection({
  canManage,
  onAdd,
  onDelete,
  onEdit,
}: {
  canManage: boolean;
  onAdd: () => void;
  onDelete: (forwarder: Forwarder) => void;
  onEdit: (forwarder: Forwarder) => void;
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
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}
