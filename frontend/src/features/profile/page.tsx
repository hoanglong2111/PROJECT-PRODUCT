import {
  Alert,
  Avatar,
  Badge,
  Button,
  Divider,
  FileInput,
  Group,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPhoto, IconShieldLock, IconUpload, IconUserCircle } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getApiErrorMessage } from '@shared/lib/errors';
import type { AuthUser } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { PageHeader } from '@shared/components/PageHeader';
import { PageLoading } from '@shared/components/PageFeedback';
import { useI18n } from '@shared/i18n';
import { getAllowedWorkspaceModules } from '@shared/navigation/workspaceModules';

type ProfileForm = {
  avatarUrl: string;
  defaultWarehouseCode: string;
  department: string;
  fullName: string;
  operationFocus: string;
  phoneNumber: string;
  position: string;
  preferredModulePath: string;
  profileNote: string;
  workLocation: string;
  workShift: string;
};

type EmailForm = {
  currentPassword: string;
  email: string;
};

type PasswordForm = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

const avatarImageMaxSizeBytes = 1_500_000;
const knownDepartments = [
  'Purchasing',
  'Sales Operations',
  'Port Operations',
  'Import Customs',
  'Finance',
  'Warehouse',
  'IT Operations',
];

const emptyProfileForm: ProfileForm = {
  avatarUrl: '',
  defaultWarehouseCode: '',
  department: '',
  fullName: '',
  operationFocus: '',
  phoneNumber: '',
  position: '',
  preferredModulePath: '',
  profileNote: '',
  workLocation: '',
  workShift: '',
};

