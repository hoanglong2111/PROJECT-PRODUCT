import {
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
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconCheck, IconExternalLink, IconFileUpload, IconPlus, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@shared/api/http';
import {
  confirmDocumentCrossCheck,
  confirmFinalBl,
  createAdvanceSettlement,
  createCharge,
  createContainer,
  createDocumentReview,
  createHouseBill,
  deleteCharge,
  issueFinanceNote,
  sendFinanceNoteToAccounting,
  syncDriveDossier,
  updateAdvanceSettlementStatus,
  updateCharge,
  updateCustoms,
  updateShippingInstruction,
  uploadDeliveryOrderAttachment,
  type AdvanceSettlementStatus,
  type CustomsChannel,
  type CustomsLaneStatus,
  type CustomsStatus,
  type DeliveryOrder,
  type EfmsControl,
  type FinanceChargeType,
  type LogisticsAttachment,
  type MblType,
  type TaskRole,
} from '@shared/api/logistics';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import {
  advanceRoleOptions,
  chargeTypeOptions,
  customsChannelOptions,
  customsLaneStatusOptions,
  customsStatusOptions,
  documentTypeOptions,
  mblTypeOptions,
} from '../constants';
import {
  cleanString,
  formatBytes,
  formatDateTime,
  formatMoney,
  formatOptionalNumber,
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
  toNumberInputValue,
} from '../formatters';
import { Info } from './Info';

export function DocumentsPanel({
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
