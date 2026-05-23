import { useMemo } from 'react';

import type { BusinessFlowTag, Priority, TaskRole } from '@/models/logistics';
import type { AppRole } from '@shared/auth/types';
import {
  useWorkspacePreferences,
  type AppearanceMode,
  type DensityPreference,
  type VisualTheme,
  type WorkspaceLanguage,
} from '@shared/preferences/WorkspacePreferencesContext';

import {
  appearanceModeLabels,
  currencyCountryLabels,
  densityLabels,
  departmentLabels,
  documentLabels,
  flowTagLabels,
  languageLabels,
  priorityLabels,
  roleLabels,
  searchKindLabels,
  shippingMethodLabels,
  statusLabels,
  taskRoleLabels,
  visualThemeLabels,
  type SearchKind,
  type ShippingMethod,
} from './labels';
import { dictionaries, en, type MessageKey } from './messages';

export type { MessageKey } from './messages';

type TranslationParams = Record<string, number | string | null | undefined>;

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
}

export function useI18n() {
  const { language } = useWorkspacePreferences();

  return useMemo(() => {
    const dictionary = dictionaries[language];

    return {
      language,
      appearanceModeLabel: (mode: AppearanceMode) => appearanceModeLabels[language][mode],
      densityLabel: (density: DensityPreference) => densityLabels[language][density],
      departmentLabel: (department: string) => departmentLabels[language][department] ?? department,
      currencyLabel: (currencyCode: string) => {
        const normalizedCode = currencyCode.toUpperCase();
        const country = currencyCountryLabels[language][normalizedCode];
        return country ? `${normalizedCode} (${country})` : normalizedCode;
      },
      documentLabel: (documentName: string) => documentLabels[language][documentName] ?? documentName,
      visualThemeLabel: (theme: VisualTheme) => visualThemeLabels[language][theme],
      flowTagLabel: (tag: BusinessFlowTag) => flowTagLabels[language][tag],
      formatNumber: (value: number) => value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'),
      languageLabel: (value: WorkspaceLanguage) => languageLabels[language][value],
      priorityLabel: (priority: Priority) => priorityLabels[language][priority],
      roleLabel: (role: AppRole) => roleLabels[language][role],
      searchKindLabel: (kind: SearchKind) => searchKindLabels[language][kind],
      shippingMethodLabel: (method: ShippingMethod) => shippingMethodLabels[language][method],
      statusLabel: (status: string) => statusLabels[language][status] ?? status,
      t: (key: MessageKey, params?: TranslationParams) => interpolate(dictionary[key] ?? en[key], params),
      taskRoleLabel: (role: TaskRole) => taskRoleLabels[language][role],
    };
  }, [language]);
}
