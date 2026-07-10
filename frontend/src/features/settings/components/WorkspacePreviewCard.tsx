import { Badge, Button, Group, Paper, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconEye } from '@tabler/icons-react';
import { useState } from 'react';
import { useI18n } from '@shared/i18n';
import {
  useWorkspacePreferences,
  type ResolvedColorScheme,
} from '@shared/preferences/WorkspacePreferencesContext';

/* Simulated workspace (shell + KPI + table rows + action zone) scoped to its
   own light/dark tokens (settings.css) so the user can preview the other
   scheme WITHOUT switching the whole app — Apply is what writes the
   preference. Status is always icon + label, never color alone. */
export function WorkspacePreviewCard() {
  const { t } = useI18n();
  const { resolvedColorScheme, setAppearanceMode } = useWorkspacePreferences();
  const [previewScheme, setPreviewScheme] = useState<ResolvedColorScheme>(resolvedColorScheme);
  const isDirty = previewScheme !== resolvedColorScheme;

  return (
    <Paper withBorder p="lg" className="dl-data-panel">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <IconEye size={20} />
            <div>
              <Text fw={700}>{t('settings.preview')}</Text>
              <Text c="dimmed" size="sm">
                {t('settings.previewDescription')}
              </Text>
            </div>
          </Group>
          <Group gap="sm">
            <SegmentedControl
              data={[
                { label: t('settings.previewLight'), value: 'light' },
                { label: t('settings.previewDark'), value: 'dark' },
              ]}
              onChange={(value) => setPreviewScheme(value as ResolvedColorScheme)}
              size="xs"
              value={previewScheme}
            />
            <Button disabled={!isDirty} onClick={() => setAppearanceMode(previewScheme)} size="compact-sm">
              {t('settings.previewApply')}
            </Button>
            <Button
              disabled={!isDirty}
              onClick={() => setPreviewScheme(resolvedColorScheme)}
              size="compact-sm"
              variant="default"
            >
              {t('settings.previewUndo')}
            </Button>
          </Group>
        </Group>

        <div className="settings-workspace-preview" data-preview-scheme={previewScheme}>
          <div className="settings-workspace-preview-sidebar" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="settings-workspace-preview-main">
            <div className="settings-workspace-preview-header">
              <span className="settings-workspace-preview-title" aria-hidden />
              <span className="settings-workspace-preview-action">{t('settings.previewPrimaryAction')}</span>
            </div>

            <div className="settings-workspace-preview-kpis">
              <div className="settings-workspace-preview-kpi">
                <span className="settings-workspace-preview-kpi-value">128</span>
                <span className="settings-workspace-preview-kpi-label">{t('settings.previewKpiShipments')}</span>
              </div>
              <div className="settings-workspace-preview-kpi">
                <span className="settings-workspace-preview-kpi-value">96%</span>
                <span className="settings-workspace-preview-kpi-label">{t('settings.previewKpiOnTime')}</span>
              </div>
            </div>

            <table className="settings-workspace-preview-table">
              <thead>
                <tr>
                  <th>{t('settings.previewTableRef')}</th>
                  <th>{t('settings.previewTableStatus')}</th>
                  <th>{t('settings.previewTableOwner')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SHP-2481</td>
                  <td>
                    <Badge
                      color="teal"
                      leftSection={<IconCircleCheck size={12} />}
                      size="xs"
                      variant="light"
                    >
                      {t('settings.previewStatusOnTrack')}
                    </Badge>
                  </td>
                  <td>L. Hoang</td>
                </tr>
                <tr>
                  <td>SHP-2477</td>
                  <td>
                    <Badge
                      color="red"
                      leftSection={<IconAlertTriangle size={12} />}
                      size="xs"
                      variant="light"
                    >
                      {t('settings.previewStatusAtRisk')}
                    </Badge>
                  </td>
                  <td>M. Tran</td>
                </tr>
              </tbody>
            </table>

            <div className="settings-workspace-preview-next">
              <span className="settings-workspace-preview-next-label">{t('settings.previewNextAction')}</span>
              <span>{t('settings.previewNextActionLabel')}</span>
            </div>
          </div>
        </div>
      </Stack>
    </Paper>
  );
}
