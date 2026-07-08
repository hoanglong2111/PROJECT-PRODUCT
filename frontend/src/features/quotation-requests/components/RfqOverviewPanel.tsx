import { Paper, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import { buildRfqRouteLabel, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { DateTimeText } from '@shared/components/DateTimeText';
import { FieldPair } from '@shared/components/FieldPair';
import { formatDate } from '@shared/utils/date';

import { isAirMode, isFclMode, type TFn } from '../model/quotationRequestModel';

function MetricTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rfq-detail-metric">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase">{label}</Text>
      <Text size="md" fw={700} className="tabular-nums">{value}</Text>
    </div>
  );
}

export function RfqOverviewPanel({ request, t, totalWeight }: { request: QuotationRequestV1; t: TFn; totalWeight: number }) {
  const lines = request.lines ?? [];

  return (
    <Paper withBorder p={0} className="rfq-overview-panel">
      <div className="rfq-panel-head">
        <div>
          <Title order={4}>{t('quotationRequests.section.commercial')}</Title>
          <Text size="xs" c="dimmed">{buildRfqRouteLabel(request)}</Text>
        </div>
      </div>
      <div className="rfq-overview-body">
        <div className="rfq-overview-cargo">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('quotationRequests.cargoSummary')}</Text>
          <div className="rfq-detail-metric-grid">
            <MetricTile label={t('quotationRequests.field.weight')} value={totalWeight ? `${totalWeight} kg` : '-'} />
            <MetricTile label={t('quotationRequests.field.volume')} value={request.volume_cbm != null ? `${request.volume_cbm} cbm` : '-'} />
            {isAirMode(request.mode) ? (
              <>
                <MetricTile
                  label={t('quotationRequests.field.dimWeight')}
                  value={request.dim_weight_kg != null ? `${request.dim_weight_kg} kg` : '-'}
                />
                <MetricTile
                  label={t('quotationRequests.field.chargeableWeight')}
                  value={request.chargeable_weight_kg != null ? `${request.chargeable_weight_kg} kg` : '-'}
                />
              </>
            ) : isFclMode(request.mode) ? (
              <MetricTile label={t('quotationRequests.field.container')} value={request.container_type ?? '-'} />
            ) : (
              <MetricTile
                label={t('quotationRequests.field.chargeableRevenueTon')}
                value={request.chargeable_revenue_ton != null ? `${request.chargeable_revenue_ton} RT` : '-'}
              />
            )}
            <MetricTile label={t('quotationRequests.field.lines')} value={String(request.lines?.length ?? 0)} />
          </div>
          <div className="rfq-overview-items">
            <div className="rfq-overview-items-head">
              <Text size="sm" fw={800}>{t('quotationRequests.field.lines')}</Text>
              <Text size="xs" c="dimmed" className="tabular-nums">
                {lines.length} {t('quotationRequests.lines')}
              </Text>
            </div>
            {lines.length === 0 ? (
              <div className="rfq-overview-items-empty">
                <Text c="dimmed" size="sm">{t('quotationRequests.itemsEmpty')}</Text>
              </div>
            ) : (
              <div className="rfq-overview-item-list">
                {lines.map((line) => (
                  <div className="rfq-overview-item-row" key={line.id}>
                    <div className="rfq-overview-item-main">
                      <Text size="xs" c="dimmed" className="tabular-nums">#{line.line_no}</Text>
                      <div>
                        <Text size="sm" fw={700}>
                          {line.item?.item_code ?? line.item_id ?? '-'}
                        </Text>
                        {line.item_description || line.item?.item_name_en || line.item?.item_name ? (
                          <Text size="xs" c="dimmed">
                            {line.item_description ?? line.item?.item_name_en ?? line.item?.item_name}
                          </Text>
                        ) : null}
                      </div>
                    </div>
                    <Text size="sm" ta="right" className="tabular-nums">
                      {line.qty ?? '-'} {line.unit ?? ''}
                    </Text>
                    <Text size="sm" ta="right" c="dimmed" className="tabular-nums">
                      {line.gross_weight_kg ?? '-'} kg
                    </Text>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rfq-overview-facts">
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.customerRef')} value={request.customer_ref ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.customerPoRef')} value={request.customer_po_ref ?? '-'} />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.customerContractRef')}
            value={request.customer_contract_ref ?? '-'}
          />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.supplier')}
            value={request.supplier ? `${request.supplier.supplier_code} - ${request.supplier.supplier_name}` : request.supplier_id ?? '-'}
          />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.mode')} value={request.mode ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.incoterm')} value={request.incoterm_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotations.currency')} value={request.currency_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.readyDate')} value={formatDate(request.desired_cargo_ready_date)} />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.createdAt')}
            value={<DateTimeText value={request.create_at} showZone />}
          />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.updatedAt')}
            value={<DateTimeText value={request.update_at} showZone />}
          />
        </div>
      </div>
      {request.note ? (
        <div className="rfq-detail-note">
          <Text size="sm">{request.note}</Text>
        </div>
      ) : null}
    </Paper>
  );
}
