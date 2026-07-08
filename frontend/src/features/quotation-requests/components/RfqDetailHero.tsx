import { Badge, Button, Group, Paper, Text, Title } from '@mantine/core';
import { IconCopy, IconFileInvoice } from '@tabler/icons-react';

import { buildRfqRouteLabel, type QuotationRequestV1 } from '@shared/api/quotationRequests';
import { CopyValue } from '@shared/components/CopyValue';

import { rfqStatusColor, type TFn } from '../model/quotationRequestModel';

export function RfqDetailHero({
  request,
  t,
  onCopy,
}: {
  request: QuotationRequestV1;
  t: TFn;
  onCopy: () => void;
}) {
  const lineCount = request.lines?.length ?? 0;

  return (
    <Paper withBorder p={0} className="rfq-detail-hero">
      <div className="rfq-detail-hero-main">
        <Group justify="space-between" align="flex-start" gap="md" className="rfq-detail-hero-inner">
          <Group gap="sm" align="flex-start" wrap="nowrap" className="rfq-detail-title-row">
            <div className="rfq-icon-box">
              <IconFileInvoice size={18} />
            </div>
            <div className="rfq-detail-title-copy" style={{ minWidth: 0 }}>
              <Group gap="xs" align="center" className="rfq-detail-heading-row">
                <Title order={3}>
                  <CopyValue value={request.rfq_no}>{request.rfq_no}</CopyValue>
                </Title>
                <Badge color={rfqStatusColor(request.status)} variant="light">
                  {t(`quotationRequests.status.${request.status}` as never)}
                </Badge>
              </Group>
              <Text c="dimmed" size="xs" mt={3}>
                {t(`quotationRequests.statusHint.${request.status}` as never)}
              </Text>
              <Text c="dimmed" size="sm">{request.customer_po_ref ?? request.customer_ref ?? '-'}</Text>
              <Text fw={700} size="md" mt={6} className="rfq-detail-route">
                {buildRfqRouteLabel(request)}
              </Text>
              <div className="rfq-picker-chips" style={{ marginTop: '0.5rem' }}>
                {request.mode ? <span className="rfq-picker-chip">{request.mode}</span> : null}
                {request.incoterm_code ? <span className="rfq-picker-chip">{request.incoterm_code}</span> : null}
                {request.gross_weight_kg != null ? (
                  <span className="rfq-picker-chip tabular-nums">{request.gross_weight_kg} kg</span>
                ) : null}
                {request.volume_cbm != null ? (
                  <span className="rfq-picker-chip tabular-nums">{request.volume_cbm} cbm</span>
                ) : null}
                {lineCount > 0 ? (
                  <span className="rfq-picker-chip tabular-nums">{lineCount} {t('quotationRequests.field.lines').toLowerCase()}</span>
                ) : null}
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
