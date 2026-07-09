import { Badge, Button, Group, Paper, Text, Title } from '@mantine/core';
import { IconCopy, IconFileInvoice } from '@tabler/icons-react';

import { buildRfqRouteLabel, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { BackActionButton } from '@shared/components/BackActionButton';
import { CopyValue } from '@shared/components/CopyValue';

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
    <Paper component="section" withBorder p={0} className="rfq-detail-hero feature-detail-hero" aria-labelledby="rfq-detail-title">
      <div className="rfq-detail-hero-main">
        <div className="feature-hero-nav">
          <BackActionButton label={t('common.backToList')} onClick={onBack} />
        </div>
        <Group justify="space-between" align="flex-start" gap="md" className="rfq-detail-hero-inner">
          <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-detail-title-row">
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
              <Text c="dimmed" size="sm" className="rfq-detail-reference">
                {request.customer_po_ref ?? request.customer_ref ?? '-'}
              </Text>
              <Text fw={700} size="md" mt={6} className="rfq-detail-route">
                {buildRfqRouteLabel(request)}
              </Text>
              <div className="rfq-picker-chips rfq-detail-tags">
                {request.mode ? <span className="rfq-picker-chip">{request.mode}</span> : null}
                {request.incoterm_code ? <span className="rfq-picker-chip">{request.incoterm_code}</span> : null}
              </div>
            </div>
          </Group>

          <Group gap="xs" className="rfq-detail-hero-actions" wrap="wrap">
            <Button variant="light" leftSection={<IconCopy size={16} />} onClick={onCopy}>
              {t('quotationRequests.copy')}
            </Button>
          </Group>
        </Group>
      </div>
    </Paper>
  );
}
