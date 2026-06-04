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

export function CustomsPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const customs = control.customs;
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [channel, setChannel] = useState<CustomsChannel | null>('GREEN');
  const [status, setStatus] = useState<CustomsStatus>('DRAFT');
  const [laneStatus, setLaneStatus] = useState<CustomsLaneStatus | null>('GREEN_CLEARANCE');
  const [telexReleased, setTelexReleased] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setDeclarationNumber(customs?.declarationNumber ?? '');
    setChannel(customs?.channel ?? 'GREEN');
    setStatus(customs?.status ?? 'DRAFT');
    setLaneStatus(customs?.laneStatus ?? 'GREEN_CLEARANCE');
    setTelexReleased(customs?.telexReleased ?? false);
    setNotes(customs?.notes ?? '');
  }, [customs]);

  const mutation = useMutation({
    mutationFn: () =>
      updateCustoms(orderNumber, {
        channel,
        declarationNumber: cleanString(declarationNumber),
        laneStatus,
        notes: cleanString(notes),
        status,
        telexReleased,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  return (
    <Stack gap="md">
      {mutation.isError ? (
        <Alert color="red" icon={<IconX size={16} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Text fw={700}>{t('efms.customsTitle')}</Text>
            <Text size="sm" c="dimmed">
              {customs ? statusLabel(customs.status) : t('efms.noCustoms')}
            </Text>
            {customs?.nextAction ? (
              <Text size="xs" c="dimmed" mt={4}>
                {t('efms.nextCustomsAction')}: {customs.nextAction}
              </Text>
            ) : null}
          </div>
          <Group gap="xs">
            {customs?.laneStatus ? <StatusBadge status={customs.laneStatus} /> : null}
            <Badge color={customs?.canDispatch ? 'teal' : 'orange'} variant="light">
              {customs?.canDispatch ? t('efms.canDispatch') : t('efms.cannotDispatch')}
            </Badge>
          </Group>
        </Group>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.declarationNumber')} value={declarationNumber} onChange={(event) => setDeclarationNumber(event.currentTarget.value)} />
            <Select
              label={t('efms.channel')}
              data={customsChannelOptions}
              value={channel}
              onChange={(value) => setChannel((value as CustomsChannel | null) ?? null)}
            />
            <Select
              label={t('efms.customsStatus')}
              data={customsStatusOptions}
              value={status}
              onChange={(value) => setStatus((value ?? 'DRAFT') as CustomsStatus)}
            />
            <Select
              label={t('efms.laneStatus')}
              data={customsLaneStatusOptions}
              value={laneStatus}
              onChange={(value) => setLaneStatus((value as CustomsLaneStatus | null) ?? null)}
            />
            <Switch label={t('efms.telexReleased')} checked={telexReleased} onChange={(event) => setTelexReleased(event.currentTarget.checked)} />
          </SimpleGrid>
          <Textarea label={t('efms.notes')} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button leftSection={<IconCheck size={16} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {t('efms.saveCustoms')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}
