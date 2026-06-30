import { Alert, Button, Group, Modal, SimpleGrid, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@shared/api/queryKeys';
import { createUom, updateUom, type Uom } from '@shared/api/uoms';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalString } from '../model/masterDataModel';

type UomFormValues = {
  code: string;
  nameEn: string;
  nameVn: string;
  description: string;
  isActive: boolean;
};

const emptyValues: UomFormValues = {
  code: '',
  nameEn: '',
  nameVn: '',
  description: '',
  isActive: true,
};

export function UomModal({
  editing,
  onClose,
  opened,
}: {
  editing: Uom | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<UomFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
          code: editing.uom_code,
          nameEn: editing.uom_name_en,
          nameVn: editing.uom_name_vn ?? '',
          description: editing.description ?? '',
          isActive: editing.is_active,
        }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        uom_code: form.values.code.trim().toUpperCase(),
        uom_name_en: form.values.nameEn.trim(),
        uom_name_vn: form.values.nameVn.trim(),
        description: optionalString(form.values.description),
        is_active: form.values.isActive,
      };
      return editing ? updateUom(editing.id, payload) : createUom(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.uomLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.masterDataOptionLists }),
      ]);
    },
  });

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.nameEn.trim()) return;
    mutation.mutate();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={editing ? t('masterData.editUom') : t('masterData.createUom')}>
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.uomCode')} required {...form.getInputProps('code')} />
          <TextInput label={t('masterData.uomNameEn')} required {...form.getInputProps('nameEn')} />
          <TextInput label={t('masterData.uomNameVn')} {...form.getInputProps('nameVn')} />
        </SimpleGrid>
        <Textarea label={t('masterData.description')} autosize minRows={3} {...form.getInputProps('description')} />
        <Switch label={t('masterData.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={!form.values.code.trim() || !form.values.nameEn.trim()}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
