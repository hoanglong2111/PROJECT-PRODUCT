import {
  Alert,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconFileInvoice, IconPlus, IconX } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  cancelCarrierDeliveryOrder,
  createCarrierDeliveryOrderForShipment,
  fetchShipmentCarrierDeliveryOrders,
  issueCarrierDeliveryOrder,
  releaseCarrierDeliveryOrder,
  type CarrierDeliveryOrderV1,
} from '@shared/api/carrierDeliveryOrders';
import type { ShipmentRecord } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { fetchSuppliers } from '@shared/api/tradeMasterData';
import { EmptyState } from '@shared/components/EmptyState';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

type CarrierDoAction = 'issue' | 'release' | 'cancel';

export function ShipmentCarrierDoPanel({ shipment }: { shipment: ShipmentRecord }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isCleared = shipment.status === 'CUSTOMS_CLEARED';

  const [forwarderId, setForwarderId] = useState<string | null>(null);
  const [releaseLocation, setReleaseLocation] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const [localCharge, setLocalCharge] = useState('');
  const [note, setNote] = useState('');

  const carrierDosQuery = useQuery({
    queryKey: queryKeys.shipmentCarrierDeliveryOrders(shipment.id),
    queryFn: () => fetchShipmentCarrierDeliveryOrders(shipment.id),
  });
  const carrierDos: CarrierDeliveryOrderV1[] = carrierDosQuery.data ?? [];

  const forwardersQuery = useQuery({
    queryKey: queryKeys.suppliers({ page: 1, limit: 100 }),
    queryFn: () => fetchSuppliers({ page: 1, limit: 100 }),
  });
  const forwarders = forwardersQuery.data?.data ?? [];
  const forwarderOptions = forwarders.map((supplier) => ({
    label: `${supplier.supplier_code} - ${supplier.supplier_name}`,
    value: supplier.id,
  }));
  const forwarderName = (id: string | null) =>
    forwarders.find((supplier) => supplier.id === id)?.supplier_name ?? id ?? '-';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentCarrierDeliveryOrders(shipment.id) });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCarrierDeliveryOrderForShipment(shipment.id, {
        forwarder_id: forwarderId,
        release_location: releaseLocation || null,
        container_no: containerNo || null,
        issued_date: issuedDate || null,
        expired_date: expiredDate || null,
        local_charge_amount: localCharge ? Number(localCharge) : null,
        note: note || null,
      }),
    onSuccess: () => {
      setForwarderId(null);
      setReleaseLocation('');
      setContainerNo('');
      setIssuedDate('');
      setExpiredDate('');
      setLocalCharge('');
      setNote('');
      refresh();
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: CarrierDoAction; id: string }) => {
      if (action === 'issue') return issueCarrierDeliveryOrder(id);
      if (action === 'release') return releaseCarrierDeliveryOrder(id);
      return cancelCarrierDeliveryOrder(id);
    },
    onSuccess: () => refresh(),
  });

  return (
    <Stack gap="md">
      <Alert color="grape" icon={<IconFileInvoice size={18} />}>
        Carrier DO releases cargo from the carrier/forwarder after customs clearance. Issue it, then release it before the truck (DTO) picks up.
      </Alert>

      <Paper withBorder p="md">
        <Stack gap="md">
          <div>
            <Text fw={700}>Create carrier DO</Text>
            <Text size="sm" c="dimmed">
              {isCleared
                ? 'Create one carrier DO per release, then issue and release it.'
                : 'Available after the shipment is CUSTOMS_CLEARED.'}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Select
              label={<HeaderLabel label="Forwarder" hint={t('glossary.forwarder')} />}
              placeholder="Select forwarder..."
              searchable
              clearable
              data={forwarderOptions}
              value={forwarderId}
              disabled={!isCleared}
              onChange={setForwarderId}
              nothingFoundMessage={forwardersQuery.isLoading ? 'Loading suppliers...' : 'No supplier found'}
            />
            <TextInput
              label="Release location"
              placeholder="Hai Phong Port"
              value={releaseLocation}
              disabled={!isCleared}
              onChange={(event) => setReleaseLocation(event.currentTarget.value)}
            />
            <TextInput
              label="Container no."
              value={containerNo}
              disabled={!isCleared}
              onChange={(event) => setContainerNo(event.currentTarget.value)}
            />
            <TextInput
              label="Issued date"
              type="date"
              value={issuedDate}
              disabled={!isCleared}
              onChange={(event) => setIssuedDate(event.currentTarget.value)}
            />
            <TextInput
              label="Expired date"
              type="date"
              value={expiredDate}
              disabled={!isCleared}
              onChange={(event) => setExpiredDate(event.currentTarget.value)}
            />
            <TextInput
              label={<HeaderLabel label="Local charge (VND)" hint={t('glossary.localCharges')} />}
              type="number"
              value={localCharge}
              disabled={!isCleared}
              onChange={(event) => setLocalCharge(event.currentTarget.value)}
            />
            <TextInput
              label="Note"
              value={note}
              disabled={!isCleared}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
            <Group align="flex-end">
              <Button
                leftSection={<IconPlus size={16} />}
                disabled={!isCleared}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create carrier DO
              </Button>
            </Group>
          </SimpleGrid>
        </Stack>
      </Paper>

      {carrierDosQuery.isLoading ? (
        <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">Loading carrier DOs...</Text></Group>
      ) : carrierDos.length === 0 ? (
        <EmptyState
          title="No carrier DO yet"
          description="Create a carrier DO after the shipment clears customs to release the cargo."
        />
      ) : (
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={780} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <HeaderLabel label="Carrier DO" hint={t('glossary.carrierDo')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label="Forwarder" hint={t('glossary.forwarder')} />
                  </Table.Th>
                  <Table.Th>Release location</Table.Th>
                  <Table.Th>Issued</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {carrierDos.map((cdo) => (
                  <Table.Tr key={cdo.id}>
                    <Table.Td><Text fw={700}>{cdo.carrier_do_no ?? cdo.id}</Text></Table.Td>
                    <Table.Td>{cdo.forwarder?.supplier_name ?? forwarderName(cdo.forwarder_id)}</Table.Td>
                    <Table.Td>{cdo.release_location ?? '-'}</Table.Td>
                    <Table.Td>{cdo.issued_date ?? '-'}</Table.Td>
                    <Table.Td><StatusBadge status={cdo.status} /></Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          disabled={cdo.status !== 'PENDING'}
                          loading={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ action: 'issue', id: cdo.id })}
                        >
                          Issue
                        </Button>
                        <Button
                          size="xs"
                          color="teal"
                          disabled={cdo.status !== 'ISSUED'}
                          loading={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ action: 'release', id: cdo.id })}
                        >
                          Release
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          disabled={!['PENDING', 'ISSUED'].includes(cdo.status)}
                          loading={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ action: 'cancel', id: cdo.id })}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {(createMutation.isError || actionMutation.isError || carrierDosQuery.isError) && (
        <Alert color="red" icon={<IconX size={16} />}>
          {((createMutation.error ?? actionMutation.error ?? carrierDosQuery.error) as Error | undefined)?.message ??
            'Operation failed'}
        </Alert>
      )}
    </Stack>
  );
}
