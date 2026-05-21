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

export function HouseBillPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [hblNumber, setHblNumber] = useState('');
  const [shipper, setShipper] = useState('');
  const [consignee, setConsignee] = useState('');
  const [placeOfReceipt, setPlaceOfReceipt] = useState('');
  const [placeOfDelivery, setPlaceOfDelivery] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createHouseBill(orderNumber, {
        consignee: consignee.trim(),
        hblNumber: hblNumber.trim(),
        placeOfDelivery: cleanString(placeOfDelivery),
        placeOfReceipt: cleanString(placeOfReceipt),
        assignedTo: cleanString(assignedTo),
        shipper: shipper.trim(),
      }),
    onSuccess: async () => {
      setHblNumber('');
      setShipper('');
      setConsignee('');
      setPlaceOfReceipt('');
      setPlaceOfDelivery('');
      setAssignedTo('');
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={700}>{t('efms.houseBillTitle')}</Text>
          {mutation.isError ? (
            <Alert color="red" icon={<IconX size={16} />}>
              {getApiErrorMessage(mutation.error)}
            </Alert>
          ) : null}
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.hblNumber')} value={hblNumber} onChange={(event) => setHblNumber(event.currentTarget.value)} />
            <TextInput label={t('efms.shipper')} value={shipper} onChange={(event) => setShipper(event.currentTarget.value)} />
            <TextInput label={t('efms.consignee')} value={consignee} onChange={(event) => setConsignee(event.currentTarget.value)} />
            <TextInput label={t('efms.placeOfReceipt')} value={placeOfReceipt} onChange={(event) => setPlaceOfReceipt(event.currentTarget.value)} />
            <TextInput label={t('efms.placeOfDelivery')} value={placeOfDelivery} onChange={(event) => setPlaceOfDelivery(event.currentTarget.value)} />
            <TextInput label={t('efms.assignedTo')} value={assignedTo} onChange={(event) => setAssignedTo(event.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              leftSection={<IconPlus size={16} />}
              loading={mutation.isPending}
              disabled={!hblNumber.trim() || !shipper.trim() || !consignee.trim()}
              onClick={() => mutation.mutate()}
            >
              {t('efms.createHbl')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={760} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.hblNumber')}</Table.Th>
              <Table.Th>{t('efms.shipper')}</Table.Th>
              <Table.Th>{t('efms.consignee')}</Table.Th>
              <Table.Th>{t('efms.assignedTo')}</Table.Th>
              <Table.Th>{t('efms.finalBlConfirmed')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.houseBills.map((bill) => (
              <Table.Tr key={bill.id}>
                <Table.Td>{bill.hblNumber}</Table.Td>
                <Table.Td>{bill.shipper}</Table.Td>
                <Table.Td>{bill.consignee}</Table.Td>
                <Table.Td>{bill.assignedTo ?? '-'}</Table.Td>
                <Table.Td>{bill.finalBlConfirmedAt ? formatDateTime(bill.finalBlConfirmedAt) : '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.houseBills.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noHouseBills')}</Text> : null}
      </Paper>
    </Stack>
  );
}
