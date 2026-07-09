import { ConfirmModal } from '@shared/components/ConfirmModal';
import { useI18n } from '@shared/i18n';

import type { MasterDataCrud } from '../hooks/useMasterDataCrud';
import { ENTITY_META, type MasterDataModalSet } from '../model/masterDataEntityMeta';
import { CarrierModal } from './CarrierModal';
import { ChargeCodeModal } from './ChargeCodeModal';
import { ContainerTypeModal } from './ContainerTypeModal';
import { CurrencyModal } from './CurrencyModal';
import { ForwarderModal } from './ForwarderModal';
import { IncotermModal } from './IncotermModal';
import { ItemModal } from './ItemModal';
import { SupplierModal } from './SupplierModal';
import { TaskTemplateModal } from './TaskTemplateModal';
import { TransportModeModal } from './TransportModeModal';
import { UomModal } from './UomModal';

/** Every add/edit modal of the master-data screen plus the toggle/delete confirms. */
export function MasterDataModals({
  canManage,
  crud,
  modals,
  uomOptions,
}: {
  canManage: boolean;
  crud: MasterDataCrud;
  modals: MasterDataModalSet;
  uomOptions: Array<{ label: string; value: string }>;
}) {
  const { t } = useI18n();
  const { confirmToggle, confirmDelete } = crud;

  return (
    <>
      <CurrencyModal editing={modals.currency.editing} onClose={modals.currency.close} opened={modals.currency.opened} />
      <IncotermModal editing={modals.incoterm.editing} onClose={modals.incoterm.close} opened={modals.incoterm.opened} />
      <TransportModeModal editing={modals.transportMode.editing} onClose={modals.transportMode.close} opened={modals.transportMode.opened} />
      <ChargeCodeModal editing={modals.chargeCode.editing} onClose={modals.chargeCode.close} opened={modals.chargeCode.opened} uomOptions={uomOptions} />
      <UomModal editing={modals.uom.editing} onClose={modals.uom.close} opened={modals.uom.opened} />
      <ContainerTypeModal editing={modals.containerType.editing} onClose={modals.containerType.close} opened={modals.containerType.opened} />
      <SupplierModal editing={modals.supplier.editing} onClose={modals.supplier.close} opened={modals.supplier.opened} />
      <ForwarderModal editing={modals.forwarder.editing} onClose={modals.forwarder.close} opened={modals.forwarder.opened} />
      <CarrierModal editing={modals.carrier.editing} onClose={modals.carrier.close} opened={modals.carrier.opened} />
      <TaskTemplateModal editing={modals.taskTemplate.editing} onClose={modals.taskTemplate.close} opened={modals.taskTemplate.opened} />
      <ItemModal
        canManage={canManage}
        editing={modals.item.editing}
        onClose={modals.item.close}
        opened={modals.item.opened}
        uomOptions={uomOptions}
      />

      {confirmToggle ? (
        <ConfirmModal
          opened={!!confirmToggle}
          title={t('masterData.confirmToggleTitle')}
          message={
            (confirmToggle.record.is_active !== false)
              ? t('masterData.confirmCloseMessage', { name: ENTITY_META[confirmToggle.entity].getName(confirmToggle.record) })
              : t('masterData.confirmOpenMessage', { name: ENTITY_META[confirmToggle.entity].getName(confirmToggle.record) })
          }
          confirmLabel={(confirmToggle.record.is_active !== false) ? t('masterData.closeAction') : t('masterData.openAction')}
          confirmColor={(confirmToggle.record.is_active !== false) ? 'red' : 'teal'}
          loading={crud.toggleLoading}
          onConfirm={crud.confirmToggleActive}
          onCancel={crud.cancelToggle}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmModal
          opened={!!confirmDelete}
          title={t('masterData.confirmDeleteTitle')}
          message={t(ENTITY_META[confirmDelete.entity].deleteMessageKey, {
            name: ENTITY_META[confirmDelete.entity].getName(confirmDelete.record),
          })}
          confirmLabel={t('masterData.deleteAction')}
          confirmColor="red"
          loading={crud.deleteLoading}
          onConfirm={crud.confirmDeleteRecord}
          onCancel={crud.cancelDelete}
        />
      ) : null}
    </>
  );
}
