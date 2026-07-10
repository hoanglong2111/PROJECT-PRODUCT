import { Button, Divider, Group, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPhoto } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { getApiErrorMessage } from '@shared/lib/errors';
import type { AuthUser } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';
import { getAllowedWorkspaceModules } from '@shared/navigation/workspaceModules';

import { AvatarUpload } from './AvatarUpload';

type ProfileFormValues = {
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

const emptyProfileForm: ProfileFormValues = {
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

export function ProfileForm({ onError, onMessage, user }: { onError: (message: string) => void; onMessage: (message: string) => void; user: AuthUser }) {
  const { updateProfile } = useAuth();
  const { departmentLabel, t } = useI18n();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const form = useForm<ProfileFormValues>({
    initialValues: emptyProfileForm,
    validate: {
      fullName: (value) => (value.trim().length === 0 ? t('profile.fullNameRequired') : null),
      department: (value) => (value.trim().length === 0 ? t('profile.departmentRequired') : null),
      position: (value) => (value.trim().length === 0 ? t('profile.positionRequired') : null),
    },
  });

  const preferredModuleOptions = useMemo(
    () =>
      getAllowedWorkspaceModules().map((module) => ({
        label: t(module.labelKey),
        value: module.path,
      })),
    [t],
  );
  const departmentOptions = useMemo(() => {
    const values = user.department && !knownDepartments.includes(user.department)
      ? [...knownDepartments, user.department]
      : knownDepartments;

    return values.map((department) => ({ label: departmentLabel(department), value: department }));
  }, [departmentLabel, user.department]);

  useEffect(() => {
    form.setValues(profileFormFromUser(user));
  }, [user]);

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
    <form
      onSubmit={form.onSubmit(async (values) => {
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
          onMessage(t('profile.saved'));
        } catch (caughtError) {
          onError(getApiErrorMessage(caughtError, t('profile.error')));
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
            <AvatarUpload
              avatarSrc={avatarSource}
              clearDisabled={!form.values.avatarUrl}
              error={avatarError}
              initials={userInitials(form.values.fullName || user.fullName)}
              onClear={() => {
                form.setFieldValue('avatarUrl', '');
                setAvatarError(null);
              }}
              onFileSelect={handleAvatarFileChange}
              urlInputProps={form.getInputProps('avatarUrl')}
            />

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
  );
}

function profileFormFromUser(user: AuthUser): ProfileFormValues {
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
