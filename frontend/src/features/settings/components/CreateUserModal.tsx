import { Alert, Button, Modal, PasswordInput, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUserPlus } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { createUser, type CreateUserPayload } from '@shared/api/system';
import { queryKeys } from '@shared/api/queryKeys';
import { APP_ROLES } from '@shared/auth/types';
import { ModalTitle } from '@shared/components/ModalTitle';
import { useI18n } from '@shared/i18n';

type CreateUserForm = Omit<CreateUserPayload, 'avatarUrl'> & {
  avatarUrl: string;
};

type CreateUserModalProps = {
  onClose: () => void;
  onCreated: (email: string) => void;
  onSubmitStart: () => void;
  opened: boolean;
};

export function CreateUserModal({ onClose, onCreated, onSubmitStart, opened }: CreateUserModalProps) {
  const { roleLabel, t } = useI18n();
  const queryClient = useQueryClient();
  const form = useForm<CreateUserForm>({
    initialValues: {
      avatarUrl: '',
      department: '',
      email: '',
      fullName: '',
      password: '',
      position: '',
      role: 'SALE_STAFF',
    },
    validate: {
      department: (value) => (value.trim().length === 0 ? t('settings.departmentRequired') : null),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : t('settings.emailInvalid')),
      fullName: (value) => (value.trim().length === 0 ? t('settings.fullNameRequired') : null),
      password: (value) => (value.length >= 6 ? null : t('settings.passwordMin')),
      position: (value) => (value.trim().length === 0 ? t('settings.positionRequired') : null),
      role: (value) => (APP_ROLES.includes(value) ? null : t('settings.roleInvalid')),
    },
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (createdUser) => {
      onCreated(createdUser.email);
      form.reset();
      onClose();
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });

  const roleOptions = useMemo(
    () => APP_ROLES.map((role) => ({ label: roleLabel(role), value: role })),
    [roleLabel],
  );

  return (
    <>
      {createUserMutation.isError ? (
        <Alert color="red">{t('settings.createAccountError')}</Alert>
      ) : null}

      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <ModalTitle
            feature="settings"
            icon={<IconUserPlus size={18} stroke={1.8} />}
            title={t('settings.createAccount')}
          />
        }
        size="lg"
      >
        <form
          onSubmit={form.onSubmit((values) => {
            onSubmitStart();
            createUserMutation.mutate({
              avatarUrl: values.avatarUrl.trim() || null,
              department: values.department.trim(),
              email: values.email.trim().toLowerCase(),
              fullName: values.fullName.trim(),
              password: values.password,
              position: values.position.trim(),
              role: values.role,
            });
          })}
        >
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput label={t('settings.fullName')} placeholder="Nguyen Van A" {...form.getInputProps('fullName')} />
              <TextInput label="Email" placeholder="user@kbfe.local" {...form.getInputProps('email')} />
              <PasswordInput label={t('common.password')} placeholder={t('settings.passwordMin')} {...form.getInputProps('password')} />
              <Select label={t('common.role')} data={roleOptions} {...form.getInputProps('role')} />
              <TextInput label={t('common.position')} placeholder="PIC Manager" {...form.getInputProps('position')} />
              <TextInput label={t('common.department')} placeholder="Purchasing" {...form.getInputProps('department')} />
            </SimpleGrid>
            <TextInput label={t('settings.avatarUrl')} placeholder="https://example.com/avatar.png" {...form.getInputProps('avatarUrl')} />
            <Button type="submit" loading={createUserMutation.isPending} fullWidth>
              {t('settings.createAccount')}
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
