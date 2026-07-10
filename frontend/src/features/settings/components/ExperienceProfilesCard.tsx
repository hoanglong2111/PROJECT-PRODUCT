import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  IconAccessible,
  IconLayoutDashboard,
  IconSunLow,
  IconTargetArrow,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useI18n } from '@shared/i18n';
import { EXPERIENCE_PROFILES } from '@shared/preferences/experienceProfiles';
import type { ExperienceProfile } from '@shared/preferences/WorkspacePreferencesContext';

const PROFILE_ICONS: Record<ExperienceProfile, ReactNode> = {
  'operational-focus': <IconTargetArrow size={20} />,
  overview: <IconLayoutDashboard size={20} />,
  'eye-comfort': <IconSunLow size={20} />,
  accessible: <IconAccessible size={20} />,
};

type Props = {
  experienceProfile: ExperienceProfile;
  isCustomized: boolean;
  onChange: (profile: ExperienceProfile) => void;
  onReset: () => void;
};

export function ExperienceProfilesCard({ experienceProfile, isCustomized, onChange, onReset }: Props) {
  const { t } = useI18n();

  return (
    <Paper withBorder p="lg" className="dl-data-panel">
      <Stack gap="md">
        <div>
          <Text fw={700}>{t('settings.profiles')}</Text>
          <Text c="dimmed" size="sm">
            {t('settings.profilesDescription')}
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }}>
          {EXPERIENCE_PROFILES.map((profile) => {
            const isActive = profile === experienceProfile;
            return (
              <button
                aria-pressed={isActive}
                className={`settings-profile-option${isActive ? ' is-active' : ''}`}
                key={profile}
                onClick={() => onChange(profile)}
                type="button"
              >
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <span className="settings-profile-option-icon">{PROFILE_ICONS[profile]}</span>
                  <div>
                    <Group gap="xs">
                      <Text fw={600} size="sm">
                        {t(`settings.profileOption.${profile}`)}
                      </Text>
                      {isActive ? (
                        <Badge size="xs" variant="filled">
                          {isCustomized ? t('settings.profileCustomized') : t('settings.profileActive')}
                        </Badge>
                      ) : null}
                    </Group>
                    <Text c="dimmed" size="xs">
                      {t(`settings.profileOption.${profile}Description`)}
                    </Text>
                  </div>
                </Group>
              </button>
            );
          })}
        </SimpleGrid>

        {isCustomized ? (
          <Group gap="sm">
            <Button onClick={onReset} size="compact-sm" variant="light">
              {t('settings.resetToProfile')}
            </Button>
            <Text c="dimmed" size="xs">
              {t('settings.profileCustomizedHint')}
            </Text>
          </Group>
        ) : null}
      </Stack>
    </Paper>
  );
}
