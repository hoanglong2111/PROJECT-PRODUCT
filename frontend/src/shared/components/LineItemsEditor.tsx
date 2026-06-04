import { Button, Group, Stack, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';

type LineItemsEditorProps = {
  addLabel: string;
  children: ReactNode;
  onAdd: () => void;
  title: string;
};

export function LineItemsEditor({ addLabel, children, onAdd, title }: LineItemsEditorProps) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={700}>{title}</Text>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
          {addLabel}
        </Button>
      </Group>
      {children}
    </Stack>
  );
}
