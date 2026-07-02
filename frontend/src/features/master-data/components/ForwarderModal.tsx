import { Alert, Button, Group, Modal, Select, SimpleGrid, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  createForwarder,
  fetchForwarders,
  updateForwarder,
  type Forwarder,
  type ForwarderPayload,
} from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { FORWARDER_TYPE_VALUES, optionalString } from '../model/masterDataModel';

type ForwarderFormValues = {
  code: string;
  name: string;
  type: string | null;
  country: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  isPrimary: boolean;
  note: string;
};

const emptyValues: ForwarderFormValues = {
  code: '',
  name: '',
  type: null,
  country: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  isPrimary: false,
  note: '',
};

export function ForwarderModal({
  editing,
  onClose,
  opened,
}: {
  editing: Forwarder | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ForwarderFormValues>({ initialValues: emptyValues });
  const forwarderTypeOptions = FORWARDER_TYPE_VALUES.map((value) => ({ label: value, value }));

  useEffect(() => {
    if (!opened) return;

    if (!editing) {
      form.setValues(emptyValues);
      return;
    }

    form.setValues({
      code: editing.forwarder_code,
      name: editing.forwarder_name,
      type: editing.forwarder_type,
      country: editing.country ?? '',
      contactPerson: editing.contact_person ?? '',
      contactEmail: editing.contact_email ?? '',
      contactPhone: editing.contact_phone ?? '',
      isPrimary: editing.is_primary,
      note: editing.note ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const forwardersQuery = useQuery({
    enabled: opened,
    queryKey: queryKeys.forwarders({ page: 1, limit: 100 }),
    queryFn: () => fetchForwarders({ page: 1, limit: 100 }),
  });

  const otherPrimaryForwarders = (forwardersQuery.data?.data ?? []).filter(
    (forwarder) => forwarder.is_primary && forwarder.id !== editing?.id,
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: ForwarderPayload & {
        forwarder_code: string;
        forwarder_name: string;
        forwarder_type: string;
      } = {
        forwarder_code: form.values.code.trim().toUpperCase(),
        forwarder_name: form.values.name.trim(),
        forwarder_type: form.values.type ?? '',
        country: optionalString(form.values.country),
        contact_person: form.values.contactPerson.trim(),
        contact_email: optionalString(form.values.contactEmail),
        contact_phone: optionalString(form.values.contactPhone),
        is_primary: form.values.isPrimary,
        note: optionalString(form.values.note),
      };

      if (form.values.isPrimary) {
        await Promise.all(
          otherPrimaryForwarders.map((forwarder) => updateForwarder(forwarder.id, { is_primary: false })),
        );
      }

      return editing ? updateForwarder(editing.id, payload) : createForwarder(payload);
    },
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: queryKeys.forwarderLists });
    },
  });

  const handleSave = () => {
    if (
      !form.values.code.trim() ||
      !form.values.name.trim() ||
      !form.values.type ||
      !form.values.contactPerson.trim() ||
      !form.values.contactEmail.trim()
    ) {
      return;
    }

    mutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={editing ? t('masterData.editForwarder') : t('masterData.createForwarder')}
    >
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        {form.values.isPrimary && otherPrimaryForwarders.length > 0 ? (
          <Alert color="blue" icon={<IconAlertCircle size={18} />}>
            {t('masterData.forwarderPrimaryNotice')}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.forwarderCode')} required {...form.getInputProps('code')} />
          <TextInput label={t('masterData.forwarderName')} required {...form.getInputProps('name')} />
          <Select
            label={t('masterData.forwarderType')}
            data={forwarderTypeOptions}
            searchable
            required
            {...form.getInputProps('type')}
          />
          <TextInput label={t('masterData.country')} {...form.getInputProps('country')} />
          <TextInput label={t('masterData.contactPerson')} required {...form.getInputProps('contactPerson')} />
          <TextInput label={t('masterData.contactEmail')} required {...form.getInputProps('contactEmail')} />
          <TextInput label={t('masterData.contactPhone')} {...form.getInputProps('contactPhone')} />
          <Switch label={t('masterData.isPrimary')} mt="xl" {...form.getInputProps('isPrimary', { type: 'checkbox' })} />
        </SimpleGrid>
        <Textarea label={t('masterData.note')} autosize minRows={3} {...form.getInputProps('note')} />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={!form.values.code.trim() || !form.values.name.trim() || !form.values.type || !form.values.contactPerson.trim() || !form.values.contactEmail.trim()}
          >
            {t('common.save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
