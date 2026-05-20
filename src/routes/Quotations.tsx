import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconCheck,
  IconClockHour4,
  IconClipboardCheck,
  IconEye,
  IconPlus,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

import {
  confirmQuotationBooking,
  createQuotation,
  fetchQuotations,
  updateQuotationAction,
  type CreateQuotationPayload,
  type Quotation,
  type QuotationAction,
  type QuotationStatus,
  type ShippingMode,
} from '../api/logistics';
import { getApiErrorMessage } from '../api/http';
import { ListPagination, useListPagination } from '../components/ListPagination';
import { StatusBadge } from '../components/StatusBadge';
import { useI18n, type MessageKey } from '../i18n';

const shippingModeOptions: Array<{ label: string; value: ShippingMode }> = [
  { label: 'AIR', value: 'AIR' },
  { label: 'FCL', value: 'FCL' },
  { label: 'LCL', value: 'LCL' },
];

const quotationActionLabels: Record<QuotationAction, { key: MessageKey; color: string; icon: React.ElementType }> = {
  SEND_PRELIMINARY: { key: 'quotations.actionSendPreliminary', color: 'blue', icon: IconSend },
  SEND_OFFICIAL: { key: 'quotations.actionSendOfficial', color: 'indigo', icon: IconSend },
  CUSTOMER_APPROVED: { key: 'quotations.actionCustomerApproved', color: 'teal', icon: IconCheck },
  CUSTOMER_REJECTED: { key: 'quotations.actionCustomerRejected', color: 'red', icon: IconX },
  REVISION_REQUESTED: { key: 'quotations.actionRevisionRequested', color: 'orange', icon: IconClipboardCheck },
};

