import type { ChargeCode } from '@shared/api/chargeCodes';
import type { ContainerType } from '@shared/api/containerTypes';
import type { Carrier, Forwarder } from '@shared/api/forwarders';
import type { Item } from '@shared/api/items';
import type { TaskTemplate } from '@shared/api/taskTemplates';
import type { Currency, Incoterm, Supplier, TransportMode } from '@shared/api/tradeMasterData';
import type { Uom } from '@shared/api/uoms';
import type { EntityModal } from '@shared/hooks/useEntityModal';

/** Entities whose active status can be toggled from the reference tables. */
export type ToggleEntityKind =
  | 'item'
  | 'currency'
  | 'incoterm'
  | 'transportMode'
  | 'chargeCode'
  | 'uom'
  | 'containerType'
  | 'supplier';

/** Every entity kind that supports delete from the master-data screen. */
export type DeleteEntityKind = ToggleEntityKind | 'forwarder' | 'carrier' | 'taskTemplate';

export type CrudTarget<K extends DeleteEntityKind = DeleteEntityKind> = {
  entity: K;
  record: any;
};

type EntityMeta = {
  /** Human-readable name shown in confirm dialogs. */
  getName: (record: any) => string;
  /** i18n key of the delete confirmation message ({ name } interpolated). */
  deleteMessageKey: string;
};

export const ENTITY_META: Record<DeleteEntityKind, EntityMeta> = {
  item: {
    getName: (r) => `${r.item_code} - ${r.item_name}`,
    deleteMessageKey: 'masterData.confirmDeleteItem',
  },
  currency: {
    getName: (r) => `${r.currency_code} - ${r.currency_name}`,
    deleteMessageKey: 'masterData.confirmDeleteCurrency',
  },
  incoterm: {
    getName: (r) => r.incoterm_code,
    deleteMessageKey: 'masterData.confirmDeleteIncoterm',
  },
  transportMode: {
    getName: (r) => `${r.mode_code} - ${r.mode_name}`,
    deleteMessageKey: 'masterData.confirmDeleteTransportMode',
  },
  chargeCode: {
    getName: (r) => `${r.charge_code} - ${r.charge_name_en}`,
    deleteMessageKey: 'masterData.confirmDeleteChargeCode',
  },
  uom: {
    getName: (r) => r.uom_code,
    deleteMessageKey: 'masterData.confirmDeleteUom',
  },
  containerType: {
    getName: (r) => `${r.cont_code} - ${r.name_en}`,
    deleteMessageKey: 'masterData.confirmDeleteContainerType',
  },
  supplier: {
    getName: (r) => `${r.supplier_code} - ${r.supplier_name}`,
    deleteMessageKey: 'masterData.confirmDeleteSupplier',
  },
  forwarder: {
    getName: (r) => `${r.forwarder_code} - ${r.forwarder_name}`,
    deleteMessageKey: 'masterData.confirmDeleteForwarder',
  },
  carrier: {
    getName: (r) => `${r.carrier_code} - ${r.carrier_name}`,
    deleteMessageKey: 'masterData.confirmDeleteCarrier',
  },
  taskTemplate: {
    getName: (r) => `${r.task_code} - ${r.task_name}`,
    deleteMessageKey: 'masterData.confirmDeleteTaskTemplate',
  },
};

/** One add/edit modal per master-data entity, owned by the page and shared by tabs + modals. */
export type MasterDataModalSet = {
  item: EntityModal<Item>;
  currency: EntityModal<Currency>;
  incoterm: EntityModal<Incoterm>;
  transportMode: EntityModal<TransportMode>;
  chargeCode: EntityModal<ChargeCode>;
  uom: EntityModal<Uom>;
  containerType: EntityModal<ContainerType>;
  supplier: EntityModal<Supplier>;
  forwarder: EntityModal<Forwarder>;
  carrier: EntityModal<Carrier>;
  taskTemplate: EntityModal<TaskTemplate>;
};
