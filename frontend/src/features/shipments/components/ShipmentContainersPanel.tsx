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
import { IconBox, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

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
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { useI18n } from '@shared/i18n';

const CONTAINER_TYPE_OPTIONS = ['20GP', '40GP', '40HC', '45HC', '20RF', '40RF', 'LCL'].map((value) => ({
  label: value,
  value,
}));

const CONTAINER_STATUS_OPTIONS: Array<{ label: string; value: ShipmentContainerStatusV1 }> = [
  { label: 'Planned', value: 'PLANNED' },
  { label: 'Stuffed', value: 'STUFFED' },
  { label: 'Gated in', value: 'GATED_IN' },
  { label: 'Discharged', value: 'DISCHARGED' },
  { label: 'Returned', value: 'RETURNED' },
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

export function ShipmentContainersPanel({ shipment }: { shipment: ShipmentRecord }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [newNo, setNewNo] = useState('');
  const [newType, setNewType] = useState<string | null>('40HC');
  const [newSeal, setNewSeal] = useState('');
  const [newGross, setNewGross] = useState<number | string>('');
  const [newCbm, setNewCbm] = useState<number | string>('');

  const containersQuery = useQuery({
    queryKey: queryKeys.shipmentContainers(shipment.id),
    queryFn: () => fetchShipmentContainers(shipment.id),
  });
  const containers: ShipmentContainerV1[] = containersQuery.data ?? [];

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

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconBox size={18} />}>
        Containers are the physical transport units of this shipment. Allocate them to a DTO when arranging
        last-mile trucking; a container can belong to at most one DTO at a time.
      </Alert>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 6 }} spacing="sm">
          <TextInput
            label="Container no."
            placeholder="ABCU1234567"
            value={newNo}
            onChange={(event) => setNewNo(event.currentTarget.value)}
            required
          />
          <Select
            label={<HeaderLabel label="Type" hint={t('glossary.containerType')} />}
            data={CONTAINER_TYPE_OPTIONS}
            value={newType}
            onChange={setNewType}
          />
          <TextInput
            label={<HeaderLabel label="Seal no." hint={t('glossary.seal')} />}
            placeholder="SL-001"
            value={newSeal}
            onChange={(event) => setNewSeal(event.currentTarget.value)}
          />
          <NumberInput
            label={<HeaderLabel label="Gross (kg)" hint={t('glossary.grossWeight')} />}
            placeholder="0"
            value={newGross}
            onChange={setNewGross}
            min={0}
          />
          <NumberInput
            label={<HeaderLabel label="Volume (CBM)" hint={t('glossary.cbm')} />}
            placeholder="0"
            value={newCbm}
            onChange={setNewCbm}
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
              Add container
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>

      {containersQuery.isLoading ? (
        <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">Loading containers...</Text></Group>
      ) : containers.length === 0 ? (
        <EmptyState title="No containers" description="Add a container to this shipment to start tracking transport units." />
      ) : (
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={820} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Container no.</Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Type" hint={t('glossary.containerType')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Seal" hint={t('glossary.seal')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Gross (kg)" hint={t('glossary.grossWeight')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="CBM" hint={t('glossary.cbm')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="DTO" hint={t('glossary.dto')} />
                  </Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {containers.map((container) => (
                  <Table.Tr key={container.id}>
                    <Table.Td><Text fw={700}>{container.container_no}</Text></Table.Td>
                    <Table.Td>{container.container_type ?? '-'}</Table.Td>
                    <Table.Td>{container.seal_no ?? '-'}</Table.Td>
                    <Table.Td>{container.gross_weight_kg ?? '-'}</Table.Td>
                    <Table.Td>{container.volume_cbm ?? '-'}</Table.Td>
                    <Table.Td>
                      {container.dto_id ? (
                        <Badge variant="light" color="teal">{container.dto_id}</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">Unallocated</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        w={140}
                        data={CONTAINER_STATUS_OPTIONS}
                        value={container.status}
                        allowDeselect={false}
                        onChange={(value) =>
                          value && updateMutation.mutate({ id: container.id, status: value as ShipmentContainerStatusV1 })
                        }
                        leftSection={<Badge size="xs" circle color={statusColor(container.status)}> </Badge>}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Remove container">
                        <ActionIcon
                          aria-label="Remove container"
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
