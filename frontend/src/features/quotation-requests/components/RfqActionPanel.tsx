import { Badge, Button, Paper, Stack, Text } from '@mantine/core';
import { IconBan, IconCheck, IconExternalLink, IconSend } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import type { QuotationRequestStatusV1, QuotationRequestV1 } from '@shared/api/quotationRequests';
import type { MessageKey } from '@shared/i18n';

import { rfqStatusColor, type TFn } from '../model/quotationRequestModel';

export type PrimaryAction = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled: boolean;
  isTerminal: boolean;
};

export function resolvePrimaryAction({
  status,
  canReceive,
  canCreateQuotation,
  receiveLoading,
  onReceive,
  onCreateQuotation,
  onViewResponses,
  t,
}: {
  status: QuotationRequestStatusV1;
  canReceive: boolean;
  canCreateQuotation: boolean;
  receiveLoading: boolean;
  onReceive: () => void;
  onCreateQuotation: () => void;
  onViewResponses: () => void;
  t: TFn;
}): PrimaryAction {
  if (status === 'SUBMITTED') {
    return {
      label: t('quotationRequests.receive'),
      icon: <IconCheck size={16} />,
      onClick: onReceive,
      loading: receiveLoading,
      disabled: !canReceive,
      isTerminal: false,
    };
  }
  if (status === 'RECEIVED') {
    return {
      label: t('quotationRequests.createQuotation'),
      icon: <IconSend size={16} />,
      onClick: onCreateQuotation,
      disabled: !canCreateQuotation,
      isTerminal: false,
    };
  }
  if (status === 'QUOTED') {
    return {
      label: t('quotationRequests.viewResponses'),
      icon: <IconExternalLink size={16} />,
      onClick: onViewResponses,
      disabled: false,
      isTerminal: false,
    };
  }
  if (status === 'CONFIRMED') {
    return { label: t('quotationRequests.confirmedLabel'), icon: <IconCheck size={16} />, disabled: true, isTerminal: true };
  }
  return { label: t('quotationRequests.cancelledLabel'), icon: <IconBan size={16} />, disabled: true, isTerminal: true };
}

export function QuotationRequestActionPanel({
  request,
  t,
  primaryAction,
  canCancel,
  cancelLoading,
  onCancel,
}: {
  request: QuotationRequestV1;
  t: TFn;
  primaryAction: PrimaryAction;
  canCancel: boolean;
  cancelLoading: boolean;
  onCancel: () => void;
}) {
  const isCancelled = request.status === 'CANCELLED';
  const lifecycleSteps: QuotationRequestStatusV1[] = ['SUBMITTED', 'RECEIVED', 'QUOTED', 'CONFIRMED'];
  const activeIndex = lifecycleSteps.findIndex((step) => step === request.status);

  const hintKey: MessageKey =
    request.status === 'SUBMITTED'
      ? 'quotationRequests.receiveBeforeQuote'
      : request.status === 'RECEIVED'
        ? 'quotationRequests.readyToQuote'
        : request.status === 'QUOTED'
          ? ('quotationRequests.statusHint.QUOTED' as MessageKey)
          : 'quotationRequests.closedRequest';

  return (
    <Paper withBorder p={0} className="rfq-action-panel">
      <div className="rfq-panel-head">
        <Text fw={700}>{t('quotationRequests.nextAction')}</Text>
        <Badge color={rfqStatusColor(request.status)} variant="light">
          {t(`quotationRequests.status.${request.status}` as never)}
        </Badge>
      </div>

      {isCancelled ? (
        <div className="rfq-lifecycle-steps" aria-label={t('quotations.lifecycle')}>
          <div className="rfq-lifecycle-step" data-state="cancelled">
            <span className="rfq-lifecycle-dot" aria-hidden="true" />
            <div className="rfq-lifecycle-copy">
              <Text size="xs" fw={700}>{t('quotationRequests.cancelledLabel')}</Text>
            </div>
          </div>
        </div>
      ) : (
        <div className="rfq-lifecycle-steps" aria-label={t('quotations.lifecycle')}>
          {lifecycleSteps.map((step, index) => {
            const stepState = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'future';
            return (
              <div className="rfq-lifecycle-step" data-state={stepState} key={step}>
                <span className="rfq-lifecycle-dot" aria-hidden="true" />
                <div className="rfq-lifecycle-copy">
                  <Text size="xs" fw={700}>
                    {t(`quotationRequests.status.${step}` as never)}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rfq-action-body">
        <Stack gap="sm">
          <Button
            fullWidth
            leftSection={primaryAction.icon}
            loading={primaryAction.loading}
            disabled={primaryAction.disabled}
            variant={primaryAction.isTerminal ? 'default' : 'filled'}
            onClick={primaryAction.onClick}
          >
            {primaryAction.label}
          </Button>
          <Text size="xs" c="dimmed">{t(hintKey)}</Text>
          <Button
            fullWidth
            color="red"
            variant="light"
            leftSection={<IconBan size={16} />}
            disabled={!canCancel}
            loading={cancelLoading}
            onClick={onCancel}
          >
            {t('quotationRequests.cancel')}
          </Button>
        </Stack>
      </div>
    </Paper>
  );
}