export function Quotations() {
  const { statusLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const [createOpened, createHandlers] = useDisclosure(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const quotationsQuery = useQuery({
    queryKey: ['quotations'],
    queryFn: fetchQuotations,
  });

  const quotations = quotationsQuery.data ?? [];
  const filteredQuotations = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return quotations.filter((quotation) => {
      const haystack = [
        quotation.quoteNumber,
        quotation.requestCode,
        quotation.shippingMode,
        quotation.status,
        quotation.bookingNumber ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [quotations, search]);
  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleQuotations,
  } = useListPagination(filteredQuotations, [search]);

  const selectedQuotation = selectedId
    ? filteredQuotations.find((item) => item.id === selectedId) ?? quotations.find((item) => item.id === selectedId) ?? null
    : null;

  const createMutation = useMutation({
    mutationFn: (payload: CreateQuotationPayload) => createQuotation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
      createHandlers.close();
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ quotationId, action }: { quotationId: string; action: QuotationAction }) =>
      updateQuotationAction(quotationId, { action }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const bookingMutation = useMutation({
    mutationFn: ({ quotationId, bookingNumber }: { quotationId: string; bookingNumber: string }) =>
      confirmQuotationBooking(quotationId, { bookingNumber }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  if (quotationsQuery.isError) {
    return (
      <Paper withBorder p="lg">
        <Alert color="red" title={t('quotations.errorTitle')}>
          {t('quotations.errorDescription')}
        </Alert>
      </Paper>
    );
  }

  const handleCreateClose = () => {
    createMutation.reset();
    createHandlers.close();
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <div>
          <Title order={1}>{t('quotations.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('quotations.subtitle')}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={createHandlers.open}>
          {t('quotations.create')}
        </Button>
      </Group>

      <Paper withBorder p="md">
        <Group justify="space-between" align="flex-end">
          <TextInput
            label={t('common.search')}
            placeholder={t('quotations.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {quotationsQuery.isFetching ? <Loader size="sm" /> : null}
        </Group>
      </Paper>

      <Paper withBorder p={0}>
        <Table miw={960} verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('quotations.quoteNumber')}</Table.Th>
              <Table.Th>{t('quotations.requestCode')}</Table.Th>
              <Table.Th>{t('quotations.shippingMode')}</Table.Th>
              <Table.Th>{t('quotations.quoteAmount')}</Table.Th>
              <Table.Th>{t('quotations.sla')}</Table.Th>
              <Table.Th>{t('common.status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleQuotations.map((quotation) => {
              const slaInfo = getSlaInfo(quotation);
              const isOverdue = slaInfo?.dueAt ? dayjs(slaInfo.dueAt).isBefore(dayjs()) : false;

              return (
                <Table.Tr key={quotation.id}>
                  <Table.Td>
                    <Text fw={700}>{quotation.quoteNumber}</Text>
                    <Text size="xs" c="dimmed">
                      {quotation.bookingNumber
                        ? t('quotations.bookingNumberValue', { value: quotation.bookingNumber })
                        : t('quotations.bookingPending')}
                    </Text>
                  </Table.Td>
                  <Table.Td>{quotation.requestCode}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{quotation.shippingMode}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600}>
                      {quotation.quoteAmount !== null && quotation.quoteAmount !== undefined
                        ? quotation.quoteAmount.toLocaleString()
                        : '-'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {quotation.currency ?? '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {slaInfo ? (
                      <Group gap="xs" wrap="nowrap">
                        <Badge color={isOverdue ? 'red' : 'orange'} variant="light">
                          {t(slaInfo.labelKey)}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {dayjs(slaInfo.dueAt).format('HH:mm DD/MM')}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t('quotations.slaNotApplicable')}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={quotation.status} />
                  </Table.Td>
                  <Table.Td>
                    <Tooltip label={t('quotations.inspect')}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t('quotations.inspect')}
                        onClick={() => setSelectedId(quotation.id)}
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        {filteredQuotations.length === 0 ? (
          <Text size="sm" c="dimmed" p="md">
            {t('quotations.emptyDescription')}
          </Text>
        ) : null}
        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={filteredQuotations.length}
        />
      </Paper>

      <Drawer
        opened={createOpened}
        onClose={handleCreateClose}
        position="right"
        size="lg"
        title={t('quotations.createTitle')}
      >
        <CreateQuotationForm
          key={createOpened ? 'open' : 'closed'}
          loading={createMutation.isPending}
          error={createMutation.isError ? getApiErrorMessage(createMutation.error) : null}
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </Drawer>

      <Drawer
        opened={Boolean(selectedQuotation)}
        onClose={() => setSelectedId(null)}
        position="right"
        size="lg"
        title={t('quotations.detailTitle')}
      >
        {selectedQuotation ? (
          <QuotationDetail
            quotation={selectedQuotation}
            statusLabel={statusLabel}
            onAction={(action) => updateActionMutation.mutate({ quotationId: selectedQuotation.id, action })}
            actionLoading={updateActionMutation.isPending}
            onConfirmBooking={(bookingNumber) =>
              bookingMutation.mutate({ quotationId: selectedQuotation.id, bookingNumber })
            }
            bookingLoading={bookingMutation.isPending}
          />
        ) : null}
      </Drawer>
    </Stack>
  );
}

function CreateQuotationForm({
  error,
  loading,
  onSubmit,
}: {
  error: string | null;
  loading: boolean;
  onSubmit: (payload: CreateQuotationPayload) => void;
}) {
  const { t } = useI18n();
  const [requestCode, setRequestCode] = useState('');
  const [shippingMode, setShippingMode] = useState<ShippingMode>('AIR');
  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');

  return (
    <Stack gap="md">
      {error ? (
        <Alert color="red" icon={<IconX size={16} />}>
          {error}
        </Alert>
      ) : null}
      <TextInput
        label={t('quotations.requestCode')}
        placeholder="PR-2026-0001"
        value={requestCode}
        onChange={(event) => setRequestCode(event.currentTarget.value)}
      />
      <Select
        label={t('quotations.shippingMode')}
        data={shippingModeOptions}
        value={shippingMode}
        onChange={(value) => setShippingMode((value ?? 'AIR') as ShippingMode)}
      />
      <NumberInput
        label={t('quotations.quoteAmount')}
        min={0}
        thousandSeparator=","
        value={quoteAmount}
        onChange={(value) => setQuoteAmount(value === '' ? '' : Number(value))}
      />
      <TextInput
        label={t('quotations.currency')}
        placeholder="USD"
        value={currency}
        onChange={(event) => setCurrency(event.currentTarget.value)}
      />
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {t('quotations.createHint')}
        </Text>
        <Button
          leftSection={<IconPlus size={14} />}
          loading={loading}
          onClick={() =>
            onSubmit({
              requestCode: requestCode.trim(),
              shippingMode,
              quoteAmount: quoteAmount === '' ? null : Number(quoteAmount),
              currency: currency.trim().length > 0 ? currency.trim().toUpperCase() : null,
            })
          }
          disabled={requestCode.trim().length === 0}
        >
          {t('quotations.create')}
        </Button>
      </Group>
    </Stack>
  );
}

function QuotationDetail({
  quotation,
  statusLabel,
  actionLoading,
  bookingLoading,
  onAction,
  onConfirmBooking,
}: {
  quotation: Quotation;
  statusLabel: (status: string) => string;
  actionLoading: boolean;
  bookingLoading: boolean;
  onAction: (action: QuotationAction) => void;
  onConfirmBooking: (bookingNumber: string) => void;
}) {
  const { t } = useI18n();
  const [bookingNumber, setBookingNumber] = useState('');
  const slaInfo = getSlaInfo(quotation);
  const canConfirmBooking = quotation.status === 'APPROVED' || quotation.status === 'BOOKED';
  const actionOptions = getAvailableActions(quotation.status);

  return (
    <Stack gap="md">
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Info label={t('quotations.quoteNumber')} value={quotation.quoteNumber} />
          <Info label={t('quotations.requestCode')} value={quotation.requestCode} />
          <Info label={t('quotations.shippingMode')} value={quotation.shippingMode} />
          <Info label={t('quotations.status')} value={statusLabel(quotation.status)} />
          <Info label={t('quotations.preliminaryDue')} value={formatDateTime(quotation.preliminaryDueAt)} />
          <Info label={t('quotations.officialDue')} value={formatDateTime(quotation.officialDueAt)} />
          <Info label={t('quotations.autoApproveAt')} value={quotation.autoApproveAt ? formatDateTime(quotation.autoApproveAt) : '-'} />
          <Info
            label={t('quotations.quoteAmount')}
            value={
              quotation.quoteAmount !== null && quotation.quoteAmount !== undefined
                ? quotation.quoteAmount.toLocaleString()
                : '-'
            }
          />
          <Info label={t('quotations.currency')} value={quotation.currency ?? '-'} />
          <Info label={t('quotations.bookingNumber')} value={quotation.bookingNumber ?? '-'} />
        </SimpleGrid>
      </Paper>

      <Paper withBorder p="md">
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Text fw={700}>{t('quotations.sla')}</Text>
          <Badge
            leftSection={<IconClockHour4 size={12} />}
            color={slaInfo?.dueAt && dayjs(slaInfo.dueAt).isBefore(dayjs()) ? 'red' : 'orange'}
            variant="light"
          >
            {slaInfo ? `${t(slaInfo.labelKey)} · ${formatDateTime(slaInfo.dueAt)}` : t('quotations.slaNotApplicable')}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {t('quotations.slaHint')}
        </Text>
      </Paper>

      {actionOptions.length > 0 ? (
        <Paper withBorder p="md">
          <Text fw={700} mb="sm">
            {t('quotations.actions')}
          </Text>
          <Group gap="xs" wrap="wrap">
            {actionOptions.map((action) => {
              const config = quotationActionLabels[action];
              const Icon = config.icon;

              return (
                <Button
                  key={action}
                  variant="light"
                  color={config.color}
                  leftSection={<Icon size={14} />}
                  loading={actionLoading}
                  onClick={() => onAction(action)}
                >
                  {t(config.key)}
                </Button>
              );
            })}
          </Group>
        </Paper>
      ) : null}

      <Paper withBorder p="md">
        <Text fw={700} mb="sm">
          {t('quotations.bookingSection')}
        </Text>
        <Stack gap="sm">
          <TextInput
            label={t('quotations.bookingNumber')}
            placeholder="BK-2026-0001"
            value={bookingNumber}
            onChange={(event) => setBookingNumber(event.currentTarget.value)}
            disabled={!canConfirmBooking || quotation.status === 'BOOKED'}
          />
          <Button
            leftSection={<IconCheck size={14} />}
            disabled={!canConfirmBooking || bookingNumber.trim().length === 0 || quotation.status === 'BOOKED'}
            loading={bookingLoading}
            onClick={() => onConfirmBooking(bookingNumber.trim())}
          >
            {quotation.status === 'BOOKED' ? t('quotations.bookingLocked') : t('quotations.confirmBooking')}
          </Button>
          {!canConfirmBooking ? (
            <Text size="sm" c="dimmed">
              {t('quotations.bookingDisabledHint')}
            </Text>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}

function getAvailableActions(status: QuotationStatus): QuotationAction[] {
  if (status === 'BOOKED') {
    return [];
  }

  const actions: QuotationAction[] = [];

  if (status === 'DRAFT' || status === 'REVISION_REQUESTED') {
    actions.push('SEND_PRELIMINARY');
  }

  if (['DRAFT', 'PRELIMINARY_SENT', 'REVISION_REQUESTED'].includes(status)) {
    actions.push('SEND_OFFICIAL');
  }

  if (status === 'OFFICIAL_SENT') {
    actions.push('CUSTOMER_APPROVED', 'CUSTOMER_REJECTED', 'REVISION_REQUESTED');
  }

  return actions;
}

function getSlaInfo(quotation: Quotation): { labelKey: MessageKey; dueAt: string } | null {
  if (['DRAFT', 'PRELIMINARY_SENT', 'REVISION_REQUESTED'].includes(quotation.status)) {
    return { labelKey: 'quotations.slaPreliminary', dueAt: quotation.preliminaryDueAt };
  }

  if (quotation.status === 'OFFICIAL_SENT') {
    return { labelKey: 'quotations.slaOfficial', dueAt: quotation.officialDueAt };
  }

  return null;
}

function formatDateTime(value: string) {
  return dayjs(value).format('HH:mm DD/MM/YYYY');
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
