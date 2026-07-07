import { ActionIcon, Button, NumberInput, Select, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { Item } from '@shared/api/items';
import { useI18n } from '@shared/i18n';

import {
  RFQ_PACKAGE_CUSTOM_PRESET,
  rfqPackageCbm,
  rfqPackageSizePreset,
  rfqPackageSizePresets,
  rfqPackageTypes,
  type RfqPackageDraft,
  type RfqPackageType,
} from '../model/quotationRequestModel';

type Props = {
  packages: RfqPackageDraft[];
  items: Item[];
  itemOptions: { value: string; label: string }[];
  unitOptions: { value: string; label: string }[];
  onChange: (clientId: string, patch: Partial<RfqPackageDraft>) => void;
  onAdd: () => void;
  onRemove: (clientId: string) => void;
};

const num = (value: unknown, fallback: number | '' = '') => {
  if (value === '' || value == null) return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export function PackageListEditor({ items, itemOptions, onAdd, onChange, onRemove, packages, unitOptions }: Props) {
  const { t } = useI18n();

  const packageTypeOptions = rfqPackageTypes.map((type) => ({
    value: type,
    label: t(`quotationRequests.packageType.${type}`),
  }));

  const sizePresetOptionsFor = (type: RfqPackageType) => [
    ...rfqPackageSizePresets
      .filter((preset) => !preset.types || preset.types.includes(type))
      .map((preset) => ({ value: preset.value, label: t(`quotationRequests.sizePreset.${preset.value}`) })),
    { value: RFQ_PACKAGE_CUSTOM_PRESET, label: t('quotationRequests.sizePreset.CUSTOM') },
  ];

  return (
    <div className="rfq-package-grid" role="table" aria-label={t('quotationRequests.section.packages')}>
      <div className="rfq-package-header" role="row" aria-hidden="true">
        <span>{t('quotationRequests.field.packageType')}</span>
        <span>{t('quotationRequests.field.packageItem')}</span>
        <span>{t('quotationRequests.field.sizePreset')}</span>
        <span>{t('quotationRequests.field.length')}</span>
        <span>{t('quotationRequests.field.width')}</span>
        <span>{t('quotationRequests.field.height')}</span>
        <span>{t('quotationRequests.field.packageQty')}</span>
        <span>{t('quotationRequests.field.grossPerPackage')}</span>
        <span>{t('quotationRequests.field.packageCbm')}</span>
        <span>{t('forms.unit')}</span>
        <span>{t('quotations.unitPrice')}</span>
        <span />
      </div>

      {packages.map((pkg) => {
        const isCustom = pkg.size_preset === RFQ_PACKAGE_CUSTOM_PRESET;
        return (
          <div className="rfq-package-row" role="row" key={pkg.clientId}>
            <div className="rfq-package-cell rfq-package-cell-type">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.packageType')}</span>
              <Select
                aria-label={t('quotationRequests.field.packageType')}
                data={packageTypeOptions}
                value={pkg.package_type}
                onChange={(value) => value && onChange(pkg.clientId, { package_type: value as RfqPackageType })}
                size="xs"
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-item">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.packageItem')}</span>
              <Select
                aria-label={t('quotationRequests.field.packageItem')}
                placeholder={t('quotationRequests.itemNotLinked')}
                data={itemOptions}
                value={pkg.item_id || null}
                searchable
                clearable
                size="xs"
                onChange={(value) => {
                  const item = items.find((candidate) => candidate.id === value);
                  onChange(pkg.clientId, {
                    item_id: value ?? '',
                    item_description: item?.item_name_en ?? item?.item_name ?? pkg.item_description,
                    unit: pkg.unit || item?.base_uom || '',
                    unit_price: pkg.unit_price === '' && item?.unit_price_usd != null ? Number(item.unit_price_usd) : pkg.unit_price,
                  });
                }}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-size">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.sizePreset')}</span>
              <Select
                aria-label={t('quotationRequests.field.sizePreset')}
                data={sizePresetOptionsFor(pkg.package_type)}
                value={pkg.size_preset}
                onChange={(value) => {
                  if (!value) return;
                  const preset = rfqPackageSizePreset(value);
                  onChange(pkg.clientId, {
                    size_preset: value,
                    ...(preset
                      ? { length_cm: preset.length_cm, width_cm: preset.width_cm, height_cm: preset.height_cm }
                      : {}),
                  });
                }}
                size="xs"
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-length">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.length')}</span>
              <NumberInput
                aria-label={t('quotationRequests.field.length')}
                value={pkg.length_cm}
                min={0}
                decimalScale={2}
                size="xs"
                readOnly={!isCustom}
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { length_cm: num(value) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-width">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.width')}</span>
              <NumberInput
                aria-label={t('quotationRequests.field.width')}
                value={pkg.width_cm}
                min={0}
                decimalScale={2}
                size="xs"
                readOnly={!isCustom}
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { width_cm: num(value) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-height">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.height')}</span>
              <NumberInput
                aria-label={t('quotationRequests.field.height')}
                value={pkg.height_cm}
                min={0}
                decimalScale={2}
                size="xs"
                readOnly={!isCustom}
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { height_cm: num(value) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-qty">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.packageQty')}</span>
              <NumberInput
                aria-label={t('quotationRequests.field.packageQty')}
                value={pkg.qty}
                min={0}
                decimalScale={0}
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { qty: num(value, 1) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-gross">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.grossPerPackage')}</span>
              <NumberInput
                aria-label={t('quotationRequests.field.grossPerPackage')}
                value={pkg.gross_weight_per_package_kg}
                min={0}
                decimalScale={3}
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { gross_weight_per_package_kg: num(value) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-cbm rfq-package-cbm tabular-nums">
              <span className="rfq-package-cell-label">{t('quotationRequests.field.packageCbm')}</span>
              <Text size="sm">{rfqPackageCbm(pkg).toFixed(3)}</Text>
            </div>

            <div className="rfq-package-cell rfq-package-cell-unit">
              <span className="rfq-package-cell-label">{t('forms.unit')}</span>
              <Select
                aria-label={t('forms.unit')}
                data={unitOptions}
                value={pkg.unit || null}
                searchable
                size="xs"
                onChange={(value) => onChange(pkg.clientId, { unit: value ?? '' })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-cell-price">
              <span className="rfq-package-cell-label">{t('quotations.unitPrice')}</span>
              <NumberInput
                aria-label={t('quotations.unitPrice')}
                value={pkg.unit_price}
                min={0}
                thousandSeparator=","
                decimalScale={2}
                size="xs"
                styles={{ input: { textAlign: 'right' } }}
                onChange={(value) => onChange(pkg.clientId, { unit_price: num(value) })}
              />
            </div>

            <div className="rfq-package-cell rfq-package-remove">
              <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                aria-label={t('quotationRequests.removePackage')}
                disabled={packages.length === 1}
                onClick={() => onRemove(pkg.clientId)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="light"
        size="xs"
        className="rfq-add-package-button"
        leftSection={<IconPlus size={14} />}
        onClick={onAdd}
      >
        {t('quotationRequests.addPackage')}
      </Button>
    </div>
  );
}
