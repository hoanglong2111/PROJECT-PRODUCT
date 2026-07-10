import { Badge, Group, NumberFormatter, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import type { DeliveryOrder } from '@shared/api/logistics';
import { useI18n } from '@shared/i18n';
import { EntityLink } from '@entities/logistics';

import { getAllocationWeightKg, getContainerCount, shippingIcon } from '../model/deliveryOrderModel';
import { DeliveryOrderFact } from './DeliveryOrderFact';

export function DeliveryOrderOverviewTab({ deliveryOrder }: { deliveryOrder: DeliveryOrder }) {
  const { shippingMethodLabel, t } = useI18n();
  const allocationWeightKg = getAllocationWeightKg(deliveryOrder);
  const containerCount = getContainerCount(deliveryOrder);
  const ShippingIcon = shippingIcon[deliveryOrder.logistics_shipping.shipping_method];
  const sourcePoNumber = deliveryOrder.source_po_number ?? deliveryOrder.sap_integration.po_number ?? '-';
  const sourceLotNumber = deliveryOrder.source_lot_no ?? deliveryOrder.product_details.lot_number ?? '-';
  const supplierName = deliveryOrder.sap_integration.supplier_name ?? t('deliveryOrders.supplierPending');

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="sm" className="delivery-order-control-grid delivery-order-overview-pages">
        <Paper withBorder p="sm">
          <Stack gap="sm">
            <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
              {t('deliveryOrders.supplierAllocationHeader')}
            </Text>
            <div className="do-supplier-body">
              <Stack gap={6}>
                <Group gap="xs" align="center" wrap="wrap">
                  <EntityLink type="po" id={sourcePoNumber} compact />
                  <Badge color="gray" variant="light">
                    {sourceLotNumber}
                  </Badge>
                </Group>
                <Text size="sm" fw={600} lineClamp={1} title={supplierName}>
                  {supplierName}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1} title={deliveryOrder.product_details.item_name_requested}>
                  {deliveryOrder.product_details.item_name_requested}
                </Text>
              </Stack>
              <div className="do-kpi-row do-kpi-grid">
                <DeliveryOrderFact label={t('deliveryOrders.overviewItems')} value={<NumberFormatter value={deliveryOrder.source_lines.length} thousandSeparator />} />
                <DeliveryOrderFact label={deliveryOrder.product_details.unit || 'PCS'} value={<NumberFormatter value={deliveryOrder.product_details.quantity} thousandSeparator />} />
                <DeliveryOrderFact label="kg" value={<NumberFormatter value={allocationWeightKg} thousandSeparator />} />
                <DeliveryOrderFact label={t('deliveryOrders.overviewContainers')} value={<NumberFormatter value={containerCount} thousandSeparator />} />
              </div>
            </div>
          </Stack>
        </Paper>

        <Paper withBorder p="sm">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Stack gap="sm" className="do-detail-col">
              <Group gap="sm" align="flex-start" wrap="nowrap" className="do-detail-col-head">
                <ShippingIcon size={22} />
                <Stack gap={4}>
                  <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                    {t('common.route')}
                  </Text>
                  <Text fw={700}>
                    {deliveryOrder.logistics_shipping.port_of_departure || '-'} {t('deliveryOrders.routeConnector')} {deliveryOrder.logistics_shipping.port_of_destination || '-'}
                  </Text>
                </Stack>
              </Group>
              <div className="do-detail-list">
                <DetailListRow label={t('deliveryOrders.etdEta')} value={`${deliveryOrder.logistics_shipping.etd_planned ?? '-'} / ${deliveryOrder.logistics_shipping.eta_planned ?? '-'}`} />
                <DetailListRow label={t('deliveryOrders.mblVessel')} value={`${deliveryOrder.logistics_shipping.shipping_line ?? '-'} / ${deliveryOrder.logistics_shipping.vessel_code ?? '-'}`} />
                <DetailListRow label={t('forms.incoterms')} value={deliveryOrder.logistics_shipping.incoterms || '-'} />
                <DetailListRow label={t('forms.shippingMethod')} value={shippingMethodLabel(deliveryOrder.logistics_shipping.shipping_method)} />
              </div>
            </Stack>

            <Stack gap="sm" className="do-detail-col">
              <div className="do-detail-col-head">
                <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                  {t('forms.warehouse')}
                </Text>
              </div>
              <div className="do-detail-list">
                <DetailListRow label={t('forms.plannedWarehouseEntry')} value={deliveryOrder.warehouse_tracking.planned_entry_date ?? '-'} />
                <DetailListRow label={t('forms.warehouseDeadline')} value={deliveryOrder.warehouse_tracking.warehouse_deadline || '-'} />
                <DetailListRow label={t('forms.actualEntryDate')} value={deliveryOrder.warehouse_tracking.actual_entry_date ?? '-'} />
              </div>
            </Stack>
          </SimpleGrid>
        </Paper>
      </SimpleGrid>

      {deliveryOrder.order_info.notes || deliveryOrder.order_info.xnk_notes ? (
        <Paper withBorder p="md" className="do-notes-panel">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {deliveryOrder.order_info.notes ? (
              <Stack gap={4}>
                <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                  {t('common.notes')}
                </Text>
                <Text size="sm">{deliveryOrder.order_info.notes}</Text>
              </Stack>
            ) : null}
            {deliveryOrder.order_info.xnk_notes ? (
              <Stack gap={4}>
                <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
                  {t('deliveryOrders.xnkNotes')}
                </Text>
                <Text size="sm">{deliveryOrder.order_info.xnk_notes}</Text>
              </Stack>
            ) : null}
          </SimpleGrid>
        </Paper>
      ) : null}
    </Stack>
  );
}

function DetailListRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="do-detail-list-row">
      <Text size="sm" c="dimmed" lineClamp={1} title={typeof label === 'string' ? label : undefined}>
        {label}
      </Text>
      <Text component="div" size="sm" fw={700} lineClamp={1} title={typeof value === 'string' ? value : undefined}>
        {value}
      </Text>
    </div>
  );
}
