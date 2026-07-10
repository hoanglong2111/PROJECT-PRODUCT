import { Button, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@shared/lib/errors';
import type { AuthUser } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';

type EmailFormValues = {
  currentPassword: string;
  email: string;
};

export function EmailForm({ onError, onMessage, user }: { onError: (message: string) => void; onMessage: (message: string) => void; user: AuthUser }) {
  const { updateEmail } = useAuth();
  const { t } = useI18n();
  const [savingEmail, setSavingEmail] = useState(false);
  const emailForm = useForm<EmailFormValues>({
    initialValues: { currentPassword: '', email: '' },
    validate: {
      currentPassword: (value) => (value.trim().length === 0 ? t('profile.currentPassword') : null),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : t('profile.emailRequired')),
    },
  });

  useEffect(() => {
    emailForm.setValues({ currentPassword: '', email: user.email });
  }, [user]);

  return (
    <form
      onSubmit={emailForm.onSubmit(async (values) => {
        setSavingEmail(true);
        try {
          await updateEmail({
            currentPassword: values.currentPassword,
            email: values.email.trim().toLowerCase(),
          });
          emailForm.setFieldValue('currentPassword', '');
          onMessage(t('profile.emailSaved'));
        } catch (caughtError) {
          onError(getApiErrorMessage(caughtError, t('profile.error')));
        } finally {
          setSavingEmail(false);
        }
      })}
    >
      <Stack gap="md">
        <Text fw={700}>{t('profile.accountInfo')}</Text>
        <TextInput label={t('common.email')} placeholder="user@kbfe.local" {...emailForm.getInputProps('email')} />
        <PasswordInput label={t('profile.currentPassword')} {...emailForm.getInputProps('currentPassword')} />
        <Button type="submit" loading={savingEmail} w={{ base: '100%', sm: 220 }}>
          {t('profile.saveEmail')}
        </Button>
      </Stack>
    </form>
  );
}
