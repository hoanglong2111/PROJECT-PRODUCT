import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { deleteChargeCode, updateChargeCode } from '@shared/api/chargeCodes';
import { deleteContainerType, updateContainerType } from '@shared/api/containerTypes';
import { deleteCarrier, deleteForwarder } from '@shared/api/forwarders';
import { deleteItem, updateItem } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import { deleteTaskTemplate } from '@shared/api/taskTemplates';
import {
  deleteCurrency,
  deleteIncoterm,
  deleteSupplier,
  deleteTransportMode,
  updateCurrency,
  updateIncoterm,
  updateSupplier,
  updateTransportMode,
} from '@shared/api/tradeMasterData';
import { deleteUom, updateUom } from '@shared/api/uoms';

import type { CrudTarget, DeleteEntityKind, ToggleEntityKind } from '../model/masterDataEntityMeta';

const DELETE_FNS: Record<DeleteEntityKind, (id: string) => Promise<unknown>> = {
  item: deleteItem,
  currency: deleteCurrency,
  incoterm: deleteIncoterm,
  transportMode: deleteTransportMode,
  chargeCode: deleteChargeCode,
  uom: deleteUom,
  containerType: deleteContainerType,
  supplier: deleteSupplier,
  forwarder: deleteForwarder,
  carrier: deleteCarrier,
  taskTemplate: deleteTaskTemplate,
};

const TOGGLE_FNS: Record<
  ToggleEntityKind,
  (id: string, patch: { is_active: boolean }) => Promise<unknown>
> = {
  item: updateItem,
  currency: updateCurrency,
  incoterm: updateIncoterm,
  transportMode: updateTransportMode,
  chargeCode: updateChargeCode,
  uom: updateUom,
  containerType: updateContainerType,
  supplier: updateSupplier,
};

const LIST_KEYS: Record<DeleteEntityKind, readonly unknown[]> = {
  item: queryKeys.itemLists,
  currency: queryKeys.currencyLists,
  incoterm: queryKeys.incotermLists,
  transportMode: queryKeys.transportModeLists,
  chargeCode: queryKeys.chargeCodeLists,
  uom: queryKeys.uomLists,
  containerType: queryKeys.containerTypeLists,
  supplier: queryKeys.supplierLists,
  forwarder: queryKeys.forwarderLists,
  carrier: queryKeys.carrierLists,
  taskTemplate: queryKeys.taskTemplateLists,
};

export type MasterDataCrud = ReturnType<typeof useMasterDataCrud>;

/**
 * Confirm-then-mutate flow for master-data entities: toggling active status
 * and deleting records, with cache invalidation per entity kind.
 */
export function useMasterDataCrud(canManage: boolean) {
  const queryClient = useQueryClient();
  const [confirmToggle, setConfirmToggle] = useState<CrudTarget<ToggleEntityKind> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CrudTarget | null>(null);

  // Items refresh only their own lists; every other entity also feeds the
  // shared master-data option lists used by pickers across the app.
  const invalidateEntity = (entity: DeleteEntityKind) => {
    void queryClient.invalidateQueries({ queryKey: LIST_KEYS[entity] });
    if (entity !== 'item') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists });
    }
  };

  const toggleMutation = useMutation({
    mutationFn: ({ entity, record }: CrudTarget<ToggleEntityKind>) =>
      TOGGLE_FNS[entity](record.id, { is_active: !(record.is_active !== false) }),
    onSuccess: (_, { entity }) => {
      invalidateEntity(entity);
      setConfirmToggle(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ entity, record }: CrudTarget) => DELETE_FNS[entity](record.id),
    onSuccess: (_, { entity }) => {
      invalidateEntity(entity);
      setConfirmDelete(null);
    },
  });

  return {
    confirmToggle,
    confirmDelete,
    requestToggle: (entity: ToggleEntityKind, record: any) => {
      if (!canManage) return;
      setConfirmToggle({ entity, record });
    },
    requestDelete: (entity: DeleteEntityKind, record: any) => {
      setConfirmDelete({ entity, record });
    },
    confirmToggleActive: () => {
      if (confirmToggle) toggleMutation.mutate(confirmToggle);
    },
    confirmDeleteRecord: () => {
      if (confirmDelete) deleteMutation.mutate(confirmDelete);
    },
    cancelToggle: () => setConfirmToggle(null),
    cancelDelete: () => setConfirmDelete(null),
    toggleLoading: toggleMutation.isPending,
    deleteLoading: deleteMutation.isPending,
  };
}
