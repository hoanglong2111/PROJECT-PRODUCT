import { Badge, Paper, Text } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import type { MessageKey } from '@shared/i18n';

import { rfqReadiness, rfqResponseQuotations, type RfqReadinessKey, type TFn } from '../model/quotationRequestModel';

const READINESS_LABEL_KEY: Record<RfqReadinessKey, MessageKey> = {
  supplier: 'quotationRequests.readiness.supplier',
  route: 'quotationRequests.readiness.route',
  terms: 'quotationRequests.readiness.terms',
  readyDate: 'quotationRequests.readiness.readyDate',
  cargo: 'quotationRequests.readiness.cargo',
  items: 'quotationRequests.readiness.items',
};

export function QuoteReadinessPanel({
  request,
  t,
  totalWeight,
}: {
  request: QuotationRequestV1;
  t: TFn;
  totalWeight: number;
}) {
  const items = rfqReadiness(request, totalWeight);
  const orderedItems = [...items].sort((left, right) => Number(left.ok) - Number(right.ok));
  const missingCount = items.filter((item) => !item.ok).length;
  const hasResponse = rfqResponseQuotations(request.quotations).length > 0;

  return (
    <Paper component="section" withBorder p={0} className="rfq-readiness-panel" aria-labelledby="rfq-readiness-title">
      <div className="rfq-panel-head">
        <Text id="rfq-readiness-title" fw={700}>{t('quotationRequests.quoteReadiness')}</Text>
        {missingCount === 0 ? (
          <Badge color="green" variant="light">{t('quotationRequests.readinessReady')}</Badge>
        ) : (
          <Badge color="orange" variant="light">{t('quotationRequests.readinessMissing', { count: missingCount })}</Badge>
        )}
      </div>
      <div className="rfq-readiness">
        {orderedItems.map((item) => (
          <div className="rfq-readiness-row" data-ok={item.ok} key={item.key}>
            {item.ok ? (
              <IconCircleCheck size={16} className="rfq-readiness-icon" />
            ) : (
              <IconAlertTriangle size={16} className="rfq-readiness-icon" />
            )}
            <Text size="sm">{t(READINESS_LABEL_KEY[item.key])}</Text>
          </div>
        ))}
        {!hasResponse ? (
          <div className="rfq-readiness-row rfq-readiness-note" data-ok={false}>
            <IconAlertTriangle size={16} className="rfq-readiness-icon" />
            <Text size="sm" c="dimmed">{t('quotationRequests.readinessNoResponse')}</Text>
          </div>
        ) : null}
      </div>
    </Paper>
  );
}
