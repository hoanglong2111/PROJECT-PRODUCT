import { Avatar, Button, FileInput, Group, Stack, Text, TextInput } from '@mantine/core';
import type { ComponentProps } from 'react';
import { IconUpload } from '@tabler/icons-react';

import { useI18n } from '@shared/i18n';

type AvatarUploadProps = {
  avatarSrc: string | null | undefined;
  clearDisabled: boolean;
  error: string | null;
  initials: string;
  onClear: () => void;
  onFileSelect: (file: File | null) => void;
  urlInputProps: ComponentProps<typeof TextInput>;
};

export function AvatarUpload({ avatarSrc, clearDisabled, error, initials, onClear, onFileSelect, urlInputProps }: AvatarUploadProps) {
  const { t } = useI18n();

  return (
    <Group align="flex-start" gap="md" wrap="nowrap">
      <Avatar src={avatarSrc} radius="xl" size={96}>
        {initials}
      </Avatar>
      <Stack gap="xs" style={{ flex: 1 }}>
        <FileInput
          accept="image/png,image/jpeg,image/webp"
          clearable
          leftSection={<IconUpload size={16} />}
          label={t('profile.avatarUpload')}
          onChange={onFileSelect}
        />
        <TextInput
          label={t('profile.avatarUrl')}
          placeholder="https://example.com/avatar.png"
          {...urlInputProps}
        />
        {error ? (
          <Text c="red" size="sm">
            {error}
          </Text>
        ) : null}
        <Button disabled={clearDisabled} onClick={onClear} size="xs" variant="subtle">
          {t('profile.avatarClear')}
        </Button>
      </Stack>
    </Group>
  );
}
