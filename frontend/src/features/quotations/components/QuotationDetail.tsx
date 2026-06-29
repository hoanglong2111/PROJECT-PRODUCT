import { Alert, Button, Divider, Group, Paper, SimpleGrid, Stack, Table, Text, Textarea, Title } from '@mantine/core';
import { IconArrowLeft, IconShoppingCart } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  markQuotationFinal,
  receiveQuotation,
  rejectQuotation,
  submitQuotationToKbi,
  type QuotationV1,
} from '@shared/api/quotations';
import { queryKeys } from '@shared/api/queryKeys';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { quotationTotal } from '../model/quotationModel';

function formatMoney(amount: number, currency: string | null | undefined): string {
  return `${new Intl.NumberFormat('en-US').format(Math.round(amount))} ${currency ?? ''}`.trim();
}

type QuotationDetailProps = {
  quotation: QuotationV1;
  onBack: () => void;
};

export function QuotationDetail({ quotation, onBack }: QuotationDetailProps) {
  const { t, statusLabel } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quotations });
  };

  const transitionMutation = useMutation({
    mutationFn: (next: 'draft' | 'submit' | 'confirm') => {
      if (next === 'draft') return receiveQuotation(quotation.id);
      if (next === 'submit') return submitQuotationToKbi(quotation.id);
      return markQuotationFinal(quotation.id);
    },
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectQuotation(quotation.id, { reason: rejectReason.trim() || undefined }),
    onSuccess: invalidate,
  });

  const status = quotation.status;
  const canReject = status === 'REQUEST_FOR_QUOTATION' || status === 'DRAFT' || status === 'PENDING_APPROVAL';
  const total = quotationTotal(quotation);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Group gap="xs" align="center">
          <Button variant="subtle" size="sm" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
            {t('common.backToList')}
          </Button>
          <Text c="dimmed" size="sm">·</Text>
          <Text fw={600} size="sm">{quotation.quotation_no}</Text>
        </Group>
        <StatusBadge status={status} />
      </Group>

      <Paper withBorder p="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>{quotation.quotation_no}</Title>
            <Text c="dimmed" size="sm">
              {quotation.customer_ref ?? '—'}
            </Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} mt="md">
          <Field label={t('quotations.incoterm')} value={quotation.incoterm_code ?? '—'} />
          <Field label={t('quotations.mode')} value={quotation.mode ?? '—'} />
          <Field label={t('quotations.currency')} value={quotation.currency_code ?? '—'} />
          <Field label={t('quotations.validUntil')} value={quotation.valid_until ?? '—'} />
        </SimpleGrid>
      </Paper>

      {status === 'REJECTED' && quotation.reject_reason ? (
        <Alert color="red" title={t('quotations.rejectReason')}>
          {quotation.reject_reason}
        </Alert>
      ) : null}

      <Paper withBorder p="lg">
        <Text fw={700} mb="sm">{t('quotations.chargeBreakdown')}</Text>
        {(quotation.charge_lines ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">{t('quotations.noChargeLines')}</Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('quotations.chargeBreakdown')}</Table.Th>
                <Table.Th ta="right">{t('quotations.chargeAmount')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(quotation.charge_lines ?? []).map((line) => (
                <Table.Tr key={line.id}>
                  <Table.Td>{line.description ?? line.charge_type}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">
                    {formatMoney(Number(line.total_amount ?? line.amount ?? 0), quotation.currency_code)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        <Divider my="sm" />
        <Group justify="space-between">
          <Text fw={700}>{t('quotations.total')}</Text>
          <Text fw={700} className="tabular-nums">{formatMoney(total, quotation.currency_code)}</Text>
        </Group>
      </Paper>

      <Paper withBorder p="lg">
        <Text fw={700} mb="sm">{t('quotations.actions')}</Text>
        {status === 'CONFIRMED' ? (
          <Button
            leftSection={<IconShoppingCart size={16} />}
            onClick={() => navigate(`/purchase-orders?create=1&fromQuotation=${quotation.id}`)}
          >
            {t('quotations.createPo')}
          </Button>
        ) : (
          <Stack gap="sm">
            <Group gap="sm">
              {status === 'REQUEST_FOR_QUOTATION' ? (
                <Button loading={transitionMutation.isPending} onClick={() => transitionMutation.mutate('draft')}>
                  {t('quotations.actionStartDraft')}
                </Button>
              ) : null}
              {status === 'DRAFT' ? (
                <Button loading={transitionMutation.isPending} onClick={() => transitionMutation.mutate('submit')}>
                  {t('quotations.actionSubmitApproval')}
                </Button>
              ) : null}
              {status === 'PENDING_APPROVAL' ? (
                <Button loading={transitionMutation.isPending} onClick={() => transitionMutation.mutate('confirm')}>
                  {t('quotations.actionConfirm')}
                </Button>
              ) : null}
            </Group>
            {canReject ? (
              <Stack gap={4} maw={420}>
                <Textarea
                  label={t('quotations.rejectReason')}
                  placeholder={t('quotations.rejectReasonPlaceholder')}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.currentTarget.value)}
                  autosize
                  minRows={2}
                />
                <Button
                  color="red"
                  variant="light"
                  loading={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate()}
                >
                  {t('quotations.actionReject')}
                </Button>
              </Stack>
            ) : null}
            <Text size="xs" c="dimmed">
              {t('quotations.confirmedNeededForPo')} ({statusLabel('CONFIRMED')})
            </Text>
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" fw={600}>{value}</Text>
    </div>
  );
}
