import { Button, Group, Paper, Select, Stack, Text, Textarea, TextInput, ThemeIcon } from '@mantine/core';
import {
  IconBuildingStore,
  IconCar,
  IconCheck,
  IconClipboardCheck,
  IconId,
  IconPhone,
  IconRoute,
  IconTruck,
  IconUser,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { DateTimeField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

import type { FormState } from '../model/domesticTransportOrderModel';

type DtoDispatchFormProps = {
  form: FormState;
  isClosed: boolean;
  onChange: (form: FormState) => void;
  onSave: () => void;
  saving: boolean;
  truckVendorOptions: Array<{ label: string; value: string }>;
};

export function DtoDispatchForm({ form, isClosed, onChange, onSave, saving, truckVendorOptions }: DtoDispatchFormProps) {
  const { t } = useI18n();

  return (
    <Paper p="sm" className="dto-form-panel dto-form-panel-flat">
      <Stack gap="sm">
        <Group justify="space-between" className="dto-form-header">
          <div>
            <Text fw={700}>{t('domesticTransportOrders.dispatchAndPodData')}</Text>
            <Text size="sm" c="dimmed">{t('domesticTransportOrders.dispatchAndPodDescription')}</Text>
          </div>
          <Group gap="xs" className="dto-form-actions">
            <Button leftSection={<IconCheck size={16} />} loading={saving} disabled={isClosed} onClick={onSave}>
              {t('common.save')}
            </Button>
          </Group>
        </Group>
        <div className="dto-form-workspace">
          <section className="dto-form-section dto-transport-driver-section is-wide">
            <SectionTitle icon={<IconTruck size={16} />} label={t('domesticTransportOrders.transportAndDriver')} />
            <div className="dto-transport-driver-grid">
              <div className="dto-form-subsection">
                <Text className="dto-form-subsection-title" size="xs" fw={700}>
                  {t('domesticTransportOrders.vehicleInfo')}
                </Text>
                <div className="dto-form-grid dto-form-grid-transport">
                  <Select
                    className="dto-form-field-primary"
                    label={t('domesticTransportOrders.truckVendor')}
                    searchable
                    clearable
                    data={truckVendorOptions}
                    value={form.truckVendorId}
                    disabled={isClosed}
                    onChange={(value) => onChange({ ...form, truckVendorId: value })}
                    leftSection={<IconBuildingStore size={16} />}
                  />
                  <TextInput
                    label={t('domesticTransportOrders.vehiclePlate')}
                    value={form.vehiclePlate}
                    disabled={isClosed}
                    onChange={(event) => onChange({ ...form, vehiclePlate: event.currentTarget.value })}
                    leftSection={<IconCar size={16} />}
                  />
                  <TextInput
                    label={t('domesticTransportOrders.vehicleType')}
                    value={form.vehicleType}
                    disabled={isClosed}
                    onChange={(event) => onChange({ ...form, vehicleType: event.currentTarget.value })}
                  />
                </div>
              </div>

              <div className="dto-form-subsection">
                <Text className="dto-form-subsection-title" size="xs" fw={700}>
                  {t('domesticTransportOrders.driver')}
                </Text>
                <div className="dto-form-grid dto-form-grid-driver">
                  <TextInput
                    className="dto-form-field-primary"
                    label={t('domesticTransportOrders.driver')}
                    value={form.driverName}
                    disabled={isClosed}
                    onChange={(event) => onChange({ ...form, driverName: event.currentTarget.value })}
                    leftSection={<IconUser size={16} />}
                  />
                  <TextInput
                    label={t('domesticTransportOrders.driverPhone')}
                    value={form.driverPhone}
                    disabled={isClosed}
                    onChange={(event) => onChange({ ...form, driverPhone: event.currentTarget.value })}
                    leftSection={<IconPhone size={16} />}
                  />
                  <TextInput
                    label={t('domesticTransportOrders.driverIdentityNo')}
                    value={form.driverIdentityNo}
                    disabled={isClosed}
                    onChange={(event) => onChange({ ...form, driverIdentityNo: event.currentTarget.value })}
                    leftSection={<IconId size={16} />}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="dto-form-section">
            <SectionTitle icon={<IconRoute size={16} />} label={t('domesticTransportOrders.routeSchedule')} />
            <div className="dto-form-grid dto-form-grid-route-places">
              <TextInput label={t('domesticTransportOrders.origin')} value={form.origin} disabled={isClosed} onChange={(event) => onChange({ ...form, origin: event.currentTarget.value })} />
              <TextInput label={<HeaderLabel label={t('domesticTransportOrders.warehouse')} hint={t('glossary.warehouse')} />} value={form.warehouse} disabled={isClosed} onChange={(event) => onChange({ ...form, warehouse: event.currentTarget.value })} />
              <TextInput label={t('domesticTransportOrders.destination')} value={form.destination} disabled={isClosed} onChange={(event) => onChange({ ...form, destination: event.currentTarget.value })} />
            </div>
            <div className="dto-time-matrix">
              <div className="dto-time-matrix-corner" />
              <Text className="dto-time-matrix-heading" size="xs" fw={700}>{t('domesticTransportOrders.planned')}</Text>
              <Text className="dto-time-matrix-heading dto-time-matrix-actual" size="xs" fw={700}>{t('domesticTransportOrders.actual')}</Text>
              <Text className="dto-time-matrix-axis" size="xs" fw={700}>{t('domesticTransportOrders.pickup')}</Text>
              <DateTimeField label={t('domesticTransportOrders.scheduledPickup')} value={form.scheduledPickupAt} disabled={isClosed} onChange={(value) => onChange({ ...form, scheduledPickupAt: value })} />
              <DateTimeField className="dto-time-matrix-actual" label={t('domesticTransportOrders.actualPickup')} value={form.actualPickupAt} disabled={isClosed} onChange={(value) => onChange({ ...form, actualPickupAt: value })} />
              <Text className="dto-time-matrix-axis" size="xs" fw={700}>{t('domesticTransportOrders.delivery')}</Text>
              <DateTimeField label={t('domesticTransportOrders.scheduledDelivery')} value={form.scheduledDeliveryAt} disabled={isClosed} onChange={(value) => onChange({ ...form, scheduledDeliveryAt: value })} />
              <DateTimeField className="dto-time-matrix-actual" label={t('domesticTransportOrders.actualDelivery')} value={form.actualDeliveryAt} disabled={isClosed} onChange={(value) => onChange({ ...form, actualDeliveryAt: value })} />
            </div>
          </section>

          <section className="dto-form-section">
            <SectionTitle icon={<IconClipboardCheck size={16} />} label={t('domesticTransportOrders.podAndQuote')} />
            <div className="dto-form-grid dto-form-grid-pod">
              <TextInput className="dto-form-field-primary" label={t('domesticTransportOrders.podDocument')} value={form.podDocumentRef} disabled={isClosed} onChange={(event) => onChange({ ...form, podDocumentRef: event.currentTarget.value })} />
              <TextInput label={t('domesticTransportOrders.quoteAmount')} type="number" value={form.quoteAmount} disabled={isClosed} onChange={(event) => onChange({ ...form, quoteAmount: event.currentTarget.value })} />
              <Select label={t('domesticTransportOrders.quoteCurrency')} data={[{ label: 'VND', value: 'VND' }, { label: 'USD', value: 'USD' }]} value={form.quoteCurrency || null} disabled={isClosed} clearable onChange={(value) => onChange({ ...form, quoteCurrency: value ?? '' })} />
              <Textarea className="dto-form-field-primary dto-form-note-field" label={t('common.notes')} minRows={3} value={form.note} disabled={isClosed} onChange={(event) => onChange({ ...form, note: event.currentTarget.value })} />
            </div>
          </section>
        </div>
      </Stack>
    </Paper>
  );
}

function SectionTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Group gap="xs" mb="sm" wrap="nowrap" className="dto-form-section-title">
      <ThemeIcon size="sm" radius="md" variant="light">
        {icon}
      </ThemeIcon>
      <Text fw={800}>{label}</Text>
    </Group>
  );
}
