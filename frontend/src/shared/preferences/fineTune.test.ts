import { describe, expect, it } from 'vitest';
import { FINE_TUNE_LEVELS, FINE_TUNE_PRESETS_STORAGE_KEY, isFineTuneLevel, readFineTunePresets, validatePresetName, type FineTunePreset } from './fineTune';

const preset: FineTunePreset = { id: '1', name: 'Focus', colorIntensityLevel: 'high', dimLevel: 'medium', contrastLevel: 'max', transparencyLevel: 'low' };

describe('Fine Tune preset model', () => {
  it('validates levels and names', () => {
    FINE_TUNE_LEVELS.forEach((level) => expect(isFineTuneLevel(level)).toBe(true));
    expect(isFineTuneLevel('invalid')).toBe(false);
    expect(validatePresetName(' ', [])).toBe('required');
    expect(validatePresetName('x'.repeat(41), [])).toBe('too-long');
    expect(validatePresetName(' focus ', [preset])).toBe('duplicate');
    expect(validatePresetName('Focus', [preset], '1')).toBeNull();
  });

  it('loads only valid, uniquely named presets from storage', () => {
    const storage = { getItem: () => JSON.stringify([preset, { ...preset, id: '2', name: 'FOCUS' }, { id: 'bad' }]) };
    expect(readFineTunePresets(storage)).toEqual([preset]);
  });

  it('survives malformed persisted data', () => {
    expect(readFineTunePresets({ getItem: (key) => key === FINE_TUNE_PRESETS_STORAGE_KEY ? '{' : null })).toEqual([]);
  });
});
