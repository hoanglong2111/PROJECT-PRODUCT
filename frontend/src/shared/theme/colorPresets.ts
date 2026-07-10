export type ColorPresetId =
  | 'teal'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'midnight'
  | 'lavender'
  | 'rose'
  | 'amber'
  | 'slate'
  | 'aurora';

export type ColorPreset = {
  id: ColorPresetId;
  primaryColor: string;
  colors: {
    light: readonly string[];
    dark: readonly string[];
  };
};

export const colorPresets: Record<ColorPresetId, ColorPreset> = {
  teal: {
    id: 'teal',
    primaryColor: 'teal',
    colors: {
      light: [
        '#e6fffa',
        '#b2f5ea',
        '#81e6d9',
        '#4fd1c5',
        '#38b2ac',
        '#319795',
        '#2c7a7b',
        '#285e61',
        '#234e52',
        '#1d4044',
      ],
      dark: [
        '#1d4044',
        '#234e52',
        '#285e61',
        '#2c7a7b',
        '#319795',
        '#38b2ac',
        '#4fd1c5',
        '#81e6d9',
        '#b2f5ea',
        '#e6fffa',
      ],
    },
  },
  ocean: {
    id: 'ocean',
    primaryColor: 'blue',
    colors: {
      light: [
        '#ebf8ff',
        '#bee3f8',
        '#90cdf4',
        '#63b3ed',
        '#4299e1',
        '#3182ce',
        '#2b6cb0',
        '#2c5282',
        '#2a4365',
        '#1a365d',
      ],
      dark: [
        '#1a365d',
        '#2a4365',
        '#2c5282',
        '#2b6cb0',
        '#3182ce',
        '#4299e1',
        '#63b3ed',
        '#90cdf4',
        '#bee3f8',
        '#ebf8ff',
      ],
    },
  },
  forest: {
    id: 'forest',
    primaryColor: 'green',
    colors: {
      light: [
        '#f0fff4',
        '#c6f6d5',
        '#9ae6b4',
        '#68d391',
        '#48bb78',
        '#38a169',
        '#2f855a',
        '#276749',
        '#22543d',
        '#1c4532',
      ],
      dark: [
        '#1c4532',
        '#22543d',
        '#276749',
        '#2f855a',
        '#38a169',
        '#48bb78',
        '#68d391',
        '#9ae6b4',
        '#c6f6d5',
        '#f0fff4',
      ],
    },
  },
  sunset: {
    id: 'sunset',
    primaryColor: 'orange',
    colors: {
      light: [
        '#fffaf0',
        '#feebc8',
        '#fbd38d',
        '#f6ad55',
        '#ed8936',
        '#dd6b20',
        '#c05621',
        '#9c4221',
        '#7b341e',
        '#652b19',
      ],
      dark: [
        '#652b19',
        '#7b341e',
        '#9c4221',
        '#c05621',
        '#dd6b20',
        '#ed8936',
        '#f6ad55',
        '#fbd38d',
        '#feebc8',
        '#fffaf0',
      ],
    },
  },
  midnight: {
    id: 'midnight',
    primaryColor: 'indigo',
    colors: {
      light: [
        '#ebf4ff',
        '#c3dafe',
        '#a3bffa',
        '#7f9cf5',
        '#667eea',
        '#5a67d8',
        '#4c51bf',
        '#434190',
        '#3c366b',
        '#342d5e',
      ],
      dark: [
        '#342d5e',
        '#3c366b',
        '#434190',
        '#4c51bf',
        '#5a67d8',
        '#667eea',
        '#7f9cf5',
        '#a3bffa',
        '#c3dafe',
        '#ebf4ff',
      ],
    },
  },
  lavender: {
    id: 'lavender',
    primaryColor: 'violet',
    colors: {
      light: [
        '#faf5ff',
        '#e9d8fd',
        '#d6bcfa',
        '#b794f4',
        '#9f7aea',
        '#805ad5',
        '#6b46c1',
        '#553c9a',
        '#44337a',
        '#322659',
      ],
      dark: [
        '#322659',
        '#44337a',
        '#553c9a',
        '#6b46c1',
        '#805ad5',
        '#9f7aea',
        '#b794f4',
        '#d6bcfa',
        '#e9d8fd',
        '#faf5ff',
      ],
    },
  },
  rose: {
    id: 'rose',
    primaryColor: 'pink',
    colors: {
      light: [
        '#fff5f7',
        '#fed7e2',
        '#fbb6ce',
        '#f687b3',
        '#ed64a6',
        '#d53f8c',
        '#b83280',
        '#97266d',
        '#702459',
        '#521b41',
      ],
      dark: [
        '#521b41',
        '#702459',
        '#97266d',
        '#b83280',
        '#d53f8c',
        '#ed64a6',
        '#f687b3',
        '#fbb6ce',
        '#fed7e2',
        '#fff5f7',
      ],
    },
  },
  amber: {
    id: 'amber',
    primaryColor: 'yellow',
    colors: {
      light: [
        '#fffff0',
        '#fefcbf',
        '#faf089',
        '#f6e05e',
        '#ecc94b',
        '#d69e2e',
        '#b7791f',
        '#975a16',
        '#744210',
        '#5f370e',
      ],
      dark: [
        '#5f370e',
        '#744210',
        '#975a16',
        '#b7791f',
        '#d69e2e',
        '#ecc94b',
        '#f6e05e',
        '#faf089',
        '#fefcbf',
        '#fffff0',
      ],
    },
  },
  slate: {
    id: 'slate',
    primaryColor: 'gray',
    colors: {
      light: [
        '#f7fafc',
        '#edf2f7',
        '#e2e8f0',
        '#cbd5e0',
        '#a0aec0',
        '#718096',
        '#4a5568',
        '#2d3748',
        '#1a202c',
        '#171923',
      ],
      dark: [
        '#171923',
        '#1a202c',
        '#2d3748',
        '#4a5568',
        '#718096',
        '#a0aec0',
        '#cbd5e0',
        '#e2e8f0',
        '#edf2f7',
        '#f7fafc',
      ],
    },
  },
  aurora: {
    id: 'aurora',
    primaryColor: 'cyan',
    colors: {
      light: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
      dark: ['#164e63', '#155e75', '#0e7490', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe', '#ecfeff'],
    },
  },
};

export const defaultColorPresetId: ColorPresetId = 'teal';
