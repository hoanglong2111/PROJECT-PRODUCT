export type FineTuneLevel = 'light' | 'medium' | 'high' | 'extra-high' | 'max' | 'ultra';
export type SurfaceTransparency = 'low' | 'medium' | 'high' | 'extra-high' | 'max' | 'ultra';

export type FineTuneSettings = {
  colorIntensityLevel: FineTuneLevel;
  contrastLevel: FineTuneLevel;
  dimLevel: FineTuneLevel;
  transparencyLevel: SurfaceTransparency;
};

export type FineTunePreset = FineTuneSettings & {
  id: string;
  name: string;
};

export const FINE_TUNE_LEVELS: FineTuneLevel[] = ['light', 'medium', 'high', 'extra-high', 'max', 'ultra'];
export const TRANSPARENCY_LEVELS: SurfaceTransparency[] = ['low', 'medium', 'high', 'extra-high', 'max', 'ultra'];
export const DEFAULT_FINE_TUNE_SETTINGS: FineTuneSettings = {
  colorIntensityLevel: 'light',
  contrastLevel: 'light',
  dimLevel: 'light',
  transparencyLevel: 'low',
};

export const FINE_TUNE_PRESETS_STORAGE_KEY = 'kbfe.preferences.fine-tune-presets';

export function isFineTuneLevel(value: unknown): value is FineTuneLevel {
  return typeof value === 'string' && FINE_TUNE_LEVELS.includes(value as FineTuneLevel);
}

export function isSurfaceTransparency(value: unknown): value is SurfaceTransparency {
  return typeof value === 'string' && TRANSPARENCY_LEVELS.includes(value as SurfaceTransparency);
}

export function validatePresetName(name: string, presets: FineTunePreset[], exceptId?: string): string | null {
  const normalized = name.trim();
  if (!normalized) return 'required';
  if (normalized.length > 40) return 'too-long';
  if (presets.some((preset) => preset.id !== exceptId && preset.name.trim().toLocaleLowerCase() === normalized.toLocaleLowerCase())) {
    return 'duplicate';
  }
  return null;
}

export function readFineTunePresets(storage: Pick<Storage, 'getItem'> | undefined): FineTunePreset[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(FINE_TUNE_PRESETS_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    const names = new Set<string>();
    return parsed.filter((item): item is FineTunePreset => {
      if (!item || typeof item !== 'object') return false;
      const value = item as Partial<FineTunePreset>;
      const name = typeof value.name === 'string' ? value.name.trim() : '';
      const normalized = name.toLocaleLowerCase();
      const valid = typeof value.id === 'string' && value.id.length > 0 && name.length > 0 && name.length <= 40
        && isFineTuneLevel(value.colorIntensityLevel) && isFineTuneLevel(value.dimLevel)
        && isFineTuneLevel(value.contrastLevel) && isSurfaceTransparency(value.transparencyLevel)
        && !names.has(normalized);
      if (valid) {
        value.name = name;
        names.add(normalized);
      }
      return valid;
    });
  } catch {
    return [];
  }
}
