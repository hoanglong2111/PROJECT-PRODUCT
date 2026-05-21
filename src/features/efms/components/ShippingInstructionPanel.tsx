import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconCheck, IconExternalLink, IconFileUpload, IconPlus, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@shared/api/http';
import {
  confirmDocumentCrossCheck,
  confirmFinalBl,
  createAdvanceSettlement,
  createCharge,
  createContainer,
  createDocumentReview,
  createHouseBill,
  deleteCharge,
  issueFinanceNote,
  sendFinanceNoteToAccounting,
  syncDriveDossier,
  updateAdvanceSettlementStatus,
  updateCharge,
  updateCustoms,
  updateShippingInstruction,
  uploadDeliveryOrderAttachment,
  type AdvanceSettlementStatus,
  type CustomsChannel,
  type CustomsLaneStatus,
  type CustomsStatus,
  type DeliveryOrder,
  type EfmsControl,
  type FinanceChargeType,
  type LogisticsAttachment,
  type MblType,
  type TaskRole,
} from '@shared/api/logistics';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import {
  advanceRoleOptions,
  chargeTypeOptions,
  customsChannelOptions,
  customsLaneStatusOptions,
  customsStatusOptions,
  documentTypeOptions,
  mblTypeOptions,
} from '../constants';
import {
  cleanString,
  formatBytes,
  formatDateTime,
  formatMoney,
  formatOptionalNumber,
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
  toNumberInputValue,
} from '../formatters';
import { Info } from './Info';

export function ShippingInstructionPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const transport = control.transport;
  const [bookingNumber, setBookingNumber] = useState('');
  const [mblNumber, setMblNumber] = useState('');
  const [mblType, setMblType] = useState<MblType | null>('ORIGINAL');
  const [manifestNumber, setManifestNumber] = useState('');
  const [shippingLine, setShippingLine] = useState('');
  const [vesselCode, setVesselCode] = useState('');
  const [grossWeight, setGrossWeight] = useState<number | ''>('');
  const [cbm, setCbm] = useState<number | ''>('');
  const [actualDepartureAt, setActualDepartureAt] = useState('');
  const [actualArrivalAt, setActualArrivalAt] = useState('');

  useEffect(() => {
    setBookingNumber(transport?.bookingNumber ?? '');
    setMblNumber(transport?.mblNumber ?? '');
    setMblType(transport?.mblType ?? 'ORIGINAL');
    setManifestNumber(transport?.manifestNumber ?? '');
    setShippingLine(transport?.shippingLine ?? '');
    setVesselCode(transport?.vesselCode ?? '');
    setGrossWeight(toNumberInputValue(transport?.grossWeight));
    setCbm(toNumberInputValue(transport?.cbm));
    setActualDepartureAt(toDateTimeLocalInput(transport?.actualDepartureAt));
    setActualArrivalAt(toDateTimeLocalInput(transport?.actualArrivalAt));
  }, [transport]);

  const mutation = useMutation({
    mutationFn: () =>
      updateShippingInstruction(orderNumber, {
        bookingNumber: cleanString(bookingNumber),
        cbm: cbm === '' ? null : Number(cbm),
        grossWeight: grossWeight === '' ? null : Number(grossWeight),
        manifestNumber: cleanString(manifestNumber),
        mblNumber: cleanString(mblNumber),
        mblType,
        shippingLine: cleanString(shippingLine),
        vesselCode: cleanString(vesselCode),
        actualDepartureAt: fromDateTimeLocalInput(actualDepartureAt),
        actualArrivalAt: fromDateTimeLocalInput(actualArrivalAt),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  if (!transport) {
    return <Alert color="yellow">{t('efms.transportEmpty')}</Alert>;
  }

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconX size={16} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('efms.bookingNumber')} value={bookingNumber} onChange={(event) => setBookingNumber(event.currentTarget.value)} />
          <TextInput label={t('efms.mblNumber')} value={mblNumber} onChange={(event) => setMblNumber(event.currentTarget.value)} />
          <Select
            label={t('efms.mblType')}
            data={mblTypeOptions}
            value={mblType}
            onChange={(value) => setMblType((value as MblType | null) ?? 'ORIGINAL')}
          />
          <TextInput label={t('efms.manifestNumber')} value={manifestNumber} onChange={(event) => setManifestNumber(event.currentTarget.value)} />
          <TextInput label={t('efms.shippingLine')} value={shippingLine} onChange={(event) => setShippingLine(event.currentTarget.value)} />
          <TextInput label={t('efms.vesselCode')} value={vesselCode} onChange={(event) => setVesselCode(event.currentTarget.value)} />
          <TextInput label={t('efms.actualDeparture')} type="datetime-local" value={actualDepartureAt} onChange={(event) => setActualDepartureAt(event.currentTarget.value)} />
          <TextInput label={t('efms.actualArrival')} type="datetime-local" value={actualArrivalAt} onChange={(event) => setActualArrivalAt(event.currentTarget.value)} />
          <NumberInput label={t('efms.grossWeight')} min={0.01} value={grossWeight} onChange={(value) => setGrossWeight(value === '' ? '' : Number(value))} />
          <NumberInput label={t('efms.cbm')} min={0.01} value={cbm} onChange={(value) => setCbm(value === '' ? '' : Number(value))} />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button leftSection={<IconCheck size={16} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {t('efms.saveSi')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
