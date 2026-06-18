import { Badge, Checkbox, Group, Paper, Stack, Text } from '@mantine/core';

import type { ShipmentPoTask } from '@shared/api/logistics';

export function ShipmentTasksPanel({ tasks }: { tasks: ShipmentPoTask[] }) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={700} size="sm">
          PO Stage Closure Tasks
        </Text>
        <Text size="xs" c="dimmed">
          Tasks must be completed before shipment can proceed to next stage.
        </Text>
        <Stack mt="sm" gap="xs">
          {tasks.map((task) => (
            <Paper key={task.id} withBorder p="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <Checkbox checked={task.status === 'COMPLETED'} readOnly />
                  <Text size="sm" fw={task.status === 'COMPLETED' ? 500 : 600} style={{ textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                    {task.task_name}
                  </Text>
                </Group>
                <Badge color="gray">{task.assignee_role}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
