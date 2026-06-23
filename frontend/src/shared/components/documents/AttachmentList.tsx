import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink, IconTrash } from '@tabler/icons-react';

// Minimal, type-agnostic file shape so this list can render uploaded files from
// any document source (DO attachments, shipment documents, ...).
export type DocumentFile = {
  id: string;
  fileName: string;
  href?: string | null;
  sizeLabel?: string | null;
  dateLabel?: string | null;
};

export function AttachmentList({
  deleteLabel,
  files,
  onDelete,
  openLabel,
}: {
  deleteLabel?: string;
  files: DocumentFile[];
  onDelete?: (id: string) => void;
  openLabel: string;
}) {
  if (files.length === 0) return null;

  return (
    <Stack gap={6} mt="sm">
      {files.map((file) => {
        const meta = [file.sizeLabel, file.dateLabel].filter(Boolean).join(' · ');
        return (
          <Group key={file.id} justify="space-between" gap="xs" wrap="nowrap">
            <div>
              <Text size="sm" fw={600}>
                {file.fileName}
              </Text>
              {meta ? (
                <Text size="xs" c="dimmed">
                  {meta}
                </Text>
              ) : null}
            </div>
            <Group gap={4} wrap="nowrap">
              {file.href ? (
                <Button
                  component="a"
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  size="compact-xs"
                  variant="subtle"
                  rightSection={<IconExternalLink size={12} />}
                >
                  {openLabel}
                </Button>
              ) : null}
              {onDelete ? (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size="sm"
                  aria-label={deleteLabel ?? 'delete'}
                  onClick={() => onDelete(file.id)}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              ) : null}
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
