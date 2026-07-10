export const STATUS_COLOR_VARS: Record<string, string> = {
  blue: 'var(--kbfe-status-blue)',
  cyan: 'var(--kbfe-status-cyan)',
  gray: 'var(--kbfe-status-gray)',
  green: 'var(--kbfe-status-teal)',
  orange: 'var(--kbfe-status-orange)',
  red: 'var(--kbfe-status-red)',
  teal: 'var(--kbfe-status-teal)',
  yellow: 'var(--kbfe-status-yellow)',
};

export function statusColorVar(colorName: string): string {
  return STATUS_COLOR_VARS[colorName] ?? 'var(--kbfe-primary-color)';
}
