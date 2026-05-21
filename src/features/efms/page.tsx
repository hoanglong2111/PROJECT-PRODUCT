import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconCurrencyDollar,
  IconExternalLink,
  IconFileUpload,
  IconSearch,
  IconShip,
  IconTruck,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getApiErrorMessage } from '@shared/api/http';
import {
  fetchDeliveryOrderAttachments,
  fetchDeliveryOrders,
  fetchEfmsControl,
} from '@shared/api/logistics';
import { EmptyState } from '@shared/components/EmptyState';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { shippingModeLabel } from './constants';
import { ContainerPanel } from './components/ContainerPanel';
import { CustomsPanel } from './components/CustomsPanel';
import { DocumentsPanel } from './components/DocumentsPanel';
import { FinancePanel } from './components/FinancePanel';
import { HouseBillPanel } from './components/HouseBillPanel';
import { Info } from './components/Info';
import { OverviewPanel } from './components/OverviewPanel';
import { ShippingInstructionPanel } from './components/ShippingInstructionPanel';

export function Efms() {
  const { orderNumber } = useParams();

  if (orderNumber) {
    return <EfmsDetail orderNumber={orderNumber} />;
  }

  return <EfmsList />;
}

function EfmsList() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });

  const deliveryOrders = deliveryOrdersQuery.data ?? [];
  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return deliveryOrders.filter((order) => {
      const haystack = [
        order.order_info.order_number,
        order.order_info.request_code,
        order.sap_integration.po_number,
        order.sap_integration.supplier_name,
        order.logistics_shipping.port_of_departure,
        order.logistics_shipping.port_of_destination,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [deliveryOrders, search]);
  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleOrders,
  } = useListPagination(filteredOrders, [search]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('efms.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('efms.subtitle')}
          </Text>
        </div>
      </Group>

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-end">
          <TextInput
            label={t('common.search')}
            placeholder={t('efms.searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {deliveryOrdersQuery.isFetching ? <Loader size="sm" /> : null}
        </Group>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={960} verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.doNumber')}</Table.Th>
              <Table.Th>{t('efms.route')}</Table.Th>
              <Table.Th>{t('efms.shippingMode')}</Table.Th>
              <Table.Th>{t('common.status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleOrders.map((order) => (
              <Table.Tr key={order.id}>
                <Table.Td>
                  <Text fw={700}>{order.order_info.order_number}</Text>
                  <Text size="xs" c="dimmed">
                    {order.order_info.request_code} / {order.sap_integration.po_number ?? t('efms.poPending')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {order.logistics_shipping.port_of_departure} -&gt; {order.logistics_shipping.port_of_destination}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {order.sap_integration.supplier_name ?? t('efms.supplierPending')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{shippingModeLabel[order.logistics_shipping.shipping_method]}</Badge>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={order.order_info.status} />
                </Table.Td>
                <Table.Td>
                  <Tooltip label={t('efms.openDetail')}>
                    <ActionIcon
                      component={Link}
                      to={`/efms/${order.order_info.order_number}`}
                      variant="subtle"
                      aria-label={t('efms.openDetail')}
                    >
                      <IconExternalLink size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {filteredOrders.length === 0 ? (
          <EmptyState title={t('efms.emptyTitle')} description={t('efms.emptyDescription')} />
        ) : null}
        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={filteredOrders.length}
        />
      </Paper>
    </Stack>
  );
}

function EfmsDetail({ orderNumber }: { orderNumber: string }) {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();

  const deliveryOrdersQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: fetchDeliveryOrders,
  });
  const controlQuery = useQuery({
    queryKey: ['efms-control', orderNumber],
    queryFn: () => fetchEfmsControl(orderNumber),
  });
  const attachmentsQuery = useQuery({
    queryKey: ['delivery-order-attachments', orderNumber],
    queryFn: () => fetchDeliveryOrderAttachments(orderNumber),
  });

  const deliveryOrder =
    deliveryOrdersQuery.data?.find((order) => order.order_info.order_number === orderNumber) ?? null;
  const control = controlQuery.data ?? null;
  const attachments = attachmentsQuery.data ?? [];
  const isLoading = controlQuery.isLoading || deliveryOrdersQuery.isLoading;

  const refresh = () =>
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] }),
      queryClient.invalidateQueries({ queryKey: ['delivery-order-attachments', orderNumber] }),
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
    ]);

  if (isLoading) {
    return (
      <Paper withBorder p="lg">
        <Group gap="sm">
          <Loader size="sm" />
          <div>
            <Title order={2}>{t('efms.detailTitle', { orderNumber })}</Title>
            <Text c="dimmed">{t('efms.loadingDescription')}</Text>
          </div>
        </Group>
      </Paper>
    );
  }

  if (controlQuery.isError || !control) {
    return (
      <Stack gap="md">
        <Button component={Link} to="/efms" variant="subtle" leftSection={<IconArrowLeft size={16} />}>
          {t('efms.backToList')}
        </Button>
        <Alert color="red" title={t('efms.errorTitle')}>
          {controlQuery.isError ? getApiErrorMessage(controlQuery.error) : t('efms.errorDescription')}
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Button component={Link} to="/efms" variant="subtle" leftSection={<IconArrowLeft size={16} />} mb="xs">
            {t('efms.backToList')}
          </Button>
          <Title order={1}>{t('efms.detailTitle', { orderNumber })}</Title>
          <Text c="dimmed" mt={4}>
            {deliveryOrder
              ? `${deliveryOrder.logistics_shipping.port_of_departure} -> ${deliveryOrder.logistics_shipping.port_of_destination}`
              : t('efms.subtitle')}
          </Text>
        </div>
        <Group gap="xs">
          <Button component={Link} to={`/delivery-orders?do=${orderNumber}`} variant="light" leftSection={<IconTruck size={16} />}>
            {t('efms.openDo')}
          </Button>
          <Button variant="subtle" onClick={refresh}>
            {t('shell.refresh')}
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Info label={t('efms.bookingNumber')} value={control.transport?.bookingNumber ?? '-'} />
        <Info label={t('efms.totalHbls', { count: control.houseBills.length })} value={control.houseBills.length} />
        <Info label={t('efms.totalContainers', { count: control.containers.length })} value={control.containers.length} />
        <Info
          label={t('efms.customs')}
          value={
            control.customs ? (
              <Group gap="xs">
                <StatusBadge status={control.customs.status} />
                <Badge color={control.customs.canDispatch ? 'teal' : 'orange'} variant="light">
                  {control.customs.canDispatch ? t('efms.canDispatch') : t('efms.cannotDispatch')}
                </Badge>
              </Group>
            ) : (
              statusLabel('DRAFT')
            )
          }
        />
      </SimpleGrid>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconShip size={16} />}>
            {t('efms.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="si" leftSection={<IconClipboardCheck size={16} />}>
            {t('efms.siManifest')}
          </Tabs.Tab>
          <Tabs.Tab value="hbl" leftSection={<IconFileUpload size={16} />}>
            {t('efms.houseBills')}
          </Tabs.Tab>
          <Tabs.Tab value="containers" leftSection={<IconTruck size={16} />}>
            {t('efms.containers')}
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconCheck size={16} />}>
            {t('common.documents')}
          </Tabs.Tab>
          <Tabs.Tab value="customs" leftSection={<IconClipboardCheck size={16} />}>
            {t('efms.customs')}
          </Tabs.Tab>
          <Tabs.Tab value="finance" leftSection={<IconCurrencyDollar size={16} />}>
            {t('efms.finance')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <OverviewPanel control={control} attachments={attachments} deliveryOrder={deliveryOrder} />
        </Tabs.Panel>
        <Tabs.Panel value="si" pt="md">
          <ShippingInstructionPanel control={control} orderNumber={orderNumber} />
        </Tabs.Panel>
        <Tabs.Panel value="hbl" pt="md">
          <HouseBillPanel control={control} orderNumber={orderNumber} />
        </Tabs.Panel>
        <Tabs.Panel value="containers" pt="md">
          <ContainerPanel control={control} orderNumber={orderNumber} />
        </Tabs.Panel>
        <Tabs.Panel value="documents" pt="md">
          <DocumentsPanel
            attachments={attachments}
            control={control}
            orderNumber={orderNumber}
            attachmentsLoading={attachmentsQuery.isFetching}
          />
        </Tabs.Panel>
        <Tabs.Panel value="customs" pt="md">
          <CustomsPanel control={control} orderNumber={orderNumber} />
        </Tabs.Panel>
        <Tabs.Panel value="finance" pt="md">
          <FinancePanel control={control} orderNumber={orderNumber} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
