import {
  ActionIcon,
  Button,
  Group,
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
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { SummaryTile } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import {
  newRfqPackageLine,
  rfqPackageAmount,
  rfqPackageCbm,
  rfqPackageDescendantIds,
  rfqPackageEffectiveGrossKg,
  type RfqPackageDraft,
  type RfqPackageLineDraft,
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
  const activeHasChildren = active ? packages.some((pkg) => pkg.parent_client_id === active.clientId) : false;
  const activeEffectiveGross = active ? rfqPackageEffectiveGrossKg(packages, active.clientId) : 0;
  const packageComplete = (pkg: RfqPackageDraft) =>
    Number(pkg.qty) > 0 && pkg.lines.some((line) => line.item_id && Number(line.qty) > 0);

  const parentOptionsFor = (pkg: RfqPackageDraft) => {
    const excluded = rfqPackageDescendantIds(packages, pkg.clientId);
    excluded.add(pkg.clientId);
    return packages
      .filter((candidate) => !excluded.has(candidate.clientId))
      .map((candidate) => ({
        value: candidate.clientId,
        label: `#${packages.findIndex((p) => p.clientId === candidate.clientId) + 1} - ${candidate.package_type || t('quotationRequests.itemNotLinked')}`,
      }));
  };

  const updateLine = (pkg: RfqPackageDraft, lineClientId: string, patch: Partial<RfqPackageLineDraft>) => {
    onChange(pkg.clientId, {
      lines: pkg.lines.map((line) => (line.clientId === lineClientId ? { ...line, ...patch } : line)),
    });
  };

  const addLine = (pkg: RfqPackageDraft) => {
    onChange(pkg.clientId, { lines: [...pkg.lines, newRfqPackageLine()] });
  };

  const removeLine = (pkg: RfqPackageDraft, lineClientId: string) => {
    if (pkg.lines.length === 1) return;
    onChange(pkg.clientId, { lines: pkg.lines.filter((line) => line.clientId !== lineClientId) });
  };

  return (
    <div className="purchase-order-line-workspace">
      <div className="purchase-order-line-rail">
        <div className="purchase-order-line-rail-list">
          {packages.map((pkg, index) => {
            const firstLine = pkg.lines[0];
            const firstItem = firstLine ? items.find((candidate) => candidate.id === firstLine.item_id) : undefined;
            const itemSummary = firstLine
              ? `${firstItem?.item_code ?? firstLine.item_description ?? t('quotationRequests.itemNotLinked')}${
                  pkg.lines.length > 1 ? ` +${pkg.lines.length - 1}` : ''
                }`
              : t('quotationRequests.itemNotLinked');
            const amount = rfqPackageAmount(pkg);
            const effectiveGross = rfqPackageEffectiveGrossKg(packages, pkg.clientId);
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
                      {itemSummary}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {pkg.package_type || t('quotationRequests.field.packageType')}
                      {parentIndex > -1 ? ` · ${t('quotationRequests.packedInto', { index: parentIndex + 1 })}` : ''}
                    </Text>
                  </div>
                </div>
                <div className="purchase-order-line-rail-side">
                  <Text fw={800} size="sm" className="tabular-nums">
                    <NumberFormatter value={amount} thousandSeparator decimalScale={2} />
                  </Text>
                  <Text size="xs" c="dimmed" className="tabular-nums rfq-package-rail-metrics">
                    <span><NumberFormatter value={rfqPackageCbm(pkg)} thousandSeparator decimalScale={3} /> CBM</span>
                    <span>·</span>
                    <span><NumberFormatter value={effectiveGross} thousandSeparator decimalScale={3} /> kg</span>
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
                label={t('quotationRequests.field.requestTotalUsd')}
                value={<NumberFormatter value={activeAmount} thousandSeparator decimalScale={2} />}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              <TextInput
                label={t('quotationRequests.field.packageType')}
                placeholder={t('quotationRequests.field.packageType')}
                value={active.package_type}
                onChange={(event) => onChange(active.clientId, { package_type: event.currentTarget.value })}
              />
              <Select
                label={
                  <HeaderLabel
                    label={t('quotationRequests.field.packedInto')}
                    hint={t('quotationRequests.field.packedIntoHint')}
                  />
                }
                placeholder={t('quotationRequests.field.packedIntoNone')}
                data={parentOptionsFor(active)}
                value={active.parent_client_id || null}
                clearable
                onChange={(value) => onChange(active.clientId, { parent_client_id: value ?? '' })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
              <NumberInput
                label={t('quotationRequests.field.length')}
                min={0}
                value={active.length_cm}
                decimalScale={2}
                onChange={(value) => onChange(active.clientId, { length_cm: num(value) })}
              />
              <NumberInput
                label={t('quotationRequests.field.width')}
                min={0}
                value={active.width_cm}
                decimalScale={2}
                onChange={(value) => onChange(active.clientId, { width_cm: num(value) })}
              />
              <NumberInput
                label={t('quotationRequests.field.height')}
                min={0}
                value={active.height_cm}
                decimalScale={2}
                onChange={(value) => onChange(active.clientId, { height_cm: num(value) })}
              />
              <NumberInput
                label={t('quotationRequests.field.packageCbm')}
                value={Number(rfqPackageCbm(active).toFixed(4))}
                decimalScale={4}
                readOnly
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
              <NumberInput
                label={t('quotationRequests.field.packageQty')}
                min={0}
                value={active.qty}
                decimalScale={0}
                onChange={(value) => onChange(active.clientId, { qty: num(value, 1) })}
              />
              <div className="rfq-gross-input-stack">
                <NumberInput
                  label={activeHasChildren ? (
                    <HeaderLabel
                      label={t('quotationRequests.field.grossPerPackage')}
                      hint={t('quotationRequests.field.grossEffectiveHint')}
                    />
                  ) : t('quotationRequests.field.grossPerPackage')}
                  min={0}
                  value={active.gross_weight_per_package_kg}
                  thousandSeparator=","
                  decimalScale={3}
                  onChange={(value) => onChange(active.clientId, { gross_weight_per_package_kg: num(value) })}
                />
                {activeHasChildren ? (
                  <Text size="xs" c="dimmed" className="rfq-gross-effective-description tabular-nums">
                    {t('quotationRequests.field.grossEffectiveValue', {
                      value: new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(activeEffectiveGross),
                    })}
                  </Text>
                ) : null}
              </div>
            </SimpleGrid>

            <div className="rfq-container-lines">
              <div className="rfq-package-line-header" role="row" aria-hidden="true">
                <span>{t('quotationRequests.field.packageItem')}</span>
                <span>{t('quotations.quantity')}</span>
                <span>{t('forms.unit')}</span>
                <span>{t('quotationRequests.field.unitPriceUsd')}</span>
                <span />
              </div>
              {active.lines.map((line) => (
                <div className="rfq-package-line-row" role="row" key={line.clientId}>
                  <div className="rfq-container-line-cell rfq-container-line-cell-item">
                    <span className="rfq-package-cell-label">{t('quotationRequests.field.packageItem')}</span>
                    <Select
                      aria-label={t('quotationRequests.field.packageItem')}
                      placeholder={t('quotationRequests.itemNotLinked')}
                      data={itemOptions}
                      value={line.item_id || null}
                      searchable
                      clearable
                      size="xs"
                      onChange={(value) => {
                        const item = items.find((candidate) => candidate.id === value);
                        updateLine(active, line.clientId, {
                          item_id: value ?? '',
                          item_description: item?.item_name_en ?? item?.item_name ?? line.item_description,
                          unit: line.unit || item?.base_uom || '',
                          unit_price: line.unit_price === '' && item?.unit_price_usd != null ? Number(item.unit_price_usd) : line.unit_price,
                        });
                      }}
                    />
                  </div>
                  <div className="rfq-container-line-cell rfq-container-line-cell-qty">
                    <span className="rfq-package-cell-label">{t('quotations.quantity')}</span>
                    <NumberInput
                      aria-label={t('quotations.quantity')}
                      value={line.qty}
                      min={0}
                      decimalScale={2}
                      size="xs"
                      styles={{ input: { textAlign: 'right' } }}
                      onChange={(value) => updateLine(active, line.clientId, { qty: num(value, 1) })}
                    />
                  </div>
                  <div className="rfq-container-line-cell rfq-container-line-cell-unit">
                    <span className="rfq-package-cell-label">{t('forms.unit')}</span>
                    <Select
                      aria-label={t('forms.unit')}
                      data={unitOptions}
                      value={line.unit || null}
                      searchable
                      size="xs"
                      onChange={(value) => updateLine(active, line.clientId, { unit: value ?? '' })}
                    />
                  </div>
                  <div className="rfq-container-line-cell rfq-container-line-cell-price">
                    <span className="rfq-package-cell-label">{t('quotationRequests.field.unitPriceUsd')}</span>
                    <NumberInput
                      aria-label={t('quotationRequests.field.unitPriceUsd')}
                      value={line.unit_price}
                      min={0}
                      thousandSeparator=","
                      decimalScale={2}
                      size="xs"
                      styles={{ input: { textAlign: 'right' } }}
                      onChange={(value) => updateLine(active, line.clientId, { unit_price: num(value) })}
                    />
                  </div>
                  <div className="rfq-container-line-remove">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={t('quotationRequests.removePackageLine')}
                      disabled={active.lines.length === 1}
                      onClick={() => removeLine(active, line.clientId)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </div>
                </div>
              ))}
              <Group justify="space-between" align="center" mt={4}>
                <Button
                  type="button"
                  variant="subtle"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => addLine(active)}
                >
                  {t('quotationRequests.addPackageLine')}
                </Button>
                <Text size="xs" c="dimmed" className="tabular-nums">
                  <NumberFormatter value={activeAmount} thousandSeparator decimalScale={2} />
                </Text>
              </Group>
            </div>

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
