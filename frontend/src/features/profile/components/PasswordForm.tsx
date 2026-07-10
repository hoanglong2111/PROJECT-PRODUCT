import { Button, PasswordInput, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';

import { getApiErrorMessage } from '@shared/lib/errors';
import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';

type PasswordFormValues = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

export function PasswordForm({ onError, onMessage }: { onError: (message: string) => void; onMessage: (message: string) => void }) {
  const { updatePassword } = useAuth();
  const { t } = useI18n();
  const [savingPassword, setSavingPassword] = useState(false);
  const passwordForm = useForm<PasswordFormValues>({
    initialValues: { confirmPassword: '', currentPassword: '', newPassword: '' },
    validate: {
      currentPassword: (value) => (value.trim().length === 0 ? t('profile.currentPassword') : null),
      newPassword: (value) => (value.length >= 6 ? null : t('settings.passwordMin')),
      confirmPassword: (value, values) => (value === values.newPassword ? null : t('profile.passwordMismatch')),
    },
  });

  return (
    <form
      onSubmit={passwordForm.onSubmit(async (values) => {
        setSavingPassword(true);
        try {
          await updatePassword({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          });
          passwordForm.reset();
          onMessage(t('profile.passwordSaved'));
        } catch (caughtError) {
          onError(getApiErrorMessage(caughtError, t('profile.error')));
        } finally {
          setSavingPassword(false);
        }
      })}
    >
      <Stack gap="md">
        <Text fw={700}>{t('profile.updatePassword')}</Text>
        <PasswordInput label={t('profile.currentPassword')} {...passwordForm.getInputProps('currentPassword')} />
        <PasswordInput label={t('profile.newPassword')} {...passwordForm.getInputProps('newPassword')} />
        <PasswordInput label={t('profile.confirmPassword')} {...passwordForm.getInputProps('confirmPassword')} />
        <Button type="submit" loading={savingPassword} w={{ base: '100%', sm: 220 }}>
          {t('profile.updatePassword')}
        </Button>
      </Stack>
    </form>
  );
}
