import { Alert, Select, SimpleGrid, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createCarrier, updateCarrier, type Carrier, type CarrierPayload } from '@shared/api/forwarders';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { CARRIER_TYPE_VALUES, optionalString } from '../model/masterDataModel';
import { MasterDataFormActions, MasterDataFormModal, MasterDataFormSection } from './MasterDataFormModal';

type CarrierFormValues = {
  code: string;
  name: string;
  type: string | null;
  scacIataCode: string;
  serviceRouteNote: string;
  contactBooking: string;
  contactEmail: string;
  note: string;
};

const emptyValues: CarrierFormValues = {
  code: '',
  name: '',
  type: null,
  scacIataCode: '',
  serviceRouteNote: '',
  contactBooking: '',
  contactEmail: '',
  note: '',
};

export function CarrierModal({
  editing,
  onClose,
  opened,
}: {
  editing: Carrier | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<CarrierFormValues>({ initialValues: emptyValues });
  const carrierTypeOptions = CARRIER_TYPE_VALUES.map((value) => ({ label: value, value }));

  useEffect(() => {
    if (!opened) return;

    if (!editing) {
      form.setValues(emptyValues);
      return;
    }

    form.setValues({
      code: editing.carrier_code,
      name: editing.carrier_name,
      type: editing.carrier_type,
      scacIataCode: editing.scac_iata_code ?? '',
      serviceRouteNote: editing.service_route_note ?? '',
      contactBooking: editing.contact_booking ?? '',
      contactEmail: editing.contact_email ?? '',
      note: editing.note ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CarrierPayload & {
        carrier_code: string;
        carrier_name: string;
        carrier_type: string;
      } = {
        carrier_code: form.values.code.trim().toUpperCase(),
        carrier_name: form.values.name.trim(),
        carrier_type: form.values.type ?? '',
        scac_iata_code: optionalString(form.values.scacIataCode),
        service_route_note: optionalString(form.values.serviceRouteNote),
        contact_booking: optionalString(form.values.contactBooking),
        contact_email: optionalString(form.values.contactEmail),
        note: optionalString(form.values.note),
      };

      return editing ? updateCarrier(editing.id, payload) : createCarrier(payload);
    },
    onSuccess: () => {
      onClose();
      void queryClient.invalidateQueries({ queryKey: queryKeys.carrierLists });
    },
  });

  const handleSave = () => {
    if (!form.values.code.trim() || !form.values.name.trim() || !form.values.type) return;
    mutation.mutate();
  };

  return (
    <MasterDataFormModal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={editing ? t('masterData.editCarrier') : t('masterData.createCarrier')}
      footer={(
        <MasterDataFormActions
          onCancel={onClose}
          onSave={handleSave}
          loading={mutation.isPending}
          disabled={!form.values.code.trim() || !form.values.name.trim() || !form.values.type}
        />
      )}
    >
      {mutation.isError ? (
        <Alert color="red" icon={<IconAlertCircle size={18} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <MasterDataFormSection>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('masterData.carrierCode')} required {...form.getInputProps('code')} />
          <TextInput label={t('masterData.carrierName')} required {...form.getInputProps('name')} />
          <Select
            label={t('masterData.carrierType')}
            data={carrierTypeOptions}
            searchable
            required
            {...form.getInputProps('type')}
          />
          <TextInput label={t('masterData.scacIataCode')} {...form.getInputProps('scacIataCode')} />
          <TextInput label={t('masterData.serviceRouteNote')} {...form.getInputProps('serviceRouteNote')} />
          <TextInput label={t('masterData.contactBooking')} {...form.getInputProps('contactBooking')} />
          <TextInput label={t('masterData.contactEmail')} {...form.getInputProps('contactEmail')} />
        </SimpleGrid>
      </MasterDataFormSection>
      <MasterDataFormSection>
        <Textarea label={t('masterData.note')} autosize minRows={3} {...form.getInputProps('note')} />
      </MasterDataFormSection>
    </MasterDataFormModal>
  );
}
