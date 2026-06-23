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
  t: (key: string) => string;
}) {
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newDocumentType, setNewDocumentType] = useState<ShipmentDocumentPayload['document_type']>('BILL_OF_LADING');
  const [newDocumentNo, setNewDocumentNo] = useState('');

  const documentTypeOptions: Array<{ label: string; value: ShipmentDocumentPayload['document_type'] }> = [
    { label: 'Commercial invoice', value: 'COMMERCIAL_INVOICE' },
    { label: 'Packing list', value: 'PACKING_LIST' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Booking confirmation', value: 'BOOKING_CONFIRMATION' },
    { label: 'Bill of lading', value: 'BILL_OF_LADING' },
    { label: 'Air waybill', value: 'AIR_WAYBILL' },
    { label: 'Arrival notice', value: 'ARRIVAL_NOTICE' },
    { label: 'Certificate of origin', value: 'CERTIFICATE_OF_ORIGIN' },
    { label: 'Insurance', value: 'INSURANCE' },
    { label: 'Customs declaration', value: 'CUSTOMS_DECLARATION' },
    { label: 'eDO', value: 'EDO' },
    { label: 'POD', value: 'POD' },
    { label: 'Other', value: 'OTHER' },
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
        Draft B/L SLA: 2-hour review window for cross-check.
      </Alert>
      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <Select
            label="Document type"
            data={documentTypeOptions}
            value={newDocumentType}
            onChange={(value) => setNewDocumentType((value as ShipmentDocumentPayload['document_type'] | null) ?? 'OTHER')}
          />
          <TextInput
            label="Document no."
            placeholder="BL123456"
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
              Add document
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
                    No file uploaded.
                  </Text>
                )}

                {isWaitingReview && doc.review_due_at && (
                  <Group justify="space-between">
                    <Text size="xs" fw={700}>SLA Review Timeleft:</Text>
                    <Badge color="orange" variant="filled">
                      2h SLA
                    </Badge>
                  </Group>
                )}

                {doc.reject_reason && (
                  <Text size="xs" c="red" fw={600}>
                    Rejected: {doc.reject_reason}
                  </Text>
                )}

                <Group gap="xs" justify="flex-end" mt="xs">
                  <FileInput
                    placeholder="Upload..."
                    size="xs"
                    onChange={(file) => handleDocumentUpload(doc.id, file)}
                    style={{ maxWidth: 120 }}
                  />
                  {isWaitingReview && (
                    <>
                      <Button size="xs" color="green" loading={isSaving} onClick={() => handleDocumentApprove(doc.id)}>
                        Approve
                      </Button>
                      <Button size="xs" color="red" variant="light" onClick={() => setRejectingDocId(doc.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                </Group>

                {rejectingDocId === doc.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label="Reject reason"
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
                          Confirm reject
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
