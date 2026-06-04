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

export function FinancePanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const [chargeType, setChargeType] = useState<FinanceChargeType>('SELLING');
  const [chargeCode, setChargeCode] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
  const selectedCharge = control.charges.find((charge) => charge.id === selectedChargeId) ?? null;
  const [editChargeCode, setEditChargeCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [advanceHbl, setAdvanceHbl] = useState<string | null>(null);
  const [advanceRole, setAdvanceRole] = useState<TaskRole>('Port Officer');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceCurrency, setAdvanceCurrency] = useState('VND');
  const [advancePurpose, setAdvancePurpose] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

  useEffect(() => {
    setEditChargeCode(selectedCharge?.chargeCode ?? '');
    setEditDescription(selectedCharge?.description ?? '');
    setEditAmount(toNumberInputValue(selectedCharge?.amount));
    setEditCurrency(selectedCharge?.currency ?? 'USD');
  }, [selectedCharge]);

  const refreshFinance = async () => {
    await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCharge(orderNumber, {
        amount: amount === '' ? 0 : Number(amount),
        chargeCode: chargeCode.trim(),
        chargeType,
        currency: currency.trim().toUpperCase(),
        description: description.trim(),
      }),
    onSuccess: async () => {
      setChargeCode('');
      setDescription('');
      setAmount('');
      await refreshFinance();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCharge(selectedChargeId ?? '', {
        amount: editAmount === '' ? undefined : Number(editAmount),
        chargeCode: editChargeCode.trim(),
        currency: editCurrency.trim().toUpperCase(),
        description: editDescription.trim(),
      }),
    onSuccess: async () => {
      await refreshFinance();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCharge(selectedChargeId ?? ''),
    onSuccess: async () => {
      setSelectedChargeId(null);
      await refreshFinance();
    },
  });

  const noteMutation = useMutation({
    mutationFn: (nextChargeType: FinanceChargeType) => issueFinanceNote(orderNumber, { chargeType: nextChargeType }),
    onSuccess: refreshFinance,
  });

  const sendToAccountingMutation = useMutation({
    mutationFn: (noteId: string) => sendFinanceNoteToAccounting(noteId),
    onSuccess: refreshFinance,
  });

  const createAdvanceMutation = useMutation({
    mutationFn: () =>
      createAdvanceSettlement(orderNumber, {
        amount: advanceAmount === '' ? 0 : Number(advanceAmount),
        assignedRole: advanceRole,
        currency: advanceCurrency.trim().toUpperCase(),
        hblNumber: advanceHbl,
        notes: cleanString(advanceNotes),
        purpose: advancePurpose.trim(),
      }),
    onSuccess: async () => {
      setAdvanceHbl(null);
      setAdvanceAmount('');
      setAdvancePurpose('');
      setAdvanceNotes('');
      await refreshFinance();
    },
  });

  const updateAdvanceMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: AdvanceSettlementStatus }) =>
      updateAdvanceSettlementStatus(id, { status: nextStatus }),
    onSuccess: refreshFinance,
  });

  const editableChargeOptions = control.charges
    .filter((charge) => charge.chargeType !== 'SELLING' && !charge.isLocked && !charge.invoicedNoteId)
    .map((charge) => ({
      label: `${charge.chargeCode} - ${formatMoney(charge.amount, charge.currency)}`,
      value: charge.id,
    }));
  const hblOptions = control.houseBills.map((bill) => ({ label: bill.hblNumber, value: bill.hblNumber }));

  return (
    <Stack gap="md">
      {(createMutation.isError ||
        updateMutation.isError ||
        deleteMutation.isError ||
        noteMutation.isError ||
        sendToAccountingMutation.isError ||
        createAdvanceMutation.isError ||
        updateAdvanceMutation.isError) ? (
        <Alert color="red" icon={<IconX size={16} />}>
          {getApiErrorMessage(
            createMutation.error ??
              updateMutation.error ??
              deleteMutation.error ??
              noteMutation.error ??
              sendToAccountingMutation.error ??
              createAdvanceMutation.error ??
              updateAdvanceMutation.error,
          )}
        </Alert>
      ) : null}

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={700}>{t('efms.financeTitle')}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label={t('efms.chargeType')}
              data={chargeTypeOptions}
              value={chargeType}
              onChange={(value) => setChargeType((value ?? 'SELLING') as FinanceChargeType)}
            />
            <TextInput label={t('efms.chargeCode')} value={chargeCode} onChange={(event) => setChargeCode(event.currentTarget.value)} />
            <TextInput label={t('efms.description')} value={description} onChange={(event) => setDescription(event.currentTarget.value)} />
            <NumberInput label={t('efms.amount')} min={0.01} value={amount} onChange={(value) => setAmount(value === '' ? '' : Number(value))} />
            <TextInput label={t('efms.currency')} value={currency} onChange={(event) => setCurrency(event.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              leftSection={<IconPlus size={16} />}
              loading={createMutation.isPending}
              disabled={!chargeCode.trim() || !description.trim() || amount === '' || !currency.trim()}
              onClick={() => createMutation.mutate()}
            >
              {t('efms.createCharge')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Select
            label={t('efms.selectCharge')}
            data={editableChargeOptions}
            value={selectedChargeId}
            onChange={setSelectedChargeId}
            searchable
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.chargeCode')} value={editChargeCode} onChange={(event) => setEditChargeCode(event.currentTarget.value)} disabled={!selectedCharge} />
            <TextInput label={t('efms.description')} value={editDescription} onChange={(event) => setEditDescription(event.currentTarget.value)} disabled={!selectedCharge} />
            <NumberInput label={t('efms.amount')} min={0.01} value={editAmount} onChange={(value) => setEditAmount(value === '' ? '' : Number(value))} disabled={!selectedCharge} />
            <TextInput label={t('efms.currency')} value={editCurrency} onChange={(event) => setEditCurrency(event.currentTarget.value)} disabled={!selectedCharge} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              color="red"
              variant="light"
              loading={deleteMutation.isPending}
              disabled={!selectedCharge}
              onClick={() => deleteMutation.mutate()}
            >
              {t('efms.deleteCharge')}
            </Button>
            <Button
              variant="light"
              loading={updateMutation.isPending}
              disabled={!selectedCharge || !editChargeCode.trim() || !editDescription.trim() || editAmount === '' || !editCurrency.trim()}
              onClick={() => updateMutation.mutate()}
            >
              {t('efms.updateCharge')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Group gap="xs">
        <Button variant="light" loading={noteMutation.isPending} onClick={() => noteMutation.mutate('SELLING')}>
          {t('efms.issueSellingNote')}
        </Button>
        <Button variant="light" loading={noteMutation.isPending} onClick={() => noteMutation.mutate('BUYING')}>
          {t('efms.issueBuyingNote')}
        </Button>
        <Button variant="light" loading={noteMutation.isPending} onClick={() => noteMutation.mutate('OBH')}>
          {t('efms.issueObhNote')}
        </Button>
      </Group>

      <Paper withBorder p={0}>
        <Table miw={860} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.chargeCode')}</Table.Th>
              <Table.Th>{t('efms.chargeType')}</Table.Th>
              <Table.Th>{t('efms.description')}</Table.Th>
              <Table.Th>{t('efms.amount')}</Table.Th>
              <Table.Th>{t('efms.locked')}</Table.Th>
              <Table.Th>{t('efms.invoiced')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.charges.map((charge) => (
              <Table.Tr key={charge.id}>
                <Table.Td>{charge.chargeCode}</Table.Td>
                <Table.Td><Badge variant="light">{charge.chargeType}</Badge></Table.Td>
                <Table.Td>{charge.description}</Table.Td>
                <Table.Td>{formatMoney(charge.amount, charge.currency)}</Table.Td>
                <Table.Td>{charge.isLocked ? t('common.yes') : t('common.no')}</Table.Td>
                <Table.Td>{charge.invoicedAt ? formatDateTime(charge.invoicedAt) : '-'}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.charges.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noCharges')}</Text> : null}
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={760} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.noteNumber')}</Table.Th>
              <Table.Th>{t('efms.noteType')}</Table.Th>
              <Table.Th>{t('efms.accountingCode')}</Table.Th>
              <Table.Th>{t('common.status')}</Table.Th>
              <Table.Th>{t('common.deadline')}</Table.Th>
              <Table.Th>SLA</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.financeNotes.map((note) => (
              <Table.Tr key={note.id}>
                <Table.Td>{note.noteNumber}</Table.Td>
                <Table.Td>{note.noteType}</Table.Td>
                <Table.Td>{note.accountingCode}</Table.Td>
                <Table.Td>{statusLabel(note.status)}</Table.Td>
                <Table.Td>{note.slaDueAt ? formatDateTime(note.slaDueAt) : '-'}</Table.Td>
                <Table.Td><StatusBadge status={note.slaStatus} /></Table.Td>
                <Table.Td>
                  <Button
                    size="compact-xs"
                    variant="light"
                    disabled={Boolean(note.sentToAccountingAt)}
                    loading={sendToAccountingMutation.isPending}
                    onClick={() => sendToAccountingMutation.mutate(note.id)}
                  >
                    {t('efms.sendToAcc')}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.financeNotes.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noNotes')}</Text> : null}
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={700}>{t('efms.advanceSettlementTitle')}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label={t('efms.hblNumber')} data={hblOptions} value={advanceHbl} onChange={setAdvanceHbl} searchable clearable />
            <Select
              label={t('common.role')}
              data={advanceRoleOptions}
              value={advanceRole}
              onChange={(value) => setAdvanceRole((value ?? 'Port Officer') as TaskRole)}
            />
            <NumberInput label={t('efms.amount')} min={0.01} value={advanceAmount} onChange={(value) => setAdvanceAmount(value === '' ? '' : Number(value))} />
            <TextInput label={t('efms.currency')} value={advanceCurrency} onChange={(event) => setAdvanceCurrency(event.currentTarget.value)} />
            <TextInput label={t('efms.advancePurpose')} value={advancePurpose} onChange={(event) => setAdvancePurpose(event.currentTarget.value)} />
            <TextInput label={t('efms.notes')} value={advanceNotes} onChange={(event) => setAdvanceNotes(event.currentTarget.value)} />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              loading={createAdvanceMutation.isPending}
              disabled={advanceAmount === '' || !advanceCurrency.trim() || !advancePurpose.trim()}
              onClick={() => createAdvanceMutation.mutate()}
            >
              {t('efms.createAdvanceSettlement')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={900} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.settlementNumber')}</Table.Th>
              <Table.Th>{t('efms.hblNumber')}</Table.Th>
              <Table.Th>{t('common.role')}</Table.Th>
              <Table.Th>{t('efms.amount')}</Table.Th>
              <Table.Th>{t('common.status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.advanceSettlements.map((settlement) => (
              <Table.Tr key={settlement.id}>
                <Table.Td>{settlement.settlementNumber}</Table.Td>
                <Table.Td>{settlement.hblNumber ?? '-'}</Table.Td>
                <Table.Td>{settlement.assignedRole}</Table.Td>
                <Table.Td>{formatMoney(settlement.amount, settlement.currency)}</Table.Td>
                <Table.Td><StatusBadge status={settlement.status} /></Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap">
                    <Button
                      size="compact-xs"
                      variant="light"
                      disabled={settlement.status !== 'REQUESTED'}
                      loading={updateAdvanceMutation.isPending}
                      onClick={() => updateAdvanceMutation.mutate({ id: settlement.id, status: 'APPROVED' })}
                    >
                      {t('efms.approveAdvance')}
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="red"
                      disabled={settlement.status !== 'REQUESTED'}
                      loading={updateAdvanceMutation.isPending}
                      onClick={() => updateAdvanceMutation.mutate({ id: settlement.id, status: 'REJECTED' })}
                    >
                      {t('efms.rejectAdvance')}
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      disabled={settlement.status !== 'APPROVED'}
                      loading={updateAdvanceMutation.isPending}
                      onClick={() => updateAdvanceMutation.mutate({ id: settlement.id, status: 'SETTLED' })}
                    >
                      {t('efms.settleAdvance')}
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.advanceSettlements.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noAdvanceSettlements')}</Text> : null}
      </Paper>
    </Stack>
  );
}
