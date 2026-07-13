import { Badge, Paper, Stack, Switch, Table, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchDocumentTypes, updateDocumentType } from '@shared/api/documentTypes';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

/**
 * Admin-configurable required-document catalog. Toggling `is_required` here changes the
 * set that drives the DO "documents complete" gate (mirrors the Task Template
 * is_required_for_closure pattern). Kept self-contained: the only mutation is the toggle.
 */
export function DocumentTypesSection({ canManage }: { canManage: boolean }) {
  const { language, t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.documentTypes, queryFn: () => fetchDocumentTypes() });
  const rows = query.data?.data ?? [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_required }: { id: string; is_required: boolean }) => updateDocumentType(id, { is_required }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.documentTypes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders });
    },
  });

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <div>
          <Text fw={700}>{t('masterData.documentTypesTitle')}</Text>
          <Text size="sm" c="dimmed">
            {t('masterData.documentTypesDescription')}
          </Text>
        </div>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 60 }}>{t('masterData.documentTypeOrder')}</Table.Th>
              <Table.Th>{t('masterData.documentTypeCode')}</Table.Th>
              <Table.Th>{t('masterData.documentTypeLabel')}</Table.Th>
              <Table.Th style={{ width: 180 }}>{t('masterData.documentTypeRequired')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>{row.sort_order}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color="gray">
                    {row.code}
                  </Badge>
                </Table.Td>
                <Table.Td>{language === 'vi' ? row.label_vi : row.label_en}</Table.Td>
                <Table.Td>
                  <Switch
                    checked={row.is_required}
                    disabled={!canManage || toggleMutation.isPending}
                    onChange={(event) =>
                      toggleMutation.mutate({ id: row.id, is_required: event.currentTarget.checked })
                    }
                    label={
                      row.is_required
                        ? t('masterData.documentTypeRequiredOn')
                        : t('masterData.documentTypeRequiredOff')
                    }
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}
