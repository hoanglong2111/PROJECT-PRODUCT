import { Alert, Avatar, Badge, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconUserCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../auth/useAuth';
import { PageLoading } from '../components/PageFeedback';
import { useI18n } from '../i18n';

type ProfileForm = {
  avatarUrl: string;
  department: string;
  fullName: string;
};

export function Profile() {
  const { updateProfile, user } = useAuth();
  const { roleLabel, t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useForm<ProfileForm>({
    initialValues: {
      avatarUrl: user?.avatarUrl ?? '',
      department: user?.department ?? '',
      fullName: user?.fullName ?? '',
    },
    validate: {
      fullName: (value) => (value.trim().length === 0 ? t('profile.fullNameRequired') : null),
      department: (value) => (value.trim().length === 0 ? t('profile.departmentRequired') : null),
    },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    form.setValues({
      avatarUrl: user.avatarUrl ?? '',
      department: user.department,
      fullName: user.fullName,
    });
  }, [user?.avatarUrl, user?.department, user?.fullName]); // keep form state sync only when profile payload changes

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

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>{t('profile.title')}</Title>
          <Text c="dimmed" mt={4}>
            {t('profile.description')}
          </Text>
        </div>
        <Badge leftSection={<IconUserCircle size={14} />} size="lg" variant="light">
          {roleLabel(user.role)}
        </Badge>
      </Group>

      {error ? <Alert color="red">{error}</Alert> : null}
      {message ? <Alert color="teal">{message}</Alert> : null}

      <Paper withBorder p="lg">
        <Group gap="md" mb="md">
          <Avatar src={user.avatarUrl} radius="xl" size="lg">
            {user.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((word) => word[0])
              .join('')
              .toUpperCase()}
          </Avatar>
          <div>
            <Text fw={700}>{user.fullName}</Text>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
          </div>
        </Group>

        <form
          onSubmit={form.onSubmit(async (values) => {
            setMessage(null);
            setError(null);
            setSaving(true);
            try {
              await updateProfile({
                avatarUrl: values.avatarUrl.trim() || null,
                department: values.department.trim(),
                fullName: values.fullName.trim(),
              });
              setMessage(t('profile.saved'));
            } catch {
              setError(t('profile.error'));
            } finally {
              setSaving(false);
            }
          })}
        >
          <Stack>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <TextInput label={t('profile.fullName')} placeholder="Nguyen Van A" {...form.getInputProps('fullName')} />
              <TextInput label={t('profile.department')} placeholder="Purchasing" {...form.getInputProps('department')} />
            </SimpleGrid>
            <TextInput
              label={t('profile.avatarUrl')}
              placeholder="https://example.com/avatar.png"
              {...form.getInputProps('avatarUrl')}
            />
            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <Info label={t('common.role')} value={roleLabel(user.role)} />
              <Info label={t('common.position')} value={user.position} />
              <Info label={t('common.email')} value={user.email} />
            </SimpleGrid>
            <Button type="submit" loading={saving} w={{ base: '100%', sm: 220 }}>
              {t('profile.save')}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}
