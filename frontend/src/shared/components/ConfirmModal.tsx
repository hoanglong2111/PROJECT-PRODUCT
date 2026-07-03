import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';

export function ConfirmModal({
  opened,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = 'teal',
  loading,
  onConfirm,
  onCancel,
}: {
  opened: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'teal' | 'red';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      size="sm"
      title={<ModalTitle feature="master-data" title={title} />}
      centered
      classNames={{
        body: 'md-form-modal-body',
        close: 'md-form-modal-close',
        content: 'md-form-modal',
        header: 'md-form-modal-header',
        title: 'md-form-modal-title',
      }}
    >
      <div className="md-form-modal-shell">
        <div className="md-form-modal-scroll" style={{ paddingBlock: 'var(--mantine-spacing-md)' }}>
          <Stack gap="sm" className="md-form-modal-content">
            {typeof message === 'string' ? (
              <Text size="sm">{message}</Text>
            ) : (
              message
            )}
          </Stack>
        </div>
        <div className="md-form-modal-footer">
          <Group justify="flex-end" gap="xs" wrap="nowrap" className="md-form-actions">
            <Button variant="subtle" color="gray" leftSection={<IconX size={16} />} onClick={onCancel} disabled={loading}>
              {cancelLabel ?? t('common.cancel')}
            </Button>
            <Button
              color={confirmColor}
              leftSection={<IconCheck size={16} />}
              onClick={onConfirm}
              loading={loading}
            >
              {confirmLabel ?? t('common.confirm')}
            </Button>
          </Group>
        </div>
      </div>
    </Modal>
  );
}
