import { Alert, Badge, Stack } from '@mantine/core';
import { IconAlertCircle, IconDatabase } from '@tabler/icons-react';

import type { ChargeCode } from '@shared/api/chargeCodes';
import type { ContainerType } from '@shared/api/containerTypes';
import type { Carrier, Forwarder } from '@shared/api/forwarders';
import type { Item } from '@shared/api/items';
import type { TaskTemplate } from '@shared/api/taskTemplates';
import type { Currency, Incoterm, Supplier, TransportMode } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import { useCan } from '@shared/auth/useCan';
import { PageHeader } from '@shared/components/PageHeader';
import { useEntityModal } from '@shared/hooks/useEntityModal';
import { useI18n } from '@shared/i18n';

import { MasterDataModals } from './components/MasterDataModals';
import { MasterDataReferenceTabs } from './components/MasterDataReferenceTabs';
import { useMasterDataCrud } from './hooks/useMasterDataCrud';
import { useMasterDataFilterOptions } from './hooks/useMasterDataFilterOptions';
import type { MasterDataModalSet } from './model/masterDataEntityMeta';
import { useMasterDataStore } from './model/masterDataStore';

export function MasterData() {
  const { t } = useI18n();
  const canManageMasterData = useCan('masterData.manage');
  const activeTab = useMasterDataStore((state) => state.activeTab);

  const modals: MasterDataModalSet = {
    item: useEntityModal<Item>(),
    currency: useEntityModal<Currency>(),
    incoterm: useEntityModal<Incoterm>(),
    transportMode: useEntityModal<TransportMode>(),
    chargeCode: useEntityModal<ChargeCode>(),
    uom: useEntityModal<Uom>(),
    containerType: useEntityModal<ContainerType>(),
    supplier: useEntityModal<Supplier>(),
    forwarder: useEntityModal<Forwarder>(),
    carrier: useEntityModal<Carrier>(),
    taskTemplate: useEntityModal<TaskTemplate>(),
  };

  const crud = useMasterDataCrud(canManageMasterData);
  const filterOptions = useMasterDataFilterOptions({
    uomOptionsEnabled:
      activeTab === 'items' ||
      activeTab === 'chargeCodes' ||
      activeTab === 'uoms' ||
      modals.item.opened ||
      modals.chargeCode.opened ||
      modals.uom.opened,
  });

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<IconDatabase size={20} />}
        title={t('masterData.title')}
        subtitle={t('masterData.subtitle')}
        actions={!canManageMasterData && (
          <Badge color="blue" variant="filled" size="lg" leftSection={<IconAlertCircle size={14} />}>
            {t('masterData.readOnlyBadge')}
          </Badge>
        )}
      />

      {!canManageMasterData && (
        <Alert color="blue" variant="light" title={t('masterData.readOnlyBadge')} icon={<IconAlertCircle size={18} />}>
          {t('masterData.readOnlyAlert')}
        </Alert>
      )}

      <MasterDataReferenceTabs
        canManage={canManageMasterData}
        filterOptions={filterOptions}
        modals={modals}
        onDelete={crud.requestDelete}
        onToggleActive={crud.requestToggle}
      />

      <MasterDataModals
        canManage={canManageMasterData}
        crud={crud}
        modals={modals}
        uomOptions={filterOptions.uomOptions}
      />
    </Stack>
  );
}
