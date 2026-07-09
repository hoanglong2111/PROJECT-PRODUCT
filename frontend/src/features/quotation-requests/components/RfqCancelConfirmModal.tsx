import { Alert, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { ConfirmModal } from '@shared/components/ConfirmModal';

import type { TFn } from '../model/quotationRequestModel';

export function RfqCancelConfirmModal({
  opened,
  rfqNo,
  error,
  loading,
  t,
  onConfirm,
  onCancel,
}: {
  opened: boolean;
  rfqNo: string;
  error?: string;
  loading: boolean;
  t: TFn;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmModal
      opened={opened}
      title={t('quotationRequests.cancelConfirmTitle')}
      message={
        <>
          <Text size="sm">
            {t('quotationRequests.cancelConfirmMessage', { rfqNo })}
          </Text>
          {error ? (
            <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.actionError')}>
              {error}
            </Alert>
          ) : null}
        </>
      }
      confirmLabel={t('quotationRequests.cancel')}
      confirmColor="red"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

