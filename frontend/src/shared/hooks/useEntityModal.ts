import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

export type EntityModal<T> = {
  opened: boolean;
  editing: T | null;
  openAdd: () => void;
  openEdit: (record: T) => void;
  close: () => void;
};

/**
 * Modal state for an add/edit entity dialog: `openAdd` clears the editing
 * record (create mode), `openEdit` targets an existing record.
 */
export function useEntityModal<T>(): EntityModal<T> {
  const [opened, handlers] = useDisclosure(false);
  const [editing, setEditing] = useState<T | null>(null);

  return {
    opened,
    editing,
    openAdd: () => {
      setEditing(null);
      handlers.open();
    },
    openEdit: (record: T) => {
      setEditing(record);
      handlers.open();
    },
    close: handlers.close,
  };
}
