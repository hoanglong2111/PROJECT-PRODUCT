import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconBox, IconInfoCircle, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  containerTypeSelectOptions,
  fetchContainerTypes,
  findContainerType,
} from '@shared/api/containerTypes';
import type { ShipmentRecord } from '@shared/api/logistics';
import {
  createShipmentContainer,
  deleteShipmentContainer,
  fetchShipmentContainers,
  updateShipmentContainer,
  type CreateShipmentContainerPayload,
  type ShipmentContainerStatusV1,
  type ShipmentContainerV1,
} from '@shared/api/shipmentContainers';
import { queryKeys } from '@shared/api/queryKeys';
import { CopyValue } from '@shared/components/CopyValue';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

const CONTAINER_STATUS_KEYS: Array<{ labelKey: string; value: ShipmentContainerStatusV1 }> = [
  { labelKey: 'shipments.containerStatusPlanned', value: 'PLANNED' },
  { labelKey: 'shipments.containerStatusStuffed', value: 'STUFFED' },
  { labelKey: 'shipments.containerStatusGatedIn', value: 'GATED_IN' },
  { labelKey: 'shipments.containerStatusDischarged', value: 'DISCHARGED' },
  { labelKey: 'shipments.containerStatusReturned', value: 'RETURNED' },
];

function statusColor(status: ShipmentContainerStatusV1) {
  switch (status) {
    case 'STUFFED': return 'blue';
    case 'GATED_IN': return 'indigo';
    case 'DISCHARGED': return 'orange';
    case 'RETURNED': return 'teal';
    default: return 'gray';
  }
}

function formatSpecValue(value: number | null | undefined, suffix: string) {
  return value === null || value === undefined ? '-' : `${value.toLocaleString()} ${suffix}`;
}

