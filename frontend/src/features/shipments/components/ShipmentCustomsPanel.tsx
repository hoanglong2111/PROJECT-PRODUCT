import {
  Alert,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertTriangle, IconPlus, IconShield, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  cancelCustomsDeclaration,
  clearCustomsDeclaration,
  createCustomsDeclarationFromShipment,
  fetchCustomsDeclaration,
  fetchCustomsDeclarationLines,
  fetchCustomsDeclarationsByShipment,
  openCustomsDraft,
  openCustomsOfficial,
  updateCustomsDeclaration,
  type CustomsDeclarationChannelV1,
  type CustomsDeclarationTypeV1,
} from '@shared/api/customsDeclarations';
import type { ShipmentRecord } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';

import { CustomsLifecycleHeader } from './CustomsLifecycleHeader';
import { CustomsLinesTable } from './CustomsLinesTable';
import { CustomsNextActionCard } from './CustomsNextActionCard';

export function ShipmentCustomsPanel({ shipment }: { shipment: ShipmentRecord }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedDeclarationId, setSelectedDeclarationId] = useState<string | null>(null);
  const [newCustomsType, setNewCustomsType] = useState<CustomsDeclarationTypeV1>('IMPORT');
  const [newCustomsChannel, setNewCustomsChannel] = useState<CustomsDeclarationChannelV1 | null>(null);
  const [newBrokerId, setNewBrokerId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [declarationNo, setDeclarationNo] = useState('');
  const [customsType, setCustomsType] = useState<CustomsDeclarationTypeV1>('IMPORT');
  const [customsChannel, setCustomsChannel] = useState<CustomsDeclarationChannelV1 | null>(null);
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState('');
  const [headerNote, setHeaderNote] = useState('');
  const [officialNo, setOfficialNo] = useState('');
  const [officialChannel, setOfficialChannel] = useState<CustomsDeclarationChannelV1>('YELLOW');
  const [clearNote, setClearNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelModalOpen, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);

  const declarationListQuery = useQuery({
    queryKey: queryKeys.customsDeclarationsByShipment(shipment.id),
    queryFn: () => fetchCustomsDeclarationsByShipment(shipment.id),
  });
  const declarations = declarationListQuery.data ?? [];

  useEffect(() => {
    if (selectedDeclarationId && declarations.some((item) => item.id === selectedDeclarationId)) return;
    setSelectedDeclarationId(declarations[0]?.id ?? null);
  }, [declarations, selectedDeclarationId]);

  const declarationSummary = declarations.find((item) => item.id === selectedDeclarationId) ?? null;
  const declarationDetailQuery = useQuery({
    enabled: Boolean(selectedDeclarationId),
    queryKey: selectedDeclarationId
      ? queryKeys.customsDeclarationDetail(selectedDeclarationId)
      : queryKeys.customsDeclarationDetail('idle'),
    queryFn: () => fetchCustomsDeclaration(selectedDeclarationId ?? ''),
  });
  const declaration = declarationDetailQuery.data ?? declarationSummary;
  const declarationId = declaration?.id ?? null;
  const declarationLinesQuery = useQuery({
    enabled: Boolean(declarationId),
    queryKey: declarationId ? queryKeys.customsDeclarationLines(declarationId) : queryKeys.customsDeclarationLines('idle'),
    queryFn: () => fetchCustomsDeclarationLines(declarationId ?? ''),
  });
  const lines = declarationLinesQuery.data ?? declaration?.lines ?? [];
  const brokersQuery = useQuery({
    queryKey: queryKeys.suppliers({ page: 1, limit: 100 }),
    queryFn: () => fetchSuppliers({ page: 1, limit: 100 }),
  });

  useEffect(() => {
    if (!declaration) return;
    setDeclarationNo(declaration.declaration_no ?? '');
    setCustomsType(declaration.customs_type);
    setCustomsChannel(declaration.customs_channel);
    setBrokerId(declaration.broker_id);
    setSubmittedAt(declaration.submitted_at?.slice(0, 16) ?? '');
    setHeaderNote(declaration.note ?? '');
    setOfficialNo(declaration.declaration_no ?? '');
    setOfficialChannel(declaration.customs_channel ?? 'YELLOW');
  }, [declaration]);

  const refreshCustoms = (id = declarationId) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationsByShipment(shipment.id) });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationDetail(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customsDeclarationLines(id) });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentLists });
  };

  const createDeclarationMutation = useMutation({
    mutationFn: () =>
      createCustomsDeclarationFromShipment(shipment.id, {
        broker_id: newBrokerId,
        customs_channel: newCustomsChannel,
        customs_type: newCustomsType,
        note: newNote || null,
      }),
    onSuccess: (created) => {
      setSelectedDeclarationId(created.id);
      setNewBrokerId(null);
      setNewCustomsChannel(null);
      setNewCustomsType('IMPORT');
      setNewNote('');
      refreshCustoms(created.id);
    },
  });

  const updateDeclarationMutation = useMutation({
    mutationFn: () =>
      updateCustomsDeclaration(declarationId ?? '', {
        broker_id: brokerId,
        customs_channel: customsChannel,
        customs_type: customsType,
        declaration_no: declarationNo || null,
        note: headerNote || null,
        submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
      }),
    onSuccess: (updated) => refreshCustoms(updated.id),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: 'open-draft' | 'open-official' | 'clear' | 'cancel') => {
      if (!declarationId) throw new Error(t('shipments.selectDeclarationFirst'));
      if (action === 'open-draft') {
        return openCustomsDraft(declarationId, { opened_at: new Date().toISOString() });
      }
      if (action === 'open-official') {
        return openCustomsOfficial(declarationId, {
          customs_channel: officialChannel,
          declaration_no: officialNo,
          opened_at: new Date().toISOString(),
        });
      }
      if (action === 'clear') {
        return clearCustomsDeclaration(declarationId, {
          cleared_at: new Date().toISOString(),
          note: clearNote || null,
        });
      }
      return cancelCustomsDeclaration(declarationId, {
        cancel_reason: cancelReason,
        note: cancelReason,
      });
    },
    onSuccess: (updated) => {
      setCancelReason('');
      setClearNote('');
      closeCancelModal();
      refreshCustoms(updated.id);
    },
  });

  const typeOptions: Array<{ label: string; value: CustomsDeclarationTypeV1 }> = [
    { label: t('shipments.customsTypeImport'), value: 'IMPORT' },
    { label: t('shipments.customsTypeTemporaryImport'), value: 'TEMP_IMPORT' },
    { label: t('shipments.customsTypeReimport'), value: 'RE_IMPORT' },
    { label: t('shipments.customsTypeOther'), value: 'OTHER' },
  ];
  const channelOptions: Array<{ label: string; value: CustomsDeclarationChannelV1 }> = [
    { label: t('shipments.channelGreen'), value: 'GREEN' },
    { label: t('shipments.channelYellow'), value: 'YELLOW' },
    { label: t('shipments.channelRed'), value: 'RED' },
  ];
  const brokerOptions = (brokersQuery.data?.data ?? []).map((broker) => ({
    label: `${broker.supplier_code} - ${broker.supplier_name}`,
    value: broker.id,
  }));
  const isLocked = declaration?.status === 'CLEARED' || declaration?.status === 'CANCELLED';

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconShield size={18} />}>
        {t('shipments.customsDeclarationInfo')}
      </Alert>

      {/* Declaration selector / create */}
      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={700}>{t('shipments.customsDeclarations')}</Text>
              <Text size="sm" c="dimmed">
                {t('shipments.customsDeclarationsHint')}
              </Text>
            </div>
            {declarations.length > 0 ? (
              <Select
                label={t('shipments.activeDeclaration')}
                data={declarations.map((item) => ({
                  label: item.declaration_no ?? `${item.customs_type} - ${item.status}`,
                  value: item.id,
                }))}
                value={selectedDeclarationId}
                onChange={setSelectedDeclarationId}
                w={{ base: '100%', sm: 280 }}
              />
            ) : null}
          </Group>

          {declarationListQuery.isLoading ? (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">{t('shipments.loadingCustomsDeclarations')}</Text>
            </Group>
          ) : declarations.length === 0 ? (
            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <Select
                label={t('shipments.customsType')}
                data={typeOptions}
                value={newCustomsType}
                onChange={(value) => setNewCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
              />
              <Select
                label={t('shipments.channelLabel')}
                clearable
                data={channelOptions}
                value={newCustomsChannel}
                onChange={(value) => setNewCustomsChannel(value as CustomsDeclarationChannelV1 | null)}
              />
              <Select
                label={t('shipments.broker')}
                clearable
                searchable
                data={brokerOptions}
                value={newBrokerId}
                onChange={setNewBrokerId}
                nothingFoundMessage={brokersQuery.isLoading ? t('shipments.loadingBrokers') : t('shipments.noSupplierFound')}
              />
              <TextInput
                label={t('shipments.note')}
                placeholder={t('shipments.customsDraftPlaceholder')}
                value={newNote}
                onChange={(event) => setNewNote(event.currentTarget.value)}
              />
              <Group align="flex-end">
                <Button
                  leftSection={<IconPlus size={16} />}
                  loading={createDeclarationMutation.isPending}
                  onClick={() => createDeclarationMutation.mutate()}
                >
                  {t('shipments.createCustomsDeclaration')}
                </Button>
              </Group>
            </SimpleGrid>
          ) : null}
        </Stack>
      </Paper>

      {declaration ? (
        <>
          {/* 1. Lifecycle header with stepper */}
          <CustomsLifecycleHeader declaration={declaration} />

          {/* 2. Next-action card */}
          <CustomsNextActionCard
            declaration={declaration}
            officialNo={officialNo}
            setOfficialNo={(v) => {
              setOfficialNo(v);
              setDeclarationNo(v);
            }}
            officialChannel={officialChannel}
            setOfficialChannel={(v) => {
              setOfficialChannel(v);
              setCustomsChannel(v);
            }}
            clearNote={clearNote}
            setClearNote={setClearNote}
            channelOptions={channelOptions}
            actionMutation={actionMutation}
          />

          {/* 3. Lines table (primary) + declaration details side panel */}
          <Flex gap="md" align="stretch" direction={{ base: 'column', lg: 'row' }}>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <CustomsLinesTable
                declarationId={declarationId}
                shipmentId={shipment.id}
                isLocked={isLocked}
                lines={lines}
                isFetchingLines={declarationLinesQuery.isFetching}
                onChanged={() => refreshCustoms()}
              />
            </Box>

            <Box w={{ base: '100%', lg: 360 }} style={{ flexShrink: 0 }}>
              <Paper withBorder p="md" h="100%">
                <Stack gap="sm">
                  <Text fw={700} size="sm">{t('shipments.customsDetails')}</Text>
                  <TextInput
                    label={t('shipments.declarationNo')}
                    value={declarationNo}
                    disabled={isLocked}
                    onChange={(event) => {
                      setDeclarationNo(event.currentTarget.value);
                      setOfficialNo(event.currentTarget.value);
                    }}
                  />
                  <Select
                    label={t('shipments.customsType')}
                    data={typeOptions}
                    value={customsType}
                    disabled={isLocked}
                    onChange={(value) => setCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
                  />
                  <Select
                    label={t('shipments.channelLabel')}
                    clearable
                    data={channelOptions}
                    value={customsChannel}
                    disabled={isLocked}
                    onChange={(value) => {
                      setCustomsChannel(value as CustomsDeclarationChannelV1 | null);
                      if (value) setOfficialChannel(value as CustomsDeclarationChannelV1);
                    }}
                  />
                  <Select
                    label={t('shipments.broker')}
                    clearable
                    searchable
                    data={brokerOptions}
                    value={brokerId}
                    disabled={isLocked}
                    onChange={setBrokerId}
                  />
                  <TextInput
                    label={t('shipments.submittedAt')}
                    type="datetime-local"
                    value={submittedAt}
                    disabled={isLocked}
                    onChange={(event) => setSubmittedAt(event.currentTarget.value)}
                  />
                  <TextInput
                    label={t('shipments.headerNote')}
                    value={headerNote}
                    disabled={isLocked}
                    onChange={(event) => setHeaderNote(event.currentTarget.value)}
                  />

                  <Group justify="flex-end" gap="xs" mt="xs">
                    <Button
                      variant="light"
                      disabled={isLocked}
                      loading={updateDeclarationMutation.isPending}
                      onClick={() => updateDeclarationMutation.mutate()}
                    >
                      {t('shipments.saveDeclaration')}
                    </Button>
                    <Button
                      color="red"
                      variant="light"
                      disabled={isLocked}
                      onClick={openCancelModal}
                    >
                      {t('shipments.cancelDeclaration')}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Box>
          </Flex>

          {/* Cancel confirmation modal */}
          <Modal
            opened={cancelModalOpen}
            onClose={closeCancelModal}
            title={
              <ModalTitle
                feature="shipments"
                icon={<IconAlertTriangle size={18} stroke={1.8} />}
                title={t('shipments.confirmCancelTitle')}
                subtitle={shipment.shipment_number}
              />
            }
            centered
          >
            <Stack gap="md">
              <Text size="sm">{t('shipments.confirmCancelBody')}</Text>
              <TextInput
                label={t('shipments.cancelReason')}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.currentTarget.value)}
                data-autofocus
              />
              <Group justify="flex-end" gap="xs">
                <Button variant="default" onClick={closeCancelModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  color="red"
                  disabled={!cancelReason}
                  loading={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('cancel')}
                >
                  {t('shipments.confirmCancelAction')}
                </Button>
              </Group>
            </Stack>
          </Modal>
        </>
      ) : null}

      {declarationListQuery.isError ? (
        <Alert color="red" icon={<IconX size={18} />}>
          {(declarationListQuery.error as Error).message}
        </Alert>
      ) : null}
    </Stack>
  );
}
