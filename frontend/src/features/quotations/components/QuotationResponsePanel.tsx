import { Button, Collapse, Paper, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { IconCheck, IconEdit, IconSend, IconShoppingCart, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { QuotationStatusV1, QuotationV1 } from '@shared/api/quotations';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

type QuotationResponsePanelProps = {
  quotation: QuotationV1;
  selectedOptionId?: string | null;
  isLatestKnownVersion: boolean;
  versionsQueryIsSuccess: boolean;
  transitionLoading?: boolean;
  rejectLoading?: boolean;
  onRevise?: (q: QuotationV1) => void;
  onTransition: (next: 'submit' | 'confirm') => void;
  onReject: (reason?: string) => void;
  onEnterAdjust: () => void;
};

function negotiationRound(quotation: QuotationV1): number {
  return (quotation.adjustments ?? []).reduce((max, row) => Math.max(max, Number(row.round_no || 0)), 0);
}

export function QuotationResponsePanel({
  quotation,
  selectedOptionId,
  isLatestKnownVersion,
  versionsQueryIsSuccess,
  transitionLoading,
  rejectLoading,
  onRevise,
  onTransition,
  onReject,
  onEnterAdjust,
}: QuotationResponsePanelProps) {
  const { t, statusLabel } = useI18n();
  const navigate = useNavigate();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectExpanded, setRejectExpanded] = useState(false);
  const status = quotation.status;
  const canReject = status === 'PENDING_APPROVAL';
  const canAdjust = status === 'PENDING_APPROVAL' || status === 'PENDING_ADJUSTMENT';
  const finalLifecycleStatus: QuotationStatusV1 = status === 'REJECTED' ? 'REJECTED' : 'CONFIRMED';
  const lifecycleSteps: QuotationStatusV1[] = [
    'DRAFT',
    'PENDING_APPROVAL',
    finalLifecycleStatus,
  ];
  const activeLifecycleIndex = Math.max(
    0,
    status === 'REJECTED'
      ? lifecycleSteps.length - 1
      : status === 'PENDING_ADJUSTMENT'
        ? lifecycleSteps.findIndex((step) => step === 'PENDING_APPROVAL')
        : lifecycleSteps.findIndex((step) => step === status),
  );
  const roundNo = negotiationRound(quotation);
  const turnLabel = status === 'PENDING_ADJUSTMENT' ? t('quotations.negotiationTurnFds') : t('quotations.negotiationTurnKbi');
  const showTurnLabel = status === 'PENDING_APPROVAL' || status === 'PENDING_ADJUSTMENT';

  return (
    <Paper withBorder p={0} className="rfq-action-panel">
      <div className="rfq-panel-head">
        <div>
          <Text fw={700}>{t('quotations.responseTitle')}</Text>
          <Text size="xs" c="dimmed">
            {statusLabel(status)}
          </Text>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rfq-lifecycle-steps" aria-label={t('quotations.lifecycle')}>
        {lifecycleSteps.map((step, index) => {
          const stepState =
            index < activeLifecycleIndex ? 'done' : index === activeLifecycleIndex ? 'active' : 'future';
          const showNegotiationHint = step === 'PENDING_APPROVAL' && status === 'PENDING_ADJUSTMENT';

          return (
            <div className="rfq-lifecycle-step" data-state={stepState} key={`${step}-${index}`}>
              <span className="rfq-lifecycle-dot" aria-hidden="true" />
              <div className="rfq-lifecycle-copy">
                <Text size="xs" fw={700}>
                  {statusLabel(step)}
                </Text>
                {showNegotiationHint ? (
                  <Text size="xs" c="dimmed">
                    {turnLabel}{roundNo > 0 ? ` - ${t('quotations.negotiationRound', { round: roundNo })}` : ''}
                  </Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {showTurnLabel ? (
        <div className="rfq-turn-banner">
          <Text size="sm" fw={700}>
            {turnLabel}
          </Text>
        </div>
      ) : null}

      <div className="rfq-action-body">
        {status === 'CONFIRMED' ? (
          <Button
            fullWidth
            leftSection={<IconShoppingCart size={16} />}
            onClick={() => navigate(`/purchase-orders?create=1&fromQuotation=${quotation.id}`)}
          >
            {t('quotations.createPo')}
          </Button>
        ) : status === 'REJECTED' ? (
          <Stack gap="sm">
            {onRevise && (!versionsQueryIsSuccess || isLatestKnownVersion) ? (
              <Button
                fullWidth
                leftSection={<IconEdit size={16} />}
                onClick={() => onRevise(quotation)}
              >
                {t('quotations.actionRevise')}
              </Button>
            ) : null}
            <Text size="xs" c="dimmed">
              {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
            </Text>
          </Stack>
        ) : (
          <Stack gap="sm">
            {status === 'DRAFT' ? (
              <>
                {onRevise ? (
                  <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => onRevise(quotation)}
                  >
                    {t('quotations.actionEditValueAdd')}
                  </Button>
                ) : null}
                <Button
                  fullWidth
                  leftSection={<IconSend size={16} />}
                  loading={transitionLoading}
                  onClick={() => onTransition('submit')}
                >
                  {t('quotations.actionSubmitApproval')}
                </Button>
              </>
            ) : null}
            <div className="rfq-response-choices">
              {status === 'PENDING_APPROVAL' ? (
                <Tooltip label={!selectedOptionId ? t('quotations.confirmNeedsOption') : t('quotations.actionConfirm')}>
                  <div>
                    <Button
                      fullWidth
                      leftSection={<IconCheck size={16} />}
                      loading={transitionLoading}
                      disabled={!selectedOptionId}
                      onClick={() => onTransition('confirm')}
                    >
                      {t('quotations.actionConfirm')}
                    </Button>
                  </div>
                </Tooltip>
              ) : null}
              {canAdjust ? (
                <Button
                  fullWidth
                  variant="light"
                  leftSection={<IconEdit size={16} />}
                  onClick={onEnterAdjust}
                >
                  {t('quotations.actionAdjustLines')}
                </Button>
              ) : null}
            </div>
            {canReject ? (
              <Button
                fullWidth
                color="red"
                variant={rejectExpanded ? 'filled' : 'light'}
                leftSection={<IconX size={16} />}
                onClick={() => setRejectExpanded((current) => !current)}
              >
                {t('quotations.actionReject')}
              </Button>
            ) : null}
            {canReject ? (
              <Collapse expanded={rejectExpanded}>
                <div className="rfq-reject-fields">
                  <Textarea
                    label={t('quotations.rejectReason')}
                    placeholder={t('quotations.rejectReasonPlaceholder')}
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.currentTarget.value)}
                    autosize
                    minRows={2}
                  />
                  <Button
                    fullWidth
                    color="red"
                    variant="light"
                    leftSection={<IconX size={16} />}
                    loading={rejectLoading}
                    onClick={() => onReject(rejectReason.trim() || undefined)}
                    mt="xs"
                  >
                    {t('quotations.actionReject')}
                  </Button>
                </div>
              </Collapse>
            ) : null}
            <Text size="xs" c="dimmed">
              {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
            </Text>
          </Stack>
        )}
      </div>
    </Paper>
  );
}
