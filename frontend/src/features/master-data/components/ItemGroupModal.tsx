import { Alert, Badge, Button, Group, Modal, Paper, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconFileCode, IconPencil, IconPlus, IconSearch } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createItemGroup, updateItemGroup, type ItemGroup } from '@shared/api/items';
import { queryKeys } from '@shared/api/queryKeys';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';
import { getApiErrorMessage } from '@shared/lib/errors';

import { optionalString } from '../model/masterDataModel';

type ItemGroupFormValues = {
  code: string;
  name: string;
  description: string;
  defaultHsCode: string;
};

const emptyValues: ItemGroupFormValues = { code: '', name: '', description: '', defaultHsCode: '' };

function hintedLabel(label: string, hint: string) {
  return (
    <Group gap={4} component="span" wrap="nowrap">
      <span>{label}</span>
      <FieldHint label={hint} />
    </Group>
  );
}

export function ItemGroupModal({
  editing,
  onClose,
  opened,
}: {
  editing: ItemGroup | null;
  onClose: () => void;
  opened: boolean;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<ItemGroupFormValues>({ initialValues: emptyValues });

  useEffect(() => {
    if (!opened) return;
    form.setValues(
      editing
        ? {
          code: editing.group_code ?? '',
          name: editing.group_name,
          description: editing.description ?? '',
          defaultHsCode: editing.default_hs_code ?? '',
        }
        : emptyValues,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, editing]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        group_code: optionalString(form.values.code),
        group_name: form.values.name.trim(),
        description: optionalString(form.values.description),
        default_hs_code: optionalString(form.values.defaultHsCode),
      };
      return editing ? updateItemGroup(editing.id, payload) : createItemGroup(payload);
    },
    onSuccess: () => {
      onClose();
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.itemGroupLists }),
        queryClient.invalidateQueries({ queryKey: queryKeys.itemLists }),
      ]);
    },
  });

  const handleSave = () => {
    if (!form.values.name.trim()) return;
    mutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="sm" wrap="nowrap">
          <Badge variant="light" size="lg" radius="sm" leftSection={<IconFileCode size={14} />}>
            {editing ? t('common.update') : t('common.add')}
          </Badge>
          <Text fw={700}>
            {editing ? t('masterData.editItemGroup') : t('masterData.createItemGroup')}
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        {mutation.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={18} />}>
            {getApiErrorMessage(mutation.error)}
          </Alert>
        ) : null}

        {editing ? (
          <Paper withBorder p="sm" radius="md">
            <Group justify="space-between" align="center" gap="sm">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {t('masterData.itemGroup')}
                </Text>
                <Text fw={700}>{editing.group_name}</Text>
              </div>
              <Badge variant="light">{editing.group_code || editing.id}</Badge>
            </Group>
          </Paper>
        ) : null}

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group gap="xs">
              <IconFileCode size={18} />
              <Text fw={700}>{t('masterData.itemGroup')}</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label={t('masterData.groupCode')} placeholder="GRP001" {...form.getInputProps('code')} />
              <TextInput
                data-autofocus
                label={t('masterData.groupName')}
                placeholder="Hardware"
                required
                {...form.getInputProps('name')}
              />
            </SimpleGrid>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group gap="xs">
              <IconSearch size={18} />
              <Text fw={700}>{t('masterData.defaultHsCode')}</Text>
            </Group>
            <TextInput
              label={hintedLabel(t('masterData.defaultHsCode'), t('glossary.hsCode'))}
              placeholder={t('masterData.hsCodePlaceholder')}
              {...form.getInputProps('defaultHsCode')}
            />
            <Textarea
              label={t('masterData.groupDescription')}
              autosize
              minRows={4}
              {...form.getInputProps('description')}
            />
          </Stack>
        </Paper>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={mutation.isPending}
            disabled={!form.values.name.trim()}
            leftSection={editing ? <IconPencil size={16} /> : <IconPlus size={16} />}
          >
            {t('masterData.saveItemGroup')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
