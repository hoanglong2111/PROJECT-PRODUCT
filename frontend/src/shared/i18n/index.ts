import { useMemo } from 'react';

import type { BusinessFlowTag, Priority, TaskRole } from '@shared/model/logistics';
import type { AppRole } from '@shared/auth/types';
import {
  localeForLanguage,
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

function fallbackLabel(value: string) {
  return value
    .split('_')
    .map((part) => `${part.slice(0, 1)}${part.slice(1).toLowerCase()}`)
    .join(' ');
}

export function useI18n() {
  const { language } = useWorkspacePreferences();

  return useMemo(() => {
    const dictionary = dictionaries[language];
    const locale = localeForLanguage(language);
    // Locale-aware separators for money/number inputs (Mantine NumberInput props).
    // en-US: 1,234.56 · vi-VN: 1.234,56
    const numberSeparators =
      language === 'vi'
        ? { thousandSeparator: '.', decimalSeparator: ',' }
        : { thousandSeparator: ',', decimalSeparator: '.' };

    return {
      language,
      locale,
      numberSeparators,
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
      flowTagLabel: (tag: BusinessFlowTag) => flowTagLabels[language][tag] ?? tag,
      formatNumber: (value: number) => value.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'),
      languageLabel: (value: WorkspaceLanguage) => languageLabels[language][value],
      priorityLabel: (priority: Priority) => priorityLabels[language][priority],
      roleLabel: (role: AppRole) => roleLabels[language][role],
      searchKindLabel: (kind: SearchKind) => searchKindLabels[language][kind],
      shippingMethodLabel: (method: ShippingMethod) => shippingMethodLabels[language][method],
      statusLabel: (status: string) => statusLabels[language][status] ?? status,
      t: ((key: MessageKey, params?: TranslationParams) => interpolate(dictionary[key] ?? en[key], params)) as {
        (key: MessageKey, params?: TranslationParams): string;
        (key: string, params?: TranslationParams): string;
      },
      taskRoleLabel: (role: TaskRole) => taskRoleLabels[language][role] ?? fallbackLabel(role),
    };
  }, [language]);
}
