import { Badge, Group, Stack, Text } from '@mantine/core';

import type { ItemTaxProfile } from '@shared/api/items';

import { formatRate } from '../model/masterDataModel';

export function TaxProfilesCell({
  isLoading,
  loadingLabel,
  preferentialLabel,
  profiles,
}: {
  isLoading: boolean;
  loadingLabel: string;
  preferentialLabel: string;
  profiles: ItemTaxProfile[];
}) {
  if (isLoading) {
    return (
      <Text size="xs" c="dimmed">
        {loadingLabel}
      </Text>
    );
  }

  if (profiles.length === 0) {
    return <Text c="dimmed">-</Text>;
  }

  return (
    <Stack gap={4}>
      {profiles.slice(0, 3).map((profile) => (
        <Stack key={profile.id} gap={2}>
          <Group gap={6} wrap="nowrap">
            <Badge color={profile.is_default ? 'teal' : 'gray'} variant="light">
              {profile.hs_code || 'HS -'}
            </Badge>
            <Text size="xs" c="dimmed">
              {formatRate(profile.import_duty_rate)} / {formatRate(profile.vat_rate)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {[profile.co_form, profile.customs_type, profile.co_tax_note, profile.customs_note]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {[profile.reference_doc_no, profile.location_code, profile.tax_note]
              .filter(Boolean)
              .join(' | ') || '-'}
          </Text>
          {profile.preferential_import_duty_rate !== null &&
          profile.preferential_import_duty_rate !== undefined ? (
            <Text size="xs" c="dimmed">
              {preferentialLabel}: {formatRate(profile.preferential_import_duty_rate)}
            </Text>
          ) : null}
        </Stack>
      ))}
      {profiles.length > 3 ? (
        <Text size="xs" c="dimmed">
          +{profiles.length - 3}
        </Text>
      ) : null}
    </Stack>
  );
}
