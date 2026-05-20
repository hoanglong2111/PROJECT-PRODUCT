import {
  ActionIcon,
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
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconArrowLeft,
  IconCheck,
  IconClipboardCheck,
  IconCurrencyDollar,
  IconExternalLink,
  IconFileUpload,
  IconPlus,
  IconSearch,
  IconShip,
  IconTruck,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getApiErrorMessage } from '../api/http';
import {
  confirmDocumentCrossCheck,
  confirmFinalBl,
  createAdvanceSettlement,
  createCharge,
  createContainer,
  createDocumentReview,
  createHouseBill,
  deleteCharge,
  fetchDeliveryOrderAttachments,
  fetchDeliveryOrders,
  fetchEfmsControl,
  issueFinanceNote,
  sendFinanceNoteToAccounting,
  syncDriveDossier,
  updateCharge,
  updateAdvanceSettlementStatus,
  updateCustoms,
  updateShippingInstruction,
  uploadDeliveryOrderAttachment,
  type AdvanceSettlementStatus,
  type CustomsChannel,
  type CustomsLaneStatus,
  type CustomsStatus,
  type DeliveryOrder,
  type DocumentReview,
  type EfmsControl,
  type FinanceCharge,
  type FinanceChargeType,
  type LogisticsAttachment,
  type MblType,
  type TaskRole,
} from '../api/logistics';
import { EmptyState } from '../components/EmptyState';
import { ListPagination, useListPagination } from '../components/ListPagination';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n } from '../i18n';

const shippingModeLabel: Record<DeliveryOrder['logistics_shipping']['shipping_method'], string> = {
  AIR: 'AIR',
  ROAD: 'ROAD',
  SEA: 'SEA',
};

const documentTypeOptions = [
  'Draft B/L',
  'Final B/L',
  'Commercial Invoice',
  'Packing List',
  'Customs Declaration',
  'Arrival Notice',
  'POD',
  'Debit Note',
  'Credit Note',
  'OBH Note',
  'Quotation',
].map((value) => ({ label: value, value }));

const chargeTypeOptions: Array<{ label: string; value: FinanceChargeType }> = [
  { label: 'Selling', value: 'SELLING' },
  { label: 'Buying', value: 'BUYING' },
  { label: 'OBH', value: 'OBH' },
];

const customsChannelOptions: Array<{ label: string; value: CustomsChannel }> = [
  { label: 'Green', value: 'GREEN' },
  { label: 'Yellow', value: 'YELLOW' },
  { label: 'Red', value: 'RED' },
];

const customsStatusOptions: Array<{ label: string; value: CustomsStatus }> = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Cleared', value: 'CLEARED' },
  { label: 'Needs documents', value: 'NEEDS_DOCUMENTS' },
  { label: 'Inspection', value: 'INSPECTION' },
  { label: 'Violation handling', value: 'VIOLATION_HANDLING' },
];

const mblTypeOptions: Array<{ label: string; value: MblType }> = [
  { label: 'Copy', value: 'COPY' },
  { label: 'Original', value: 'ORIGINAL' },
  { label: 'Seaway Bill', value: 'SEAWAY_BILL' },
  { label: 'Surrendered', value: 'SURRENDERED' },
];

const customsLaneStatusOptions: Array<{ label: string; value: CustomsLaneStatus }> = [
  { label: 'Green clearance', value: 'GREEN_CLEARANCE' },
  { label: 'Yellow - supplement docs', value: 'YELLOW_NEED_SUPPLEMENT' },
  { label: 'Red - field inspection', value: 'RED_FIELD_INSPECTION' },
  { label: 'Red - violation handling', value: 'RED_VIOLATION_HANDLING' },
  { label: 'Release ready', value: 'RELEASE_READY' },
];

const advanceRoleOptions: Array<{ label: string; value: TaskRole }> = [
  { label: 'Port Officer', value: 'Port Officer' },
  { label: 'Customs Officer', value: 'Customs Officer' },
  { label: 'Finance Officer', value: 'Finance Officer' },
];

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