export function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can, updateEmail, updatePassword, updateProfile, user } = useAuth();
  const { departmentLabel, roleLabel, t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const activeTab = searchParams.get('tab') === 'security' ? 'security' : 'info';
  const form = useForm<ProfileForm>({
    initialValues: emptyProfileForm,
    validate: {
      fullName: (value) => (value.trim().length === 0 ? t('profile.fullNameRequired') : null),
      department: (value) => (value.trim().length === 0 ? t('profile.departmentRequired') : null),
      position: (value) => (value.trim().length === 0 ? t('profile.positionRequired') : null),
    },
  });
  const emailForm = useForm<EmailForm>({
    initialValues: { currentPassword: '', email: '' },
    validate: {
      currentPassword: (value) => (value.trim().length === 0 ? t('profile.currentPassword') : null),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value.trim()) ? null : t('profile.emailRequired')),
    },
  });
  const passwordForm = useForm<PasswordForm>({
    initialValues: { confirmPassword: '', currentPassword: '', newPassword: '' },
    validate: {
      currentPassword: (value) => (value.trim().length === 0 ? t('profile.currentPassword') : null),
      newPassword: (value) => (value.length >= 6 ? null : t('settings.passwordMin')),
      confirmPassword: (value, values) => (value === values.newPassword ? null : t('profile.passwordMismatch')),
    },
  });

  const preferredModuleOptions = useMemo(
    () =>
      user
        ? getAllowedWorkspaceModules(can).map((module) => ({
          label: t(module.labelKey),
          value: module.path,
        }))
        : [],
    [can, t, user],
  );
  const departmentOptions = useMemo(() => {
    const values = user?.department && !knownDepartments.includes(user.department)
      ? [...knownDepartments, user.department]
      : knownDepartments;

    return values.map((department) => ({ label: departmentLabel(department), value: department }));
  }, [departmentLabel, user?.department]);

  useEffect(() => {
    if (!user) {
      return;
    }

    form.setValues(profileFormFromUser(user));
    emailForm.setValues({ currentPassword: '', email: user.email });
  }, [user]);

  if (!user) {
    return (
      <PageLoading
        title={t('profile.title')}
        description={t('profile.loadingDescription')}
        metricCount={3}
        tableColumns={[t('common.field'), t('common.currentValue'), t('common.status')]}
      />
    );
  }

  const avatarSource = form.values.avatarUrl || user.avatarUrl;

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) {
      return;
    }

    if (file.size > avatarImageMaxSizeBytes) {
      setAvatarError(t('profile.avatarTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.setFieldValue('avatarUrl', reader.result);
        setAvatarError(null);
      }
    };
    reader.onerror = () => setAvatarError(t('profile.error'));
    reader.readAsDataURL(file);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        icon={<IconUserCircle size={20} />}
        title={t('profile.title')}
        subtitle={t('profile.description')}
        actions={
          <Badge leftSection={<IconUserCircle size={14} />} size="lg" variant="light">
            {roleLabel(user.role)}
          </Badge>
        }
      />

      {error ? <Alert color="red">{error}</Alert> : null}
      {message ? <Alert color="teal">{message}</Alert> : null}


      <Tabs
        value={activeTab}
        onChange={(value) => {
          const nextParams = new URLSearchParams(searchParams);
          const nextTab = value === 'security' ? 'security' : 'info';
          if (nextTab === 'security') {
            nextParams.set('tab', nextTab);
          } else {
            nextParams.delete('tab');
          }
          setSearchParams(nextParams);
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="info" leftSection={<IconUserCircle size={16} />}>
            {t('profile.identity')}
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconShieldLock size={16} />}>
            {t('profile.security')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info" pt="lg">
          <Paper withBorder p="lg" className="dl-data-panel">
            <form
              onSubmit={form.onSubmit(async (values) => {
                setMessage(null);
                setError(null);
                setSavingProfile(true);
                try {
                  await updateProfile({
                    avatarUrl: nullableString(values.avatarUrl),
                    defaultWarehouseCode: nullableString(values.defaultWarehouseCode),
                    department: values.department.trim(),
                    fullName: values.fullName.trim(),
                    operationFocus: nullableString(values.operationFocus),
                    phoneNumber: nullableString(values.phoneNumber),
                    position: values.position.trim(),
                    preferredModulePath: nullableString(values.preferredModulePath),
                    profileNote: nullableString(values.profileNote),
                    workLocation: nullableString(values.workLocation),
                    workShift: nullableString(values.workShift),
                  });
                  setMessage(t('profile.saved'));
                } catch (caughtError) {
                  setError(getApiErrorMessage(caughtError, t('profile.error')));
                } finally {
                  setSavingProfile(false);
                }
              })}
            >
              <Stack gap="lg">
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
                  <Stack gap="md">
                    <Group gap="sm">
                      <IconPhoto size={18} />
                      <Text fw={700}>{t('profile.avatarImage')}</Text>
                    </Group>
                    <Group align="flex-start" gap="md" wrap="nowrap">
                      <Avatar src={avatarSource} radius="xl" size={96}>
                        {userInitials(form.values.fullName || user.fullName)}
                      </Avatar>
                      <Stack gap="xs" style={{ flex: 1 }}>
                        <FileInput
                          accept="image/png,image/jpeg,image/webp"
                          clearable
                          leftSection={<IconUpload size={16} />}
                          label={t('profile.avatarUpload')}
                          onChange={handleAvatarFileChange}
                        />
                        <TextInput
                          label={t('profile.avatarUrl')}
                          placeholder="https://example.com/avatar.png"
                          {...form.getInputProps('avatarUrl')}
                        />
                        {avatarError ? (
                          <Text c="red" size="sm">
                            {avatarError}
                          </Text>
                        ) : null}
                        <Button
                          disabled={!form.values.avatarUrl}
                          onClick={() => {
                            form.setFieldValue('avatarUrl', '');
                            setAvatarError(null);
                          }}
                          size="xs"
                          variant="subtle"
                        >
                          {t('profile.avatarClear')}
                        </Button>
                      </Stack>
                    </Group>

                    <Divider />

                    <Text fw={700}>{t('profile.coreFields')}</Text>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput label={t('profile.fullName')} placeholder="Nguyen Van A" {...form.getInputProps('fullName')} />
                      <TextInput label={t('profile.position')} placeholder="PIC Manager" {...form.getInputProps('position')} />
                      <Select data={departmentOptions} label={t('profile.department')} searchable {...form.getInputProps('department')} />
                      <TextInput label={t('profile.phoneNumber')} placeholder="+84 900 000 000" {...form.getInputProps('phoneNumber')} />
                    </SimpleGrid>
                  </Stack>

                  <Stack gap="md">
                    <Text fw={700}>{t('profile.erpPreferences')}</Text>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <TextInput label={t('profile.workLocation')} placeholder="HCM Office" {...form.getInputProps('workLocation')} />
                      <TextInput label={t('profile.workShift')} placeholder="Office hours" {...form.getInputProps('workShift')} />
                      <TextInput label={t('profile.defaultWarehouseCode')} placeholder="WH-HCM" {...form.getInputProps('defaultWarehouseCode')} />
                      <Select
                        clearable
                        data={preferredModuleOptions}
                        label={t('profile.preferredModule')}
                        placeholder={t('profile.notSet')}
                        {...form.getInputProps('preferredModulePath')}
                      />
                    </SimpleGrid>
                    <TextInput
                      label={t('profile.operationFocus')}
                      placeholder="Sea FCL / Customs / Finance"
                      {...form.getInputProps('operationFocus')}
                    />
                    <Textarea
                      autosize
                      label={t('profile.profileNote')}
                      minRows={4}
                      placeholder="SOP focus, customer lane, or handover notes"
                      {...form.getInputProps('profileNote')}
                    />
                  </Stack>
                </SimpleGrid>

                <Group justify="flex-end">
                  <Button type="submit" loading={savingProfile} w={{ base: '100%', sm: 220 }}>
                    {t('profile.save')}
                  </Button>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="lg">
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper withBorder p="lg" className="dl-data-panel">
              <form
                onSubmit={emailForm.onSubmit(async (values) => {
                  setMessage(null);
                  setError(null);
                  setSavingEmail(true);
                  try {
                    await updateEmail({
                      currentPassword: values.currentPassword,
                      email: values.email.trim().toLowerCase(),
                    });
                    emailForm.setFieldValue('currentPassword', '');
                    setMessage(t('profile.emailSaved'));
                  } catch (caughtError) {
                    setError(getApiErrorMessage(caughtError, t('profile.error')));
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
            </Paper>

            <Paper withBorder p="lg" className="dl-data-panel">
              <form
                onSubmit={passwordForm.onSubmit(async (values) => {
                  setMessage(null);
                  setError(null);
                  setSavingPassword(true);
                  try {
                    await updatePassword({
                      currentPassword: values.currentPassword,
                      newPassword: values.newPassword,
                    });
                    passwordForm.reset();
                    setMessage(t('profile.passwordSaved'));
                  } catch (caughtError) {
                    setError(getApiErrorMessage(caughtError, t('profile.error')));
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
            </Paper>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function profileFormFromUser(user: AuthUser): ProfileForm {
  return {
    avatarUrl: user.avatarUrl ?? '',
    defaultWarehouseCode: user.defaultWarehouseCode ?? '',
    department: user.department,
    fullName: user.fullName,
    operationFocus: user.operationFocus ?? '',
    phoneNumber: user.phoneNumber ?? '',
    position: user.position,
    preferredModulePath: user.preferredModulePath ?? '',
    profileNote: user.profileNote ?? '',
    workLocation: user.workLocation ?? '',
    workShift: user.workShift ?? '',
  };
}

function nullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function userInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
