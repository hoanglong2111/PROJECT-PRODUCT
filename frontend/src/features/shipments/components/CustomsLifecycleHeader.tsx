import { Badge, Group, Paper, Stepper, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';

import type { CustomsDeclarationV1 } from '@shared/api/customsDeclarations';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { channelColor, channelHintKey, channelLabelKey, customsStageIndex } from '../model/shipmentModel';

const STAGE_KEYS = [
  'shipments.customsStageDraft',
  'shipments.customsStageDraftOpened',
  'shipments.customsStageOfficialOpened',
  'shipments.customsStageCleared',
] as const;

export function CustomsLifecycleHeader({ declaration }: { declaration: CustomsDeclarationV1 }) {
  const { t } = useI18n();
  const { index, cancelled } = customsStageIndex(declaration.status);

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Group gap="xs">
            <Text fw={700}>{declaration.declaration_no ?? t('shipments.draftDeclaration')}</Text>
            <StatusBadge status={declaration.status} />
            {declaration.customs_channel ? (
              <Tooltip label={t(channelHintKey(declaration.customs_channel))}>
                <Badge color={channelColor(declaration.customs_channel)}>
                  {t(channelLabelKey(declaration.customs_channel))}
                </Badge>
              </Tooltip>
            ) : null}
          </Group>
          <Text size="sm" c="dimmed">
            {declaration.broker?.supplier_name ?? t('shipments.noBroker')} · {declaration.note ?? t('shipments.noNote')}
          </Text>
        </div>
      </Group>

      <Stepper
        active={cancelled ? 4 : index}
        size="sm"
        styles={{ step: { minWidth: 0 } }}
      >
        {STAGE_KEYS.map((key, i) => (
          <Stepper.Step
            key={key}
            label={t(key)}
            color={cancelled && i === 3 ? 'red' : undefined}
            completedIcon={cancelled && i === 3 ? <IconX size={14} /> : <IconCheck size={14} />}
          />
        ))}
      </Stepper>
    </Paper>
  );
}