function OverviewPanel({
  attachments,
  control,
  deliveryOrder,
}: {
  attachments: LogisticsAttachment[];
  control: EfmsControl;
  deliveryOrder: DeliveryOrder | null;
}) {
  const { statusLabel, t } = useI18n();
  const transport = control.transport;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Info label={t('efms.mblNumber')} value={transport?.mblNumber ?? '-'} />
        <Info label={t('efms.mblType')} value={transport?.mblType ? statusLabel(transport.mblType) : '-'} />
        <Info label={t('efms.manifestNumber')} value={transport?.manifestNumber ?? '-'} />
        <Info label={t('efms.vesselCode')} value={transport?.vesselCode ?? '-'} />
        <Info label={t('efms.actualDeparture')} value={transport?.actualDepartureAt ? formatDateTime(transport.actualDepartureAt) : '-'} />
        <Info label={t('efms.actualArrival')} value={transport?.actualArrivalAt ? formatDateTime(transport.actualArrivalAt) : '-'} />
        <Info label={t('efms.grossWeight')} value={formatOptionalNumber(transport?.grossWeight)} />
        <Info label={t('efms.cbm')} value={formatOptionalNumber(transport?.cbm)} />
        <Info label={t('common.documents')} value={attachments.length} />
        <Info
          label={t('efms.driveDossier')}
          value={control.latestDriveDossier ? <StatusBadge status={control.latestDriveDossier.status} /> : '-'}
        />
      </SimpleGrid>

      {deliveryOrder ? (
        <Paper withBorder p="md">
          <Group justify="space-between" align="flex-start" gap="md">
            <div>
              <Text fw={700}>{deliveryOrder.product_details.item_name_requested}</Text>
              <Text size="sm" c="dimmed">
                {deliveryOrder.sap_integration.supplier_name ?? t('efms.supplierPending')}
              </Text>
            </div>
            <StatusBadge status={deliveryOrder.order_info.status} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
            <Info label={t('efms.doNumber')} value={deliveryOrder.order_info.order_number} />
            <Info label={t('quotations.requestCode')} value={deliveryOrder.order_info.request_code} />
            <Info label={t('common.status')} value={statusLabel(deliveryOrder.order_info.status)} />
          </SimpleGrid>
        </Paper>
      ) : null}
    </Stack>
  );
}

function ShippingInstructionPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const transport = control.transport;
  const [bookingNumber, setBookingNumber] = useState('');
  const [mblNumber, setMblNumber] = useState('');
  const [mblType, setMblType] = useState<MblType | null>('ORIGINAL');
  const [manifestNumber, setManifestNumber] = useState('');
  const [shippingLine, setShippingLine] = useState('');
  const [vesselCode, setVesselCode] = useState('');
  const [grossWeight, setGrossWeight] = useState<number | ''>('');
  const [cbm, setCbm] = useState<number | ''>('');
  const [actualDepartureAt, setActualDepartureAt] = useState('');
  const [actualArrivalAt, setActualArrivalAt] = useState('');

  useEffect(() => {
    setBookingNumber(transport?.bookingNumber ?? '');
    setMblNumber(transport?.mblNumber ?? '');
    setMblType(transport?.mblType ?? 'ORIGINAL');
    setManifestNumber(transport?.manifestNumber ?? '');
    setShippingLine(transport?.shippingLine ?? '');
    setVesselCode(transport?.vesselCode ?? '');
    setGrossWeight(toNumberInputValue(transport?.grossWeight));
    setCbm(toNumberInputValue(transport?.cbm));
    setActualDepartureAt(toDateTimeLocalInput(transport?.actualDepartureAt));
    setActualArrivalAt(toDateTimeLocalInput(transport?.actualArrivalAt));
  }, [transport]);

  const mutation = useMutation({
    mutationFn: () =>
      updateShippingInstruction(orderNumber, {
        bookingNumber: cleanString(bookingNumber),
        cbm: cbm === '' ? null : Number(cbm),
        grossWeight: grossWeight === '' ? null : Number(grossWeight),
        manifestNumber: cleanString(manifestNumber),
        mblNumber: cleanString(mblNumber),
        mblType,
        shippingLine: cleanString(shippingLine),
        vesselCode: cleanString(vesselCode),
        actualDepartureAt: fromDateTimeLocalInput(actualDepartureAt),
        actualArrivalAt: fromDateTimeLocalInput(actualArrivalAt),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  if (!transport) {
    return <Alert color="yellow">{t('efms.transportEmpty')}</Alert>;
  }

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconX size={16} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label={t('efms.bookingNumber')} value={bookingNumber} onChange={(event) => setBookingNumber(event.currentTarget.value)} />
          <TextInput label={t('efms.mblNumber')} value={mblNumber} onChange={(event) => setMblNumber(event.currentTarget.value)} />
          <Select
            label={t('efms.mblType')}
            data={mblTypeOptions}
            value={mblType}
            onChange={(value) => setMblType((value as MblType | null) ?? 'ORIGINAL')}
          />
          <TextInput label={t('efms.manifestNumber')} value={manifestNumber} onChange={(event) => setManifestNumber(event.currentTarget.value)} />
          <TextInput label={t('efms.shippingLine')} value={shippingLine} onChange={(event) => setShippingLine(event.currentTarget.value)} />
          <TextInput label={t('efms.vesselCode')} value={vesselCode} onChange={(event) => setVesselCode(event.currentTarget.value)} />
          <TextInput label={t('efms.actualDeparture')} type="datetime-local" value={actualDepartureAt} onChange={(event) => setActualDepartureAt(event.currentTarget.value)} />
          <TextInput label={t('efms.actualArrival')} type="datetime-local" value={actualArrivalAt} onChange={(event) => setActualArrivalAt(event.currentTarget.value)} />
          <NumberInput label={t('efms.grossWeight')} min={0.01} value={grossWeight} onChange={(value) => setGrossWeight(value === '' ? '' : Number(value))} />
          <NumberInput label={t('efms.cbm')} min={0.01} value={cbm} onChange={(value) => setCbm(value === '' ? '' : Number(value))} />
        </SimpleGrid>
        <Group justify="flex-end">
          <Button leftSection={<IconCheck size={16} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {t('efms.saveSi')}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function HouseBillPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
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

function ContainerPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
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

function DocumentsPanel({
  attachments,
  attachmentsLoading,
  control,
  orderNumber,
}: {
  attachments: LogisticsAttachment[];
  attachmentsLoading: boolean;
  control: EfmsControl;
  orderNumber: string;
}) {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const [documentType, setDocumentType] = useState('Draft B/L');
  const [file, setFile] = useState<File | null>(null);
  const [attachmentHbl, setAttachmentHbl] = useState('');
  const [reviewHbl, setReviewHbl] = useState('');
  const [draftBlAttachmentId, setDraftBlAttachmentId] = useState<string | null>(null);
  const [commercialInvoiceAttachmentId, setCommercialInvoiceAttachmentId] = useState<string | null>(null);
  const [packingListAttachmentId, setPackingListAttachmentId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [crossCheckNotes, setCrossCheckNotes] = useState<Record<string, string>>({});
  const [finalBlByReview, setFinalBlByReview] = useState<Record<string, string | null>>({});

  const attachmentOptions = attachments.map((attachment) => ({
    label: `${attachment.documentType} - ${attachment.fileName}`,
    value: attachment.id,
  }));
  const finalBlOptions = attachments
    .filter((attachment) => ['Final B/L', 'B/L'].includes(attachment.documentType))
    .map((attachment) => ({ label: `${attachment.documentType} - ${attachment.fileName}`, value: attachment.id }));

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error(t('efms.selectFile'));
      }

      return uploadDeliveryOrderAttachment({
        documentType,
        file,
        hblNumber: cleanString(attachmentHbl),
        orderNumber,
      });
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['delivery-order-attachments', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: () =>
      createDocumentReview(orderNumber, {
        commercialInvoiceAttachmentId: commercialInvoiceAttachmentId ?? '',
        draftBlAttachmentId: draftBlAttachmentId ?? '',
        hblNumber: cleanString(reviewHbl),
        notes: cleanString(reviewNotes),
        packingListAttachmentId: packingListAttachmentId ?? '',
      }),
    onSuccess: async () => {
      setDraftBlAttachmentId(null);
      setCommercialInvoiceAttachmentId(null);
      setPackingListAttachmentId(null);
      setReviewNotes('');
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  const crossCheckMutation = useMutation({
    mutationFn: ({ matched, reviewId }: { matched: boolean; reviewId: string }) =>
      confirmDocumentCrossCheck(reviewId, {
        matched,
        notes: cleanString(crossCheckNotes[reviewId] ?? ''),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  const finalBlMutation = useMutation({
    mutationFn: ({ attachmentId, reviewId }: { attachmentId: string; reviewId: string }) =>
      confirmFinalBl(reviewId, { finalBlAttachmentId: attachmentId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  const driveMutation = useMutation({
    mutationFn: () => syncDriveDossier(orderNumber),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
    },
  });

  return (
    <Stack gap="md">
      {(uploadMutation.isError ||
        createReviewMutation.isError ||
        crossCheckMutation.isError ||
        finalBlMutation.isError ||
        driveMutation.isError) ? (
        <Alert color="red" icon={<IconX size={16} />}>
          {getApiErrorMessage(
            uploadMutation.error ??
              createReviewMutation.error ??
              crossCheckMutation.error ??
              finalBlMutation.error ??
              driveMutation.error,
          )}
        </Alert>
      ) : null}

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Text fw={700}>{t('efms.driveDossier')}</Text>
            <Text size="sm" c="dimmed">
              {control.latestDriveDossier
                ? `${control.latestDriveDossier.dossierNumber} - ${statusLabel(control.latestDriveDossier.status)}`
                : t('efms.noDriveDossier')}
            </Text>
            {control.latestDriveDossier?.missingDocuments.length ? (
              <Text size="xs" c="orange" mt={4}>
                {t('efms.missingDriveDocuments')}: {control.latestDriveDossier.missingDocuments.join(', ')}
              </Text>
            ) : null}
            {control.latestDriveDossier?.errorMessage ? (
              <Text size="xs" c="red" mt={4}>
                {control.latestDriveDossier.errorMessage}
              </Text>
            ) : null}
          </div>
          <Button
            variant="light"
            leftSection={<IconFileUpload size={16} />}
            loading={driveMutation.isPending}
            onClick={() => driveMutation.mutate()}
          >
            {t('efms.syncDriveDossier')}
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={700}>{t('efms.uploadDocument')}</Text>
            {attachmentsLoading ? <Loader size="sm" /> : null}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label={t('efms.documentType')} data={documentTypeOptions} value={documentType} onChange={(value) => setDocumentType(value ?? 'Draft B/L')} />
            <TextInput label={t('efms.attachmentHbl')} value={attachmentHbl} onChange={(event) => setAttachmentHbl(event.currentTarget.value)} />
            <FileInput
              accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
              clearable
              label={t('efms.selectFile')}
              leftSection={<IconFileUpload size={16} />}
              value={file}
              onChange={setFile}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button leftSection={<IconFileUpload size={16} />} loading={uploadMutation.isPending} disabled={!file} onClick={() => uploadMutation.mutate()}>
              {t('efms.upload')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Stack gap="md">
          <Text fw={700}>{t('efms.reviewTitle')}</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.hblNumber')} value={reviewHbl} onChange={(event) => setReviewHbl(event.currentTarget.value)} />
            <Select label={t('efms.draftBl')} data={attachmentOptions} value={draftBlAttachmentId} onChange={setDraftBlAttachmentId} searchable />
            <Select label={t('efms.commercialInvoice')} data={attachmentOptions} value={commercialInvoiceAttachmentId} onChange={setCommercialInvoiceAttachmentId} searchable />
            <Select label={t('efms.packingList')} data={attachmentOptions} value={packingListAttachmentId} onChange={setPackingListAttachmentId} searchable />
          </SimpleGrid>
          <Textarea label={t('efms.notes')} value={reviewNotes} onChange={(event) => setReviewNotes(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button
              leftSection={<IconPlus size={16} />}
              loading={createReviewMutation.isPending}
              disabled={!draftBlAttachmentId || !commercialInvoiceAttachmentId || !packingListAttachmentId}
              onClick={() => createReviewMutation.mutate()}
            >
              {t('efms.createReview')}
            </Button>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={980} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.hblNumber')}</Table.Th>
              <Table.Th>{t('common.status')}</Table.Th>
              <Table.Th>SLA</Table.Th>
              <Table.Th>{t('common.deadline')}</Table.Th>
              <Table.Th>{t('efms.notes')}</Table.Th>
              <Table.Th>{t('common.action')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {control.documentReviews.map((review) => (
              <Table.Tr key={review.id}>
                <Table.Td>{review.hblNumber ?? '-'}</Table.Td>
                <Table.Td>
                  <StatusBadge status={review.status} />
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={review.slaStatus} />
                </Table.Td>
                <Table.Td>{formatDateTime(review.crossCheckDueAt)}</Table.Td>
                <Table.Td>
                  <Textarea
                    minRows={1}
                    value={crossCheckNotes[review.id] ?? review.notes ?? ''}
                    onChange={(event) =>
                      setCrossCheckNotes((current) => ({
                        ...current,
                        [review.id]: event.currentTarget.value,
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="teal"
                        loading={crossCheckMutation.isPending}
                        onClick={() => crossCheckMutation.mutate({ matched: true, reviewId: review.id })}
                      >
                        {t('efms.crossCheckMatched')}
                      </Button>
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="red"
                        loading={crossCheckMutation.isPending}
                        onClick={() => crossCheckMutation.mutate({ matched: false, reviewId: review.id })}
                      >
                        {t('efms.crossCheckMismatch')}
                      </Button>
                    </Group>
                    <Group gap="xs" wrap="nowrap">
                      <Select
                        data={finalBlOptions}
                        placeholder={t('efms.finalBl')}
                        value={finalBlByReview[review.id] ?? null}
                        onChange={(value) => setFinalBlByReview((current) => ({ ...current, [review.id]: value }))}
                        searchable
                      />
                      <Button
                        size="compact-xs"
                        disabled={review.status !== 'DRAFT_BL_CONFIRMED' || !finalBlByReview[review.id]}
                        loading={finalBlMutation.isPending}
                        onClick={() => {
                          const attachmentId = finalBlByReview[review.id];
                          if (attachmentId) {
                            finalBlMutation.mutate({ attachmentId, reviewId: review.id });
                          }
                        }}
                      >
                        {t('efms.confirmFinalBl')}
                      </Button>
                    </Group>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {control.documentReviews.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noReviews')}</Text> : null}
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={900} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('efms.documentType')}</Table.Th>
              <Table.Th>{t('efms.attachmentHbl')}</Table.Th>
              <Table.Th>{t('common.source')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {attachments.map((attachment) => (
              <Table.Tr key={attachment.id}>
                <Table.Td>{attachment.documentType}</Table.Td>
                <Table.Td>{attachment.hblNumber ?? '-'}</Table.Td>
                <Table.Td>
                  <Text size="sm" fw={600}>{attachment.fileName}</Text>
                  <Text size="xs" c="dimmed">{formatBytes(attachment.size)} - {formatDateTime(attachment.uploadedAt)}</Text>
                </Table.Td>
                <Table.Td>
                  <Button
                    component="a"
                    href={attachment.storageUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="compact-xs"
                    variant="subtle"
                    rightSection={<IconExternalLink size={12} />}
                  >
                    {t('deliveryOrders.openAttachment')}
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        {attachments.length === 0 ? <Text p="md" size="sm" c="dimmed">{t('efms.noAttachments')}</Text> : null}
      </Paper>

      <Text size="xs" c="dimmed">
        {statusLabel('READY_FOR_CHECK')} / {statusLabel('DRAFT_BL_CONFIRMED')} / {statusLabel('FINAL_BL_CONFIRMED')}
      </Text>
    </Stack>
  );
}

function CustomsPanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const customs = control.customs;
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [channel, setChannel] = useState<CustomsChannel | null>('GREEN');
  const [status, setStatus] = useState<CustomsStatus>('DRAFT');
  const [laneStatus, setLaneStatus] = useState<CustomsLaneStatus | null>('GREEN_CLEARANCE');
  const [telexReleased, setTelexReleased] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setDeclarationNumber(customs?.declarationNumber ?? '');
    setChannel(customs?.channel ?? 'GREEN');
    setStatus(customs?.status ?? 'DRAFT');
    setLaneStatus(customs?.laneStatus ?? 'GREEN_CLEARANCE');
    setTelexReleased(customs?.telexReleased ?? false);
    setNotes(customs?.notes ?? '');
  }, [customs]);

  const mutation = useMutation({
    mutationFn: () =>
      updateCustoms(orderNumber, {
        channel,
        declarationNumber: cleanString(declarationNumber),
        laneStatus,
        notes: cleanString(notes),
        status,
        telexReleased,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['efms-control', orderNumber] });
      await queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    },
  });

  return (
    <Stack gap="md">
      {mutation.isError ? (
        <Alert color="red" icon={<IconX size={16} />}>
          {getApiErrorMessage(mutation.error)}
        </Alert>
      ) : null}
      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-start" mb="md">
          <div>
            <Text fw={700}>{t('efms.customsTitle')}</Text>
            <Text size="sm" c="dimmed">
              {customs ? statusLabel(customs.status) : t('efms.noCustoms')}
            </Text>
            {customs?.nextAction ? (
              <Text size="xs" c="dimmed" mt={4}>
                {t('efms.nextCustomsAction')}: {customs.nextAction}
              </Text>
            ) : null}
          </div>
          <Group gap="xs">
            {customs?.laneStatus ? <StatusBadge status={customs.laneStatus} /> : null}
            <Badge color={customs?.canDispatch ? 'teal' : 'orange'} variant="light">
              {customs?.canDispatch ? t('efms.canDispatch') : t('efms.cannotDispatch')}
            </Badge>
          </Group>
        </Group>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t('efms.declarationNumber')} value={declarationNumber} onChange={(event) => setDeclarationNumber(event.currentTarget.value)} />
            <Select
              label={t('efms.channel')}
              data={customsChannelOptions}
              value={channel}
              onChange={(value) => setChannel((value as CustomsChannel | null) ?? null)}
            />
            <Select
              label={t('efms.customsStatus')}
              data={customsStatusOptions}
              value={status}
              onChange={(value) => setStatus((value ?? 'DRAFT') as CustomsStatus)}
            />
            <Select
              label={t('efms.laneStatus')}
              data={customsLaneStatusOptions}
              value={laneStatus}
              onChange={(value) => setLaneStatus((value as CustomsLaneStatus | null) ?? null)}
            />
            <Switch label={t('efms.telexReleased')} checked={telexReleased} onChange={(event) => setTelexReleased(event.currentTarget.checked)} />
          </SimpleGrid>
          <Textarea label={t('efms.notes')} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          <Group justify="flex-end">
            <Button leftSection={<IconCheck size={16} />} loading={mutation.isPending} onClick={() => mutation.mutate()}>
              {t('efms.saveCustoms')}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

function FinancePanel({ control, orderNumber }: { control: EfmsControl; orderNumber: string }) {
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600} component="div">
        {value}
      </Text>
    </Paper>
  );
}

function cleanString(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalInput(value: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    return null;
  }
  const date = new Date(cleaned);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toNumberInputValue(value: number | string | null | undefined): number | '' {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : '';
}

function formatOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
}

function formatMoney(amount: number | string, currency: string) {
  const numeric = Number(amount);
  const value = Number.isFinite(numeric) ? numeric.toLocaleString() : String(amount);
  return `${value} ${currency}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
