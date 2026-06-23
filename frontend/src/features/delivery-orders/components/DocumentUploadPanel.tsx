import { Alert, Badge, Button, FileInput, Group, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconFileUpload, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createDeliveryOrderDocument,
  deleteDeliveryOrderDocument,
  fetchDeliveryOrderDocuments,
  type DeliveryOrderDocumentV1,
} from '@shared/api/deliveryOrders';
import type { DeliveryOrder } from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { AttachmentList, DocumentCard, DocumentStatusBadge, type DocumentFile } from '@shared/components/documents';
import { getApiErrorMessage } from '@shared/lib/errors';
import { useI18n } from '@shared/i18n';
import { formatDateTime } from '@shared/utils/date';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/gif';

// Core customs documents tracked as a readiness checklist (kept in sync with the
// backend REQUIRED_DO_DOCUMENT_TYPES).
const REQUIRED_DOCUMENT_TYPES = ['Invoice', 'Packing List', 'B/L', 'CO'];

function toDocumentFile(doc: DeliveryOrderDocumentV1): DocumentFile {
  return {
    id: doc.id,
    fileName: doc.file_name ?? doc.document_no ?? doc.document_type,
    href: doc.file_url ?? undefined,
    dateLabel: doc.received_at ? formatDateTime(doc.received_at) : undefined,
  };
}

export function DocumentUploadPanel({
  deliveryOrder,
  documentLabel,
}: {
  deliveryOrder: DeliveryOrder;
  documentLabel: (documentName: string) => string;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const deliveryOrderId = deliveryOrder.id;

  const documentsQuery = useQuery({
    queryKey: queryKeys.deliveryOrderDocuments(deliveryOrderId),
    queryFn: () => fetchDeliveryOrderDocuments(deliveryOrderId),
  });
  const documents = documentsQuery.data ?? [];

  const invalidate = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderDocuments(deliveryOrderId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderDetail(deliveryOrderId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createDeliveryOrderDocument>[1]) =>
      createDeliveryOrderDocument(deliveryOrderId, payload),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteDeliveryOrderDocument(documentId),
    onSuccess: invalidate,
  });

  const uploadForType = (documentType: string, file: File | null) => {
    if (!file) return;
    createMutation.mutate({
      document_type: documentType,
      file_name: file.name,
      mime_type: file.type || null,
      received_at: new Date().toISOString(),
      status: 'RECEIVED',
    });
  };

  const error = createMutation.error ?? deleteMutation.error ?? documentsQuery.error;
  const additionalDocuments = documents.filter((doc) => !REQUIRED_DOCUMENT_TYPES.includes(doc.document_type));

  return (
    <Stack gap="lg">
      {error ? (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {getApiErrorMessage(error)}
        </Alert>
      ) : null}

      <Stack gap="sm">
        <Text fw={700} size="sm">
          {t('deliveryOrders.requiredForCustoms')}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {REQUIRED_DOCUMENT_TYPES.map((type) => {
            const typeDocs = documents.filter((doc) => doc.document_type === type);
            const received = typeDocs.length > 0;
            return (
              <DocumentCard
                key={type}
                className={received ? undefined : 'risk-panel'}
                title={documentLabel(type)}
                badge={
                  <Badge color={received ? 'teal' : 'gray'} variant="light">
                    {t('deliveryOrders.uploadedFiles', { count: typeDocs.length })}
                  </Badge>
                }
              >
                <Text size="sm" c={received ? 'teal' : 'red'}>
                  {received ? t('deliveryOrders.received') : t('deliveryOrders.missingForCustoms')}
                </Text>
                <DocumentUpload
                  accept={ACCEPT}
                  disabled={createMutation.isPending}
                  onUpload={(file) => uploadForType(type, file)}
                  selectLabel={t('deliveryOrders.selectAttachment')}
                  uploadLabel={t('deliveryOrders.uploadAttachment')}
                />
                <AttachmentList
                  files={typeDocs.map(toDocumentFile)}
                  openLabel={t('deliveryOrders.openAttachment')}
                  deleteLabel={t('deliveryOrders.deleteAttachment')}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              </DocumentCard>
            );
          })}
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <div>
          <Text fw={700} size="sm">
            {t('deliveryOrders.additionalDocuments')}
          </Text>
          <Text size="xs" c="dimmed">
            {t('deliveryOrders.additionalDocumentsHint')}
          </Text>
        </div>

        <Paper withBorder p="md">
          <AdditionalDocumentForm
            accept={ACCEPT}
            isSaving={createMutation.isPending}
            onCreate={(documentType, file) =>
              createMutation.mutate({
                document_type: documentType,
                file_name: file?.name ?? null,
                mime_type: file?.type || null,
                received_at: new Date().toISOString(),
                status: 'RECEIVED',
              })
            }
            t={t}
          />
        </Paper>

        {additionalDocuments.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('deliveryOrders.noAdditionalDocuments')}
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {additionalDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                title={doc.document_type}
                badge={<DocumentStatusBadge status={doc.status} variant="light" />}
              >
                {doc.notes ? (
                  <Text size="xs" c="dimmed">
                    {doc.notes}
                  </Text>
                ) : null}
                <AttachmentList
                  files={[toDocumentFile(doc)]}
                  openLabel={t('deliveryOrders.openAttachment')}
                  deleteLabel={t('deliveryOrders.deleteAttachment')}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              </DocumentCard>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Stack>
  );
}

function DocumentUpload({
  accept,
  disabled,
  onUpload,
  selectLabel,
  uploadLabel,
}: {
  accept: string;
  disabled: boolean;
  onUpload: (file: File) => void;
  selectLabel: string;
  uploadLabel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <Group gap="xs" align="flex-end" mt="xs" wrap="nowrap">
      <FileInput
        flex={1}
        accept={accept}
        clearable
        leftSection={<IconFileUpload size={16} />}
        placeholder={selectLabel}
        size="xs"
        value={file}
        onChange={setFile}
      />
      <Button
        size="xs"
        disabled={!file}
        loading={disabled && Boolean(file)}
        leftSection={<IconFileUpload size={14} />}
        onClick={() => {
          if (file) {
            onUpload(file);
            setFile(null);
          }
        }}
      >
        {uploadLabel}
      </Button>
    </Group>
  );
}

function AdditionalDocumentForm({
  accept,
  isSaving,
  onCreate,
  t,
}: {
  accept: string;
  isSaving: boolean;
  onCreate: (documentType: string, file: File | null) => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), file);
    setName('');
    setFile(null);
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
      <TextInput
        label={t('deliveryOrders.documentName')}
        placeholder={t('deliveryOrders.documentNamePlaceholder')}
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <FileInput
        label={t('deliveryOrders.selectAttachment')}
        accept={accept}
        clearable
        leftSection={<IconFileUpload size={16} />}
        value={file}
        onChange={setFile}
      />
      <Group align="flex-end">
        <Button
          fullWidth
          leftSection={<IconPlus size={16} />}
          loading={isSaving}
          disabled={!name.trim()}
          onClick={handleAdd}
        >
          {t('deliveryOrders.addDocument')}
        </Button>
      </Group>
    </SimpleGrid>
  );
}