export function ShipmentContainersPanel({ shipment }: { shipment: ShipmentRecord }) {
  const { t } = useI18n();
  const containerStatusOptions = CONTAINER_STATUS_KEYS.map((option) => ({
    label: t(option.labelKey),
    value: option.value,
  }));
  const queryClient = useQueryClient();
  const [newNo, setNewNo] = useState('');
  const [newType, setNewType] = useState<string | null>('40HC');
  const [newSeal, setNewSeal] = useState('');
  const [newGross, setNewGross] = useState<number | string>('');
  const [newCbm, setNewCbm] = useState<number | string>('');
  const [grossEdited, setGrossEdited] = useState(false);
  const [cbmEdited, setCbmEdited] = useState(false);

  const containersQuery = useQuery({
    queryKey: queryKeys.shipmentContainers(shipment.id),
    queryFn: () => fetchShipmentContainers(shipment.id),
  });
  const containers: ShipmentContainerV1[] = containersQuery.data ?? [];
  const containerTypesQuery = useQuery({
    queryKey: queryKeys.containerTypes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchContainerTypes({ page: 1, limit: 100, is_active: true }),
  });
  const containerTypes = containerTypesQuery.data?.data ?? [];
  const containerTypeOptions = useMemo(() => containerTypeSelectOptions(containerTypes), [containerTypes]);
  const selectedContainerType = findContainerType(containerTypes, newType);

  useEffect(() => {
    if (containerTypeOptions.length === 0) return;
    if (newType && containerTypeOptions.some((option) => option.value === newType)) return;
    setNewType(containerTypeOptions.some((option) => option.value === '40HC') ? '40HC' : containerTypeOptions[0].value);
  }, [containerTypeOptions, newType]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentContainers(shipment.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateShipmentContainerPayload) => createShipmentContainer(shipment.id, payload),
    onSuccess: () => {
      setNewNo('');
      setNewSeal('');
      setNewGross('');
      setNewCbm('');
      setGrossEdited(false);
      setCbmEdited(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ShipmentContainerStatusV1 }) =>
      updateShipmentContainer(id, { status }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShipmentContainer(id),
    onSuccess: invalidate,
  });

  const handleCreate = () => {
    if (!newNo.trim()) return;
    createMutation.mutate({
      container_no: newNo.trim(),
      container_type: newType,
      seal_no: newSeal || null,
      gross_weight_kg: newGross === '' ? null : Number(newGross),
      volume_cbm: newCbm === '' ? null : Number(newCbm),
    });
  };

  const handleTypeChange = (value: string | null) => {
    setNewType(value);
    const selected = findContainerType(containerTypes, value);
    if (!selected) return;
    if (!grossEdited && selected.gross_kg !== null) setNewGross(selected.gross_kg);
    if (!cbmEdited && selected.capacity_cbm !== null) setNewCbm(selected.capacity_cbm);
  };

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconBox size={18} />}>
        {t('shipments.containersInfo')}
      </Alert>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 6 }} spacing="sm">
          <TextInput
            label={t('shipments.containerNumber')}
            placeholder={t('shipments.containerNumberPlaceholder')}
            value={newNo}
            onChange={(event) => setNewNo(event.currentTarget.value)}
            required
          />
          <Select
            label={
              <Group gap={4} wrap="nowrap">
                <HeaderLabel label={t('shipments.containerType')} hint={t('glossary.containerType')} />
                {selectedContainerType ? (
                  <Tooltip
                    multiline
                    w={220}
                    withArrow
                    label={
                      <Stack gap={2}>
                        <Text size="xs">Tare: {formatSpecValue(selectedContainerType.tare_kg, 'kg')}</Text>
                        <Text size="xs">Max gross: {formatSpecValue(selectedContainerType.gross_kg, 'kg')}</Text>
                        <Text size="xs">Capacity: {formatSpecValue(selectedContainerType.capacity_cbm, 'CBM')}</Text>
                      </Stack>
                    }
                  >
                    <IconInfoCircle size={14} style={{ cursor: 'help' }} />
                  </Tooltip>
                ) : null}
              </Group>
            }
            data={containerTypeOptions}
            value={newType}
            onChange={handleTypeChange}
            searchable
            nothingFoundMessage={containerTypesQuery.isLoading ? t('masterData.loadingReferenceData') : t('masterData.noContainerTypes')}
          />
          <TextInput
            label={<HeaderLabel label={t('shipments.sealNumber')} hint={t('glossary.seal')} />}
            placeholder={t('shipments.sealNumberPlaceholder')}
            value={newSeal}
            onChange={(event) => setNewSeal(event.currentTarget.value)}
          />
          <NumberInput
            label={<HeaderLabel label={t('shipments.grossWeightKg')} hint={t('glossary.grossWeight')} />}
            placeholder="0"
            value={newGross}
            onChange={(value) => {
              setGrossEdited(true);
              setNewGross(value);
            }}
            min={0}
          />
          <NumberInput
            label={<HeaderLabel label={t('shipments.volumeCbm')} hint={t('glossary.cbm')} />}
            placeholder="0"
            value={newCbm}
            onChange={(value) => {
              setCbmEdited(true);
              setNewCbm(value);
            }}
            min={0}
          />
          <Group align="flex-end">
            <Button
              fullWidth
              leftSection={<IconPlus size={16} />}
              loading={createMutation.isPending}
              disabled={!newNo.trim()}
              onClick={handleCreate}
            >
              {t('shipments.addContainer')}
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>

      {containersQuery.isLoading ? (
        <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">{t('shipments.loadingContainers')}</Text></Group>
      ) : containers.length === 0 ? (
        <EmptyState title={t('shipments.containersEmptyTitle')} description={t('shipments.containersEmptyDescription')} />
      ) : (
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={820} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('shipments.containerNumber')}</Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.containerType')} hint={t('glossary.containerType')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.seal')} hint={t('glossary.seal')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.grossWeightKg')} hint={t('glossary.grossWeight')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="CBM" hint={t('glossary.cbm')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="DTO" hint={t('glossary.dto')} />
                  </Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {containers.map((container) => (
                  <Table.Tr key={container.id}>
                    <Table.Td>
                      <Text fw={700}>
                        <CopyValue value={container.container_no}>{container.container_no}</CopyValue>
                      </Text>
                    </Table.Td>
                    <Table.Td>{container.container_type ?? '-'}</Table.Td>
                    <Table.Td>
                      {container.seal_no ? <CopyValue value={container.seal_no}>{container.seal_no}</CopyValue> : '-'}
                    </Table.Td>
                    <Table.Td>{container.gross_weight_kg ?? '-'}</Table.Td>
                    <Table.Td>{container.volume_cbm ?? '-'}</Table.Td>
                    <Table.Td>
                      {container.dto_id ? (
                        <Badge variant="light" color="teal">{container.dto_id}</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">{t('shipments.unallocated')}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        w={140}
                        data={containerStatusOptions}
                        value={container.status}
                        allowDeselect={false}
                        onChange={(value) =>
                          value && updateMutation.mutate({ id: container.id, status: value as ShipmentContainerStatusV1 })
                        }
                        leftSection={<Badge size="xs" circle color={statusColor(container.status)}> </Badge>}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('shipments.removeContainer')}>
                        <ActionIcon
                          aria-label={t('shipments.removeContainer')}
                          color="red"
                          variant="subtle"
                          loading={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(container.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {mutationError instanceof Error && (
        <Alert color="red" icon={<IconX size={16} />}>
          {mutationError.message}
        </Alert>
      )}
    </Stack>
  );
}
