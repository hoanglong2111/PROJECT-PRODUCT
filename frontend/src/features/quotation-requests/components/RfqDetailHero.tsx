import { Badge, Button, Group, Paper, Text, Title } from '@mantine/core';
import { IconCopy, IconFileInvoice } from '@tabler/icons-react';

import { buildRfqRouteLabel, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { CopyValue } from '@shared/components/CopyValue';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';

import { rfqStatusColor, type TFn } from '../model/quotationRequestModel';

export function RfqDetailHero({
  request,
  t,
  onBack,
  onCopy,
}: {
  request: QuotationRequestV1;
  t: TFn;
  onBack: () => void;
  onCopy: () => void;
}) {
  return (
    <FeatureHeaderShell backLabel={t('common.backToList')} onBack={onBack}>
      <Paper component="section" withBorder p={0} className="rfq-detail-hero feature-detail-hero" aria-labelledby="rfq-detail-title">
        <div className="rfq-detail-hero-main feature-hero-layout">
          <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-detail-title-row feature-hero-identity">
            <div className="rfq-icon-box feature-hero-icon">
              <IconFileInvoice size={18} />
            </div>
            <div className="rfq-detail-title-copy" style={{ minWidth: 0 }}>
              <Group gap="xs" align="center" className="rfq-detail-heading-row">
                <Title order={2} id="rfq-detail-title">
                  <CopyValue value={request.rfq_no}>{request.rfq_no}</CopyValue>
                </Title>
                <Badge color={rfqStatusColor(request.status)} variant="light">
                  {t(`quotationRequests.status.${request.status}` as never)}
                </Badge>
              </Group>
              <Text c="dimmed" size="xs" mt={3}>
                {t(`quotationRequests.statusHint.${request.status}` as never)}
              </Text>
            </div>
          </Group>

          <dl className="feature-hero-facts">
            <div className="feature-hero-fact">
              <dt>{t('quotationRequests.field.customerRef')}</dt>
              <dd>{request.customer_po_ref ?? request.customer_ref ?? '-'}</dd>
            </div>
            <div className="feature-hero-fact">
              <dt>{t('quotationRequests.field.route')}</dt>
              <dd className="rfq-detail-route">{buildRfqRouteLabel(request)}</dd>
            </div>
            <div className="feature-hero-fact">
              <dt>{t('quotationRequests.field.mode')} / {t('quotationRequests.field.incoterm')}</dt>
              <dd>{[request.mode, request.incoterm_code].filter(Boolean).join(' / ') || '-'}</dd>
            </div>
          </dl>

          <Group gap="xs" className="rfq-detail-hero-actions feature-hero-actions" wrap="wrap">
            <Button variant="light" leftSection={<IconCopy size={16} />} onClick={onCopy}>
              {t('quotationRequests.copy')}
            </Button>
          </Group>
        </div>
      </Paper>
    </FeatureHeaderShell>
  );
}
