import {
  ActionIcon,
  NumberFormatter,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import type { Item } from '@shared/api/items';
import { SummaryTile } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import {
  RFQ_PACKAGE_CUSTOM_PRESET,
  rfqPackageAmount,
  rfqPackageCbm,
  rfqPackageDescendantIds,
  rfqPackageSizePreset,
  rfqPackageSizePresets,
  rfqPackageTypes,
  type RfqPackageDraft,
  type RfqPackageType,
} from '../model/quotationRequestModel';

type Props = {
  packages: RfqPackageDraft[];
  activeId: string | null;
  onActiveChange: (clientId: string | null) => void;
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

export function PackageListEditor({
  activeId,
  itemOptions,
  items,
  onActiveChange,
  onAdd,
  onChange,
  onRemove,
  packages,
  unitOptions,
}: Props) {
  const { t } = useI18n();
  const active = packages.find((pkg) => pkg.clientId === activeId) ?? packages[0] ?? null;
  const activeIndex = active ? packages.findIndex((pkg) => pkg.clientId === active.clientId) : -1;
  const activeAmount = active ? rfqPackageAmount(active) : 0;
  const packageComplete = (pkg: RfqPackageDraft) => Boolean(pkg.item_id) && Number(pkg.qty) > 0;

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

  const parentOptionsFor = (pkg: RfqPackageDraft) => {
    const excluded = rfqPackageDescendantIds(packages, pkg.clientId);
    excluded.add(pkg.clientId);
    return packages
      .filter((candidate) => !excluded.has(candidate.clientId))
      .map((candidate) => ({
        value: candidate.clientId,
        label: `#${packages.findIndex((p) => p.clientId === candidate.clientId) + 1} - ${t(`quotationRequests.packageType.${candidate.package_type}`)}`,
      }));
  };

  return (
    <div className="purchase-order-line-workspace">
      <div className="purchase-order-line-rail">
        <div className="purchase-order-line-rail-list">
          {packages.map((pkg, index) => {
            const item = items.find((candidate) => candidate.id === pkg.item_id);
            const amount = rfqPackageAmount(pkg);
            const isActive = active?.clientId === pkg.clientId;
            const parentIndex = pkg.parent_client_id
              ? packages.findIndex((candidate) => candidate.clientId === pkg.parent_client_id)
              : -1;

            return (
              <div
                key={pkg.clientId}
                role="button"
                tabIndex={0}
                data-line-id={pkg.clientId}
                onClick={() => onActiveChange(pkg.clientId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onActiveChange(pkg.clientId);
                  }
                }}
                className={`purchase-order-line-rail-item${isActive ? ' is-active' : ''}${packageComplete(pkg) ? '' : ' is-incomplete'}`}
              >
                <div className="purchase-order-line-rail-item-main">
                  <div className="purchase-order-line-rail-index">
                    #{index + 1}
                    {packageComplete(pkg) ? null : <span className="purchase-order-line-rail-dot" />}
                  </div>
                  <div className="purchase-order-line-rail-copy">
                    <Text fw={700} size="sm" lineClamp={1}>
                      {item?.item_code ?? pkg.item_description ?? t('quotationRequests.itemNotLinked')}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {t(`quotationRequests.packageType.${pkg.package_type}`)}
                      {parentIndex > -1 ? ` · ${t('quotationRequests.packedInto', { index: parentIndex + 1 })}` : ''}
                    </Text>
                  </div>
                </div>
                <div className="purchase-order-line-rail-side">
                  <Text fw={800} size="sm" className="tabular-nums">
                    <NumberFormatter value={amount} thousandSeparator decimalScale={2} />
                  </Text>
                  <Text size="xs" c="dimmed" className="tabular-nums">
                    <NumberFormatter value={rfqPackageCbm(pkg)} thousandSeparator decimalScale={3} /> CBM
                  </Text>
                </div>
                <ActionIcon
                  className="purchase-order-line-rail-delete"
                  variant="subtle"
                  color="red"
                  size="sm"
                  aria-label={t('quotationRequests.removePackage')}
                  disabled={packages.length === 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(pkg.clientId);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </div>
            );
          })}
          <UnstyledButton type="button" className="purchase-order-line-rail-add" onClick={onAdd}>
            <IconPlus size={14} />
            <span>{t('quotationRequests.addPackage')}</span>
          </UnstyledButton>
        </div>
      </div>

      <div className="purchase-order-line-detail">
        {active ? (
          <Stack gap="sm">
            <Text fw={700}>{t('quotationRequests.editingPackage', { index: activeIndex + 1 })}</Text>
            <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="sm">
              <SummaryTile
                label={t('quotationRequests.field.packageCbm')}
                tone="accent"
                value={<NumberFormatter value={rfqPackageCbm(active)} thousandSeparator decimalScale={3} />}
              />
              <SummaryTile
                label={t('quotationRequests.field.requestTotal')}
                value={<NumberFormatter value={activeAmount} thousandSeparator decimalScale={2} />}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
              <Select
                label={t('quotationRequests.field.packageItem')}
                placeholder={t('quotationRequests.itemNotLinked')}
                data={itemOptions}
                value={active.item_id || null}
                searchable
                clearable
                onChange={(value) => {
                  const item = items.find((candidate) => candidate.id === value);
                  onChange(active.clientId, {
                    item_id: value ?? '',
                    item_description: item?.item_name_en ?? item?.item_name ?? active.item_description,
                    unit: active.unit || item?.base_uom || '',
                    unit_price: active.unit_price === '' && item?.unit_price_usd != null
                      ? Number(item.unit_price_usd)
                      : active.unit_price,
                  });
                }}
              />
              <TextInput
                label={t('quotationRequests.field.itemDescription')}
                value={active.item_description}
                onChange={(event) => onChange(active.clientId, { item_description: event.currentTarget.value })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="sm">
              <Select
                label={t('quotationRequests.field.packageType')}
                data={packageTypeOptions}
                value={active.package_type}
                onChange={(value) => value && onChange(active.clientId, { package_type: value as RfqPackageType })}
              />
              <Select
                label={t('quotationRequests.field.packedInto')}
                description={t('quotationRequests.field.packedIntoHint')}
                placeholder={t('quotationRequests.field.packedIntoNone')}
                data={parentOptionsFor(active)}
                value={active.parent_client_id || null}
                clearable
                onChange={(value) => onChange(active.clientId, { parent_client_id: value ?? '' })}
              />
              <Select
                label={t('quotationRequests.field.sizePreset')}
                data={sizePresetOptionsFor(active.package_type)}
                value={active.size_preset}
                onChange={(value) => {
                  if (!value) return;
                  const preset = rfqPackageSizePreset(value);
                  onChange(active.clientId, {
                    size_preset: value,
                    ...(preset
                      ? { length_cm: preset.length_cm, width_cm: preset.width_cm, height_cm: preset.height_cm }
                      : {}),
                  });
                }}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
              {(() => {
                const isCustom = active.size_preset === RFQ_PACKAGE_CUSTOM_PRESET;
                return (
                  <>
                    <NumberInput
                      label={t('quotationRequests.field.length')}
                      min={0}
                      value={active.length_cm}
                      decimalScale={2}
                      readOnly={!isCustom}
                      onChange={(value) => onChange(active.clientId, { length_cm: num(value) })}
                    />
                    <NumberInput
                      label={t('quotationRequests.field.width')}
                      min={0}
                      value={active.width_cm}
                      decimalScale={2}
                      readOnly={!isCustom}
                      onChange={(value) => onChange(active.clientId, { width_cm: num(value) })}
                    />
                    <NumberInput
                      label={t('quotationRequests.field.height')}
                      min={0}
                      value={active.height_cm}
                      decimalScale={2}
                      readOnly={!isCustom}
                      onChange={(value) => onChange(active.clientId, { height_cm: num(value) })}
                    />
                    <NumberInput
                      label={t('quotationRequests.field.packageCbm')}
                      value={Number(rfqPackageCbm(active).toFixed(4))}
                      decimalScale={4}
                      readOnly
                    />
                  </>
                );
              })()}
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
              <NumberInput
                label={t('quotationRequests.field.packageQty')}
                min={0}
                value={active.qty}
                decimalScale={0}
                onChange={(value) => onChange(active.clientId, { qty: num(value, 1) })}
              />
              <NumberInput
                label={t('quotationRequests.field.grossPerPackage')}
                min={0}
                value={active.gross_weight_per_package_kg}
                thousandSeparator=","
                decimalScale={3}
                onChange={(value) => onChange(active.clientId, { gross_weight_per_package_kg: num(value) })}
              />
              <Select
                label={t('forms.unit')}
                data={unitOptions}
                value={active.unit || null}
                searchable
                onChange={(value) => onChange(active.clientId, { unit: value ?? '' })}
              />
              <NumberInput
                label={t('quotations.unitPrice')}
                min={0}
                value={active.unit_price}
                thousandSeparator=","
                decimalScale={2}
                onChange={(value) => onChange(active.clientId, { unit_price: num(value) })}
              />
            </SimpleGrid>
            <Textarea
              label={t('quotationRequests.field.lineNote')}
              value={active.note}
              autosize
              minRows={2}
              onChange={(event) => onChange(active.clientId, { note: event.currentTarget.value })}
            />
          </Stack>
        ) : null}
      </div>
    </div>
  );
}
