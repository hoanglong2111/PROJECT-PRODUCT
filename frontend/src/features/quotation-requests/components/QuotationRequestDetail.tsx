import { Badge, Button, Group, Paper, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { IconBan, IconCheck, IconCopy, IconExternalLink, IconFileInvoice, IconSend } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  buildRfqRouteLabel,
  cancelQuotationRequest,
  fetchQuotationRequest,
  receiveQuotationRequest,
} from '@shared/api/quotationRequests';
import { queryKeys } from '@shared/api/queryKeys';
import { CopyValue } from '@shared/components/CopyValue';
import { FieldPair } from '@shared/components/FieldPair';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import { formatDate } from '@shared/utils/date';
import { formatMoney } from '@shared/utils/money';

import { rfqStatusColor, rfqTotalWeight } from '../model/quotationRequestModel';

type QuotationRequestDetailProps = {
  requestId: string;
  onBack: () => void;
};

export function QuotationRequestDetail({ onBack, requestId }: QuotationRequestDetailProps) {
  const { statusLabel, t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const requestQuery = useQuery({
    queryKey: queryKeys.quotationRequestDetail(requestId),
    queryFn: () => fetchQuotationRequest(requestId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequests });
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotationRequestDetail(requestId) });
  };

  const receiveMutation = useMutation({
    mutationFn: () => receiveQuotationRequest(requestId),
    onSuccess: invalidate,
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelQuotationRequest(requestId),
    onSuccess: invalidate,
  });

  if (requestQuery.isLoading) {
    return <PageLoading title={t('quotationRequests.detailTitle')} description={t('quotationRequests.loadingDescription')} />;
  }

  if (requestQuery.isError || !requestQuery.data) {
    return (
      <PageError
        title={t('quotationRequests.errorTitle')}
        description={t('quotationRequests.errorDescription')}
        error={requestQuery.error}
        onRetry={() => {
          void requestQuery.refetch();
        }}
      />
    );
  }

  const request = requestQuery.data;
  const canReceive = request.status === 'SUBMITTED';
  const canCreateQuotation = request.status === 'SUBMITTED' || request.status === 'RECEIVED';
  const canCancel = request.status !== 'CONFIRMED' && request.status !== 'CANCELLED';
  const totalWeight = rfqTotalWeight(request.lines ?? []) || Number(request.gross_weight_kg ?? 0);

  return (
    <Stack gap="md" className="rfq-detail">
      <Paper withBorder p={0} className="rfq-detail-hero">
        <div className="rfq-detail-hero-main">
          <Group justify="space-between" align="flex-start" className="rfq-detail-hero-inner">
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <div className="rfq-icon-box">
                <IconFileInvoice size={18} />
              </div>
              <div>
                <Group gap="xs">
                  <Title order={3}>
                    <CopyValue value={request.rfq_no}>{request.rfq_no}</CopyValue>
                  </Title>
                  <Badge color={rfqStatusColor(request.status)} variant="light">
                    {t(`quotationRequests.status.${request.status}` as never)}
                  </Badge>
                </Group>
                <Text c="dimmed" size="xs" mt={3}>
                  {t(`quotationRequests.statusHint.${request.status}` as never)}
                </Text>
                <Text c="dimmed" size="sm">{request.customer_po_ref ?? request.customer_ref ?? '-'}</Text>
              </div>
            </Group>
            <Group gap="xs">
              <Button variant="light" onClick={onBack}>{t('common.backToList')}</Button>
              <Button
                variant="light"
                leftSection={<IconCopy size={16} />}
                onClick={() => navigate(`/quotation-requests?create=1&copyFrom=${request.id}`)}
              >
                {t('quotationRequests.copy')}
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                disabled={!canReceive}
                loading={receiveMutation.isPending}
                onClick={() => receiveMutation.mutate()}
              >
                {t('quotationRequests.receive')}
              </Button>
              <Button
                leftSection={<IconSend size={16} />}
                disabled={!canCreateQuotation}
                onClick={() => navigate(`/quotations?create=1&rfq=${request.id}`)}
              >
                {t('quotationRequests.createQuotation')}
              </Button>
              <Button
                color="red"
                variant="light"
                leftSection={<IconBan size={16} />}
                disabled={!canCancel}
                loading={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {t('quotationRequests.cancel')}
              </Button>
            </Group>
          </Group>
        </div>

        <div className="rfq-detail-fact-strip">
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.customerRef')} value={request.customer_ref ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.customerPoRef')} value={request.customer_po_ref ?? '-'} />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.customerContractRef')}
            value={request.customer_contract_ref ?? '-'}
          />
          <FieldPair
            className="rfq-fact"
            label={t('quotationRequests.field.supplier')}
            value={request.supplier ? `${request.supplier.supplier_code} - ${request.supplier.supplier_name}` : request.supplier_id ?? '-'}
          />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.route')} value={buildRfqRouteLabel(request)} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.mode')} value={request.mode ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.incoterm')} value={request.incoterm_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotations.currency')} value={request.currency_code ?? '-'} />
          <FieldPair className="rfq-fact" label={t('quotationRequests.field.readyDate')} value={formatDate(request.desired_cargo_ready_date)} />
        </div>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p="md">
          <Title order={4} mb="sm">{t('quotationRequests.cargoSummary')}</Title>
          <SimpleGrid cols={3}>
            <FieldPair label={t('quotationRequests.field.weight')} value={`${totalWeight || '-'} kg`} />
            <FieldPair label={t('quotationRequests.field.volume')} value={`${request.volume_cbm ?? '-'} cbm`} />
            <FieldPair label={t('quotationRequests.field.container')} value={request.container_type ?? '-'} />
          </SimpleGrid>
          <Text mt="md" size="sm" c="dimmed">{request.note ?? '-'}</Text>
        </Paper>

        <Paper withBorder p={0} className="dl-data-panel">
          <div className="rfq-panel-head">
            <Title order={4}>{t('quotationRequests.field.lines')}</Title>
          </div>
          <Table.ScrollContainer minWidth={760}>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{t('quotationRequests.field.item')}</Table.Th>
                  <Table.Th>{t('quotationRequests.field.itemDescription')}</Table.Th>
                  <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
                  <Table.Th>{t('forms.unit')}</Table.Th>
                  <Table.Th ta="right">{t('quotationRequests.field.lineWeight')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(request.lines ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}><Text c="dimmed" size="sm">-</Text></Table.Td>
                  </Table.Tr>
                ) : (
                  request.lines?.map((line) => (
                    <Table.Tr key={line.id}>
                      <Table.Td>{line.line_no}</Table.Td>
                      <Table.Td>{line.item?.item_code ?? line.item_id ?? '-'}</Table.Td>
                      <Table.Td>{line.item_description ?? line.item?.item_name_en ?? line.item?.item_name ?? '-'}</Table.Td>
                      <Table.Td ta="right" className="tabular-nums">{line.qty ?? '-'}</Table.Td>
                      <Table.Td>{line.unit ?? '-'}</Table.Td>
                      <Table.Td ta="right" className="tabular-nums">{line.gross_weight_kg ?? '-'}</Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p={0} className="dl-data-panel">
        <div className="rfq-panel-head">
          <div>
            <Text fw={800}>{t('quotationRequests.linkedQuotations')}</Text>
            <Text size="xs" c="dimmed">{t('quotationRequests.noLinkedQuotations')}</Text>
          </div>
        </div>
        <Table.ScrollContainer minWidth={1180}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('quotations.quoteNumber')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.createdDate')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.grandTotal')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.modeIncoterm')}</Table.Th>
                <Table.Th>{t('quotationRequests.response.recommendedOption')}</Table.Th>
                <Table.Th ta="right">{t('quotationRequests.response.optionCount')}</Table.Th>
                <Table.Th>{t('quotations.validUntil')}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(request.quotations ?? []).length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" size="sm">{t('quotationRequests.noLinkedQuotations')}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                request.quotations?.map((quotation) => {
                  const recommendedOption = quotation.options?.find((option) => option.is_recommended)
                    ?? quotation.options?.find((option) => option.is_selected)
                    ?? null;

                  return (
                    <Table.Tr key={quotation.id}>
                      <Table.Td>
                        <Text fw={700} size="sm">{quotation.quotation_no}</Text>
                      </Table.Td>
                      <Table.Td>{formatDate(quotation.create_at)}</Table.Td>
                      <Table.Td>{statusLabel(quotation.status)}</Table.Td>
                      <Table.Td className="tabular-nums">
                        {formatMoney(quotation.grand_total_amount, quotation.currency_code)}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{quotation.mode ?? '-'}</Text>
                        <Text size="xs" c="dimmed">{quotation.incoterm_code ?? '-'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {recommendedOption?.carrier_name ?? recommendedOption?.carrier_code ?? '-'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {recommendedOption
                            ? `${recommendedOption.transit_time_days ?? '-'}d / ETD ${formatDate(recommendedOption.etd)} / ETA ${formatDate(recommendedOption.eta)}`
                            : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right" className="tabular-nums">
                        {quotation.options?.length ?? 0}
                      </Table.Td>
                      <Table.Td>{formatDate(quotation.valid_until)}</Table.Td>
                      <Table.Td ta="right">
                        <Button
                          size="xs"
                          variant="light"
                          rightSection={<IconExternalLink size={14} />}
                          onClick={() => navigate(`/quotations?view=${quotation.id}`)}
                        >
                          {t('common.view')}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
}
