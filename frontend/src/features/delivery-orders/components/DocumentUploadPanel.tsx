import { Alert, Badge, Button, Checkbox, FileInput, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconExternalLink, IconFileUpload } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  fetchDeliveryOrderAttachments,
  uploadDeliveryOrderAttachment,
  type DeliveryOrder,
  type LogisticsAttachment,
} from '@shared/api/logistics';
import { queryKeys } from '@shared/api/queryKeys';
import { getApiErrorMessage } from '@shared/lib/errors';
import { useI18n } from '@shared/i18n';
import { formatDateTime } from '@shared/utils/date';

export function DocumentUploadPanel({
  deliveryOrder,
  documentLabel,
}: {
  deliveryOrder: DeliveryOrder;
  documentLabel: (documentName: string) => string;
}) {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const orderNumber = deliveryOrder.order_info.order_number;
  const attachmentsQuery = useQuery({
    queryKey: queryKeys.deliveryOrderAttachments(orderNumber),
    queryFn: () => fetchDeliveryOrderAttachments(orderNumber),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ documentType, file }: { documentType: string; file: File }) =>
      uploadDeliveryOrderAttachment({
        documentType,
        file,
        orderNumber,
      }),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
        queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrderAttachments(orderNumber) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      ]);
    },
  });
  const attachments = attachmentsQuery.data ?? [];

  return (
    <Stack gap="md">
      {uploadMutation.isError ? (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>
          {getApiErrorMessage(uploadMutation.error)}
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {['Invoice', 'Packing List', 'B/L', 'CO'].map((documentName) => {
          const uploadedFiles = attachments.filter((attachment) => attachment.documentType === documentName);
          const checked = deliveryOrder.logistics_shipping.documents_list.includes(documentName) || uploadedFiles.length > 0;
          const selectedFile = selectedFiles[documentName] ?? null;

          return (
            <Paper key={documentName} withBorder p="md" className={checked ? undefined : 'risk-panel'}>
              <Group justify="space-between" align="flex-start" gap="xs">
                <div>
                  <Checkbox checked={checked} readOnly label={documentLabel(documentName)} />
                  <Text size="sm" c={checked ? 'teal' : 'red'} mt={6}>
                    {checked ? t('deliveryOrders.received') : t('deliveryOrders.missingForCustoms')}
                  </Text>
                </div>
                <Badge color={uploadedFiles.length > 0 ? 'teal' : 'gray'} variant="light">
                  {t('deliveryOrders.uploadedFiles', { count: uploadedFiles.length })}
                </Badge>
              </Group>

              <FileInput
                accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                clearable
                leftSection={<IconFileUpload size={16} />}
                mt="md"
                placeholder={t('deliveryOrders.selectAttachment')}
                value={selectedFile}
                onChange={(file) =>
                  setSelectedFiles((current) => ({
                    ...current,
                    [documentName]: file,
                  }))
                }
              />
              <Button
                fullWidth
                disabled={!selectedFile}
                loading={uploadMutation.isPending}
                mt="sm"
                onClick={() => {
                  if (selectedFile) {
                    uploadMutation.mutate({ documentType: documentName, file: selectedFile });
                    setSelectedFiles((current) => ({ ...current, [documentName]: null }));
                  }
                }}
                leftSection={<IconFileUpload size={16} />}
              >
                {t('deliveryOrders.uploadAttachment')}
              </Button>

              {uploadedFiles.length > 0 ? <AttachmentList attachments={uploadedFiles} /> : null}
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function AttachmentList({ attachments }: { attachments: LogisticsAttachment[] }) {
  const { t } = useI18n();

  return (
    <Stack gap={6} mt="sm">
      {attachments.map((attachment) => (
        <Group key={attachment.id} justify="space-between" gap="xs" wrap="nowrap">
          <div>
            <Text size="sm" fw={600}>
              {attachment.fileName}
            </Text>
            <Text size="xs" c="dimmed">
              {formatBytes(attachment.size)} · {formatDateTime(attachment.uploadedAt)}
            </Text>
          </div>
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
        </Group>
      ))}
    </Stack>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
