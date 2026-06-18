import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconShield, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  cancelCustomsDeclaration,
  clearCustomsDeclaration,
  createCustomsDeclarationFromShipment,
  createCustomsDeclarationLine,
  deleteCustomsDeclarationLine,
  fetchCustomsDeclaration,
  fetchCustomsDeclarationLines,
  fetchCustomsDeclarationsByShipment,
  openCustomsDraft,
  openCustomsOfficial,
  updateCustomsDeclaration,
  updateCustomsDeclarationLine,
  type CustomsDeclarationChannelV1,
  type CustomsDeclarationLineV1,
  type CustomsDeclarationTypeV1,
  type CreateCustomsDeclarationLinePayload,
} from '@shared/api/customsDeclarations';
import type { ShipmentRecord } from '@shared/api/logistics';
import { fetchShipmentLines } from '@shared/api/shipments';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { StatusBadge } from '@shared/components/StatusBadge';

import { channelColor } from '../model/shipmentModel';
import { CustomsLinesTable } from './CustomsLinesTable';

export function ShipmentCustomsPanel({ shipment }: { shipment: ShipmentRecord }) {
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
  const [newShipmentLineId, setNewShipmentLineId] = useState<string | null>(null);
  const [newLineNo, setNewLineNo] = useState('');
  const [newLineQuantity, setNewLineQuantity] = useState('');
  const [newLineCustomsValue, setNewLineCustomsValue] = useState('');
  const [newLineNote, setNewLineNote] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineQuantity, setLineQuantity] = useState('');
  const [lineCustomsValue, setLineCustomsValue] = useState('');
  const [lineDutyRate, setLineDutyRate] = useState('');
  const [lineVatRate, setLineVatRate] = useState('');
  const [lineNote, setLineNote] = useState('');

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
  const shipmentLinesQuery = useQuery({
    queryKey: queryKeys.shipmentLines(shipment.id),
    queryFn: () => fetchShipmentLines(shipment.id),
  });
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

  useEffect(() => {
    if (lines.length === 0 && !newLineNo) {
      setNewLineNo('1');
      return;
    }
    if (!newLineNo) {
      setNewLineNo(String(Math.max(...lines.map((line) => line.line_no), 0) + 1));
    }
  }, [lines, newLineNo]);

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
      if (!declarationId) throw new Error('Select a declaration first');
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
      refreshCustoms(updated.id);
    },
  });

  const createLineMutation = useMutation({
    mutationFn: () => {
      if (!declarationId) throw new Error('Select a declaration first');
      const payload: CreateCustomsDeclarationLinePayload = {
        customs_value: newLineCustomsValue ? Number(newLineCustomsValue) : null,
        line_no: Number(newLineNo),
        note: newLineNote || null,
        quantity: newLineQuantity ? Number(newLineQuantity) : undefined,
        shipment_line_id: newShipmentLineId,
      };
      return createCustomsDeclarationLine(declarationId, payload);
    },
    onSuccess: () => {
      setNewShipmentLineId(null);
      setNewLineCustomsValue('');
      setNewLineQuantity('');
      setNewLineNote('');
      setNewLineNo(String(Math.max(...lines.map((line) => line.line_no), 0) + 2));
      refreshCustoms();
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: () =>
      updateCustomsDeclarationLine(editingLineId ?? '', {
        customs_value: lineCustomsValue ? Number(lineCustomsValue) : null,
        import_duty_rate: lineDutyRate ? Number(lineDutyRate) : null,
        note: lineNote || null,
        quantity: lineQuantity ? Number(lineQuantity) : undefined,
        vat_rate: lineVatRate ? Number(lineVatRate) : null,
      }),
    onSuccess: () => {
      setEditingLineId(null);
      refreshCustoms();
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => deleteCustomsDeclarationLine(lineId),
    onSuccess: () => refreshCustoms(),
  });

  const typeOptions: Array<{ label: string; value: CustomsDeclarationTypeV1 }> = [
    { label: 'Import', value: 'IMPORT' },
    { label: 'Temporary import', value: 'TEMP_IMPORT' },
    { label: 'Re-import', value: 'RE_IMPORT' },
    { label: 'Other', value: 'OTHER' },
  ];
  const channelOptions: Array<{ label: string; value: CustomsDeclarationChannelV1 }> = [
    { label: 'Green', value: 'GREEN' },
    { label: 'Yellow', value: 'YELLOW' },
    { label: 'Red', value: 'RED' },
  ];
  const brokerOptions = (brokersQuery.data?.data ?? []).map((broker) => ({
    label: `${broker.supplier_code} - ${broker.supplier_name}`,
    value: broker.id,
  }));
  const shipmentLineOptions = (shipmentLinesQuery.data ?? []).map((line) => ({
    label: [
      line.item_description ?? line.item_id ?? line.id,
      `${Number(line.qty).toLocaleString()} ${line.unit ?? ''}`.trim(),
    ].join(' - '),
    value: line.id,
  }));
  const isLocked = declaration?.status === 'CLEARED' || declaration?.status === 'CANCELLED';
  const startEditingLine = (line: CustomsDeclarationLineV1) => {
    setEditingLineId(line.id);
    setLineQuantity(String(line.quantity ?? ''));
    setLineCustomsValue(String(line.customs_value ?? ''));
    setLineDutyRate(String(line.import_duty_rate ?? ''));
    setLineVatRate(String(line.vat_rate ?? ''));
    setLineNote(line.note ?? '');
  };

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconShield size={18} />}>
        Customs declaration is created from active shipment lines and drives shipment status to CUSTOMS_DRAFT.
      </Alert>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={700}>Customs declarations</Text>
              <Text size="sm" c="dimmed">
                Create one declaration per shipment, then open draft/official and clear customs.
              </Text>
            </div>
            {declarations.length > 0 ? (
              <Select
                label="Active declaration"
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
              <Text size="sm" c="dimmed">Loading customs declarations...</Text>
            </Group>
          ) : declarations.length === 0 ? (
            <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
              <Select
                label="Customs type"
                data={typeOptions}
                value={newCustomsType}
                onChange={(value) => setNewCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
              />
              <Select
                label="Channel"
                clearable
                data={channelOptions}
                value={newCustomsChannel}
                onChange={(value) => setNewCustomsChannel(value as CustomsDeclarationChannelV1 | null)}
              />
              <Select
                label="Broker"
                clearable
                searchable
                data={brokerOptions}
                value={newBrokerId}
                onChange={setNewBrokerId}
                nothingFoundMessage={brokersQuery.isLoading ? 'Loading brokers...' : 'No supplier found'}
              />
              <TextInput
                label="Note"
                placeholder="Create draft customs declaration"
                value={newNote}
                onChange={(event) => setNewNote(event.currentTarget.value)}
              />
              <Group align="flex-end">
                <Button
                  leftSection={<IconPlus size={16} />}
                  loading={createDeclarationMutation.isPending}
                  onClick={() => createDeclarationMutation.mutate()}
                >
                  Create declaration
                </Button>
              </Group>
            </SimpleGrid>
          ) : null}
        </Stack>
      </Paper>

      {declaration ? (
        <>
          <Paper withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Group gap="xs">
                    <Text fw={700}>{declaration.declaration_no ?? 'Draft declaration'}</Text>
                    <StatusBadge status={declaration.status} />
                    {declaration.customs_channel ? (
                      <Badge color={channelColor(declaration.customs_channel)}>{declaration.customs_channel}</Badge>
                    ) : null}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {declaration.broker?.supplier_name ?? 'No broker'} · {declaration.note ?? 'No note'}
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    disabled={isLocked || declaration.status !== 'DRAFT'}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('open-draft')}
                  >
                    Open draft
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    disabled={isLocked || !officialNo || !['DRAFT', 'DRAFT_OPENED'].includes(declaration.status)}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('open-official')}
                  >
                    Open official
                  </Button>
                  <Button
                    size="xs"
                    color="teal"
                    disabled={!['OFFICIAL_OPENED', 'SUBMITTED', 'INSPECTION'].includes(declaration.status)}
                    loading={actionMutation.isPending}
                    onClick={() => actionMutation.mutate('clear')}
                  >
                    Clear
                  </Button>
                </Group>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
                <TextInput
                  label="Declaration no."
                  value={declarationNo}
                  disabled={isLocked}
                  onChange={(event) => {
                    setDeclarationNo(event.currentTarget.value);
                    setOfficialNo(event.currentTarget.value);
                  }}
                />
                <Select
                  label="Customs type"
                  data={typeOptions}
                  value={customsType}
                  disabled={isLocked}
                  onChange={(value) => setCustomsType((value as CustomsDeclarationTypeV1 | null) ?? 'IMPORT')}
                />
                <Select
                  label="Channel"
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
                  label="Broker"
                  clearable
                  searchable
                  data={brokerOptions}
                  value={brokerId}
                  disabled={isLocked}
                  onChange={setBrokerId}
                />
                <TextInput
                  label="Submitted at"
                  type="datetime-local"
                  value={submittedAt}
                  disabled={isLocked}
                  onChange={(event) => setSubmittedAt(event.currentTarget.value)}
                />
                <TextInput
                  label="Official no."
                  value={officialNo}
                  disabled={isLocked}
                  onChange={(event) => setOfficialNo(event.currentTarget.value)}
                />
                <Select
                  label="Official channel"
                  data={channelOptions}
                  value={officialChannel}
                  disabled={isLocked}
                  onChange={(value) => setOfficialChannel((value as CustomsDeclarationChannelV1 | null) ?? 'YELLOW')}
                />
                <TextInput
                  label="Clear note"
                  value={clearNote}
                  disabled={declaration.status === 'CLEARED' || declaration.status === 'CANCELLED'}
                  onChange={(event) => setClearNote(event.currentTarget.value)}
                />
                <TextInput
                  label="Header note"
                  value={headerNote}
                  disabled={isLocked}
                  onChange={(event) => setHeaderNote(event.currentTarget.value)}
                />
                <TextInput
                  label="Cancel reason"
                  value={cancelReason}
                  disabled={isLocked}
                  onChange={(event) => setCancelReason(event.currentTarget.value)}
                />
              </SimpleGrid>

              <Group justify="flex-end" gap="xs">
                <Button
                  variant="light"
                  disabled={isLocked}
                  loading={updateDeclarationMutation.isPending}
                  onClick={() => updateDeclarationMutation.mutate()}
                >
                  Save declaration
                </Button>
                <Button
                  color="red"
                  variant="light"
                  disabled={isLocked || !cancelReason}
                  loading={actionMutation.isPending}
                  onClick={() => actionMutation.mutate('cancel')}
                >
                  Cancel declaration
                </Button>
              </Group>
            </Stack>
          </Paper>

          <CustomsLinesTable
            createLinePending={createLineMutation.isPending}
            deleteLinePending={deleteLineMutation.isPending}
            editingLineId={editingLineId}
            isFetchingLines={declarationLinesQuery.isFetching}
            isLocked={isLocked}
            lineCustomsValue={lineCustomsValue}
            lineDutyRate={lineDutyRate}
            lineNote={lineNote}
            lineQuantity={lineQuantity}
            lineVatRate={lineVatRate}
            lines={lines}
            newLineCustomsValue={newLineCustomsValue}
            newLineNo={newLineNo}
            newLineNote={newLineNote}
            newLineQuantity={newLineQuantity}
            newShipmentLineId={newShipmentLineId}
            onCreateLine={() => createLineMutation.mutate()}
            onDeleteLine={(lineId) => deleteLineMutation.mutate(lineId)}
            onStartEditingLine={startEditingLine}
            onUpdateLine={() => updateLineMutation.mutate()}
            setEditingLineId={setEditingLineId}
            setLineCustomsValue={setLineCustomsValue}
            setLineDutyRate={setLineDutyRate}
            setLineNote={setLineNote}
            setLineQuantity={setLineQuantity}
            setLineVatRate={setLineVatRate}
            setNewLineCustomsValue={setNewLineCustomsValue}
            setNewLineNo={setNewLineNo}
            setNewLineNote={setNewLineNote}
            setNewLineQuantity={setNewLineQuantity}
            setNewShipmentLineId={setNewShipmentLineId}
            shipmentLineOptions={shipmentLineOptions}
            shipmentLinesLoading={shipmentLinesQuery.isLoading}
            updateLinePending={updateLineMutation.isPending}
          />
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
