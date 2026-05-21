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

export function ContainerPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [containerType, setContainerType] = useState('40HC');
  const [containerNumber, setContainerNumber] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createContainer(orderNumber, {
        containerNumber: containerNumber.trim(),
        containerType: containerType.trim(),
        sealNumber: cleanString(sealNumber),
        vehicleNumber: cleanString(vehicleNumber),
        vehicleType: cleanString(vehicleType),
      }),
    onSuccess: async () => {
      setContainerNumber('');
      setSealNumber('');
      setVehicleType('');
      setVehicleNumber('');
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={700}>{t('efms.containerTitle')}</Text>
          {mutation.isError ? (
            <Alert color="red" icon={<IconX size={16} />}>
              {getApiErrorMessage(mutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.containerType')} value={containerType} onChange={(event) => setContainerType(event.currentTarget.value)} />
            <TextInput label={t('efms.containerNumber')} value={containerNumber} onChange={(event) => setContainerNumber(event.currentTarget.value)} />
            <TextInput label={t('efms.sealNumber')} value={sealNumber} onChange={(event) => setSealNumber(event.currentTarget.value)} />
            <TextInput label={t('efms.vehicleType')} value={vehicleType} onChange={(event) => setVehicleType(event.currentTarget.value)} />
            <TextInput label={t('efms.vehicleNumber')} value={vehicleNumber} onChange={(event) => setVehicleNumber(event.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              leftSection={<IconPlus size={16} />}
              loading={mutation.isPending}
              disabled={!containerType.trim() || !containerNumber.trim()}
              onClick={() => mutation.mutate()}
            >
              {t('efms.createContainer')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={760} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.containerNumber')}</Table.Th>
              <Table.Th>{t('efms.containerType')}</Table.Th>
              <Table.Th>{t('efms.sealNumber')}</Table.Th>
              <Table.Th>{t('efms.vehicleNumber')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.containers.map((container) => (
              <Table.Tr key={container.id}>
                <Table.Td>{container.containerNumber}</Table.Td>
                <Table.Td>{container.containerType}</Table.Td>
                <Table.Td>{container.sealNumber ?? '-'}</Table.Td>
                <Table.Td>{container.vehicleNumber ?? '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.containers.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noContainers')}</Text> : null}
      </Paper>
    </Stack>
  );
}
