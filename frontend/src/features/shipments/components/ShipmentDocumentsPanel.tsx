import { Alert, Badge, Button, FileInput, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconHourglassHigh, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentDocumentPayload } from '@shared/api/shipments';
import { DocumentCard, DocumentStatusBadge } from '@shared/components/documents';

export function ShipmentDocumentsPanel({
  isSaving,
  onCreateDocument,
  onUpdateDocument,
  shipment,
  t,
}: {
  isSaving: boolean;
  onCreateDocument: (payload: ShipmentDocumentPayload) => void;
  onUpdateDocument: (documentId: string, payload: Partial<ShipmentDocumentPayload>) => void;
  shipment: ShipmentRecord;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newDocumentType, setNewDocumentType] = useState<ShipmentDocumentPayload['document_type']>('BILL_OF_LADING');
  const [newDocumentNo, setNewDocumentNo] = useState('');

  const documentTypeOptions: Array<{ label: string; value: ShipmentDocumentPayload['document_type'] }> = [
    { label: t('shipments.documentTypes.COMMERCIAL_INVOICE'), value: 'COMMERCIAL_INVOICE' },
    { label: t('shipments.documentTypes.PACKING_LIST'), value: 'PACKING_LIST' },
    { label: t('shipments.documentTypes.CONTRACT'), value: 'CONTRACT' },
    { label: t('shipments.documentTypes.BOOKING_CONFIRMATION'), value: 'BOOKING_CONFIRMATION' },
    { label: t('shipments.documentTypes.BILL_OF_LADING'), value: 'BILL_OF_LADING' },
    { label: t('shipments.documentTypes.AIR_WAYBILL'), value: 'AIR_WAYBILL' },
    { label: t('shipments.documentTypes.ARRIVAL_NOTICE'), value: 'ARRIVAL_NOTICE' },
    { label: t('shipments.documentTypes.CERTIFICATE_OF_ORIGIN'), value: 'CERTIFICATE_OF_ORIGIN' },
    { label: t('shipments.documentTypes.INSURANCE'), value: 'INSURANCE' },
    { label: t('shipments.documentTypes.CUSTOMS_DECLARATION'), value: 'CUSTOMS_DECLARATION' },
    { label: t('shipments.documentTypes.EDO'), value: 'EDO' },
    { label: t('shipments.documentTypes.POD'), value: 'POD' },
    { label: t('shipments.documentTypes.OTHER'), value: 'OTHER' },
  ];

  const handleDocumentApprove = (docId: string) => {
    onUpdateDocument(docId, { status: 'VERIFIED' });
  };

  const handleDocumentReject = (docId: string) => {
    if (!rejectReason) return;
    onUpdateDocument(docId, { notes: rejectReason, status: 'REJECTED' });
    setRejectingDocId(null);
    setRejectReason('');
  };

  const handleDocumentUpload = (docId: string, file: File | null) => {
    if (!file) return;
    onUpdateDocument(docId, {
      file_name: file.name,
      mime_type: file.type || null,
      received_at: new Date().toISOString(),
      status: 'RECEIVED',
    });
  };

  const handleCreateDocument = () => {
    onCreateDocument({
      document_no: newDocumentNo || null,
      document_type: newDocumentType,
      status: 'DRAFT',
    });
    setNewDocumentNo('');
  };

  return (
    <Stack gap="md">
      <Alert color="orange" icon={<IconHourglassHigh size={18} />}>
        {t('shipments.documentReviewAlert')}
      </Alert>
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <Select
            label={t('shipments.documentType')}
            data={documentTypeOptions}
            value={newDocumentType}
            onChange={(value) => setNewDocumentType((value as ShipmentDocumentPayload['document_type'] | null) ?? 'OTHER')}
          />
          <TextInput
            label={t('shipments.documentNo')}
            placeholder={t('shipments.blAwbPlaceholder')}
            value={newDocumentNo}
            onChange={(event) => setNewDocumentNo(event.currentTarget.value)}
          />
          <Group align="flex-end">
            <Button
              fullWidth
              leftSection={<IconPlus size={16} />}
              loading={isSaving}
              onClick={handleCreateDocument}
            >
              {t('shipments.addDocument')}
            </Button>
          </Group>
        </SimpleGrid>
      </Paper>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {shipment.documents.map((doc) => {
          const isWaitingReview = doc.status === 'WAITING_REVIEW' || doc.status === 'RECEIVED';
          const hasFile = !!doc.file_name;

          return (
            <DocumentCard
              key={doc.id}
              title={doc.document_type}
              badge={<DocumentStatusBadge status={doc.status} />}
            >
                {hasFile ? (
                  <Text size="xs" c="blue" style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    {doc.file_name}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" fs="italic">
                    {t('shipments.noFileUploaded')}
                  </Text>
                )}

                {isWaitingReview && doc.review_due_at && (
                  <Group justify="space-between">
                    <Text size="xs" fw={700}>{t('shipments.slaReviewTimeleft')}</Text>
                    <Badge color="orange" variant="filled">
                      2h SLA
                    </Badge>
                  </Group>
                )}

                {doc.reject_reason && (
                  <Text size="xs" c="red" fw={600}>
                    {t('shipments.rejectDocument', { reason: doc.reject_reason })}
                  </Text>
                )}

                <Group gap="xs" justify="flex-end" mt="xs">
                  <FileInput
                    placeholder={t('shipments.upload')}
                    size="xs"
                    onChange={(file) => handleDocumentUpload(doc.id, file)}
                    style={{ maxWidth: 120 }}
                  />
                  {isWaitingReview && (
                    <>
                      <Button size="xs" color="green" loading={isSaving} onClick={() => handleDocumentApprove(doc.id)}>
                        {t('shipments.documentApprove')}
                      </Button>
                      <Button size="xs" color="red" variant="light" onClick={() => setRejectingDocId(doc.id)}>
                        {t('shipments.documentReject')}
                      </Button>
                    </>
                  )}
                </Group>

                {rejectingDocId === doc.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label={t('shipments.rejectReason')}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                        size="xs"
                        required
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="subtle" onClick={() => setRejectingDocId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="xs"
                          color="red"
                          disabled={!rejectReason}
                          loading={isSaving}
                          onClick={() => handleDocumentReject(doc.id)}
                        >
                          {t('shipments.confirmReject')}
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
            </DocumentCard>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
