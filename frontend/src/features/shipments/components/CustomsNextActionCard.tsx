import { Alert, Button, Group, Paper, Select, Stack, Text, TextInput } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { UseMutationResult } from '@tanstack/react-query';

import type { CustomsDeclarationChannelV1, CustomsDeclarationV1 } from '@shared/api/customsDeclarations';
import { DateTimeText } from '@shared/components/DateTimeText';
import { useI18n } from '@shared/i18n';

import { customsNextAction } from '../model/shipmentModel';

export function CustomsNextActionCard({
  declaration,
  officialNo,
  setOfficialNo,
  officialChannel,
  setOfficialChannel,
  clearNote,
  setClearNote,
  channelOptions,
  actionMutation,
}: {
  declaration: CustomsDeclarationV1;
  officialNo: string;
  setOfficialNo: (v: string) => void;
  officialChannel: CustomsDeclarationChannelV1;
  setOfficialChannel: (v: CustomsDeclarationChannelV1) => void;
  clearNote: string;
  setClearNote: (v: string) => void;
  channelOptions: Array<{ label: string; value: CustomsDeclarationChannelV1 }>;
  actionMutation: UseMutationResult<CustomsDeclarationV1, Error, 'open-draft' | 'open-official' | 'clear' | 'cancel'>;
}) {
  const { t } = useI18n();
  const next = customsNextAction(declaration.status);

  if (declaration.status === 'CLEARED') {
    return (
      <Alert color="teal" icon={<IconCheck size={18} />}>
        <Text fw={600}>{t('shipments.clearedSummary')}</Text>
        {declaration.cleared_at ? (
          <Text size="sm" c="dimmed">
            {t('shipments.clearedAt')}: <DateTimeText value={declaration.cleared_at} size="sm" c="dimmed" showZone />
          </Text>
        ) : null}
      </Alert>
    );
  }

  if (declaration.status === 'CANCELLED') {
    return (
      <Alert color="red" icon={<IconX size={18} />}>
        <Text fw={600}>{t('shipments.cancelledSummary')}</Text>
        {declaration.cancel_reason ? (
          <Text size="sm">{declaration.cancel_reason}</Text>
        ) : null}
      </Alert>
    );
  }

  if (!next) return null;

  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={600} size="sm" tt="uppercase" c="dimmed">{t('shipments.customsNextAction')}</Text>

        {next.action === 'open-draft' ? (
          <Group>
            <Button
              loading={actionMutation.isPending}
              onClick={() => actionMutation.mutate('open-draft')}
            >
              {t('shipments.openDraft')}
            </Button>
          </Group>
        ) : null}

        {next.action === 'open-official' ? (
          <Group align="flex-end" gap="sm">
            <TextInput
              label={t('shipments.officialNo')}
              value={officialNo}
              onChange={(e) => setOfficialNo(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              label={t('shipments.officalChannel')}
              data={channelOptions}
              value={officialChannel}
              onChange={(v) => setOfficialChannel((v as CustomsDeclarationChannelV1 | null) ?? 'YELLOW')}
              style={{ flex: 1 }}
            />
            <Button
              disabled={!officialNo}
              loading={actionMutation.isPending}
              onClick={() => actionMutation.mutate('open-official')}
            >
              {t('shipments.openOfficial')}
            </Button>
          </Group>
        ) : null}

        {next.action === 'clear' ? (
          <Group align="flex-end" gap="sm">
            <TextInput
              label={t('shipments.clearNote')}
              value={clearNote}
              onChange={(e) => setClearNote(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button
              color="teal"
              loading={actionMutation.isPending}
              onClick={() => actionMutation.mutate('clear')}
            >
              {t('shipments.clearCustoms')}
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
