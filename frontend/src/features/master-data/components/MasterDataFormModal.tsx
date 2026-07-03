import { Button, Group, Modal, Stack, type ModalProps } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';

export function MasterDataFormModal({
  children,
  footer,
  onClose,
  opened,
  size = 'lg',
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  opened: boolean;
  size?: ModalProps['size'];
  title: ReactNode;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size={size}
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
        <div className="md-form-modal-scroll">
          <Stack gap="md" className="md-form-modal-content">
            {children}
          </Stack>
        </div>
        {footer ? <div className="md-form-modal-footer">{footer}</div> : null}
      </div>
    </Modal>
  );
}

export function MasterDataFormSection({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`md-form-section${compact ? ' is-compact' : ''}`}>
      {children}
    </section>
  );
}

export function MasterDataFormActions({
  cancelLabel,
  disabled,
  loading,
  onCancel,
  onSave,
  saveLabel,
  showSave = true,
}: {
  cancelLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  showSave?: boolean;
}) {
  const { t } = useI18n();

  return (
    <Group justify="flex-end" gap="xs" wrap="nowrap" className="md-form-actions">
      <Button variant="subtle" color="gray" leftSection={<IconX size={16} />} onClick={onCancel}>
        {cancelLabel ?? t('common.cancel')}
      </Button>
      {showSave && onSave ? (
        <Button leftSection={<IconCheck size={16} />} onClick={onSave} loading={loading} disabled={disabled}>
          {saveLabel ?? t('common.save')}
        </Button>
      ) : null}
    </Group>
  );
}
