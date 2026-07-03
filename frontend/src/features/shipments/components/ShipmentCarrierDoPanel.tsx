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
import { CopyValue } from '@shared/components/CopyValue';
import { DateField } from '@shared/components/DateField';
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
        {t('shipments.carrierDoInfo')}
      </Alert>

      <Paper withBorder p="md">
        <Stack gap="md">
          <div>
            <Text fw={700}>{t('shipments.createCarrierDo')}</Text>
            <Text size="sm" c="dimmed">
              {isCleared
                ? t('shipments.carrierDoClearedHint')
                : t('shipments.carrierDoAvailableAfter')}
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Select
              label={<HeaderLabel label={t('shipments.forwarder')} hint={t('glossary.forwarder')} />}
              placeholder={t('shipments.selectForwarder')}
              searchable
              clearable
              data={forwarderOptions}
              value={forwarderId}
              disabled={!isCleared}
              onChange={setForwarderId}
              nothingFoundMessage={forwardersQuery.isLoading ? t('shipments.loadingSuppliers') : t('shipments.noSupplierFound')}
            />
            <TextInput
              label={t('shipments.releaseLocation')}
              placeholder={t('shipments.releaseLocationPlaceholder')}
              value={releaseLocation}
              disabled={!isCleared}
              onChange={(event) => setReleaseLocation(event.currentTarget.value)}
            />
            <TextInput
              label={t('shipments.containerNumber')}
              value={containerNo}
              disabled={!isCleared}
              onChange={(event) => setContainerNo(event.currentTarget.value)}
            />
            <DateField
              label={t('shipments.issuedDate')}
              value={issuedDate}
              disabled={!isCleared}
              onChange={(value) => setIssuedDate(value ?? '')}
            />
            <DateField
              label={t('shipments.expiredDate')}
              value={expiredDate}
              disabled={!isCleared}
              onChange={(value) => setExpiredDate(value ?? '')}
            />
            <TextInput
              label={<HeaderLabel label={t('shipments.localChargeVnd')} hint={t('glossary.localCharges')} />}
              type="number"
              value={localCharge}
              disabled={!isCleared}
              onChange={(event) => setLocalCharge(event.currentTarget.value)}
            />
            <TextInput
              label={t('shipments.note')}
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
                {t('shipments.createCarrierDo')}
              </Button>
            </Group>
          </SimpleGrid>
        </Stack>
      </Paper>

      {carrierDosQuery.isLoading ? (
        <Group gap="xs"><Loader size="sm" /><Text size="sm" c="dimmed">{t('shipments.loadingCarrierDos')}</Text></Group>
      ) : carrierDos.length === 0 ? (
        <EmptyState
          title={t('shipments.carrierDoEmptyTitle')}
          description={t('shipments.carrierDoEmptyDescription')}
        />
      ) : (
        <Paper withBorder p={0}>
          <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={780} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.carrierDo')} hint={t('glossary.carrierDo')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.forwarder')} hint={t('glossary.forwarder')} />
                  </Table.Th>
                  <Table.Th>{t('shipments.releaseLocation')}</Table.Th>
                  <Table.Th>{t('shipments.issuedDate')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>{t('shipments.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {carrierDos.map((cdo) => (
                  <Table.Tr key={cdo.id}>
                    <Table.Td>
                      <Text fw={700}>
                        <CopyValue value={cdo.carrier_do_no ?? cdo.id}>{cdo.carrier_do_no ?? cdo.id}</CopyValue>
                      </Text>
                    </Table.Td>
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
                          {t('shipments.issue')}
                        </Button>
                        <Button
                          size="xs"
                          color="teal"
                          disabled={cdo.status !== 'ISSUED'}
                          loading={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ action: 'release', id: cdo.id })}
                        >
                          {t('shipments.release')}
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          variant="subtle"
                          disabled={!['PENDING', 'ISSUED'].includes(cdo.status)}
                          loading={actionMutation.isPending}
                          onClick={() => actionMutation.mutate({ action: 'cancel', id: cdo.id })}
                        >
                          {t('common.cancel')}
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
            t('shipments.dtosPanel.operationFailed')}
        </Alert>
      )}
    </Stack>
  );
}
