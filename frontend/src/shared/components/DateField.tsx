import { DateInput, type DateInputProps } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { ChangeEventHandler } from 'react';

dayjs.extend(customParseFormat);

/**
 * App-wide single-date field. Wraps Mantine `DateInput` so the calendar is themed and
 * consistent, while still being a real text input the user can TYPE into by hand
 * (YYYY/MM/DD) — or pick from the dropdown calendar. Replaces native `<input type="date">`,
 * whose popup cannot be styled.
 *
 * Value contract is an ISO `YYYY-MM-DD` string — identical to the native date inputs it
 * replaces — so call sites and form/filter logic stay unchanged. Display is `YYYY/MM/DD`.
 */

const DISPLAY_FORMAT = 'YYYY/MM/DD';

/** Formats accepted when the user types by hand (lenient on separators / single digits). */
const ACCEPTED_INPUT_FORMATS = [
  'YYYY/MM/DD',
  'YYYY/M/D',
  'YYYY-MM-DD',
  'YYYY-M-D',
  'YYYY.MM.DD',
  'YYYY.M.D',
];

/** Formats raw digits as the logistics-standard date mask: YYYY/MM/DD. */
export function formatDateTypingInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;

  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

/** Parse user-typed text against YYYY/MM/DD (and a few lenient variants) → ISO `YYYY-MM-DD`. */
export function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = /^\d{8}$/.test(trimmed) ? formatDateTypingInput(trimmed) : trimmed;
  const parsed = dayjs(normalized, ACCEPTED_INPUT_FORMATS, true);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
}

export type DateFieldProps = Omit<
  DateInputProps,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: string | null;
  onChange?: (value: string | null) => void;
};

export function DateField({
  value = null,
  onChange,
  leftSection,
  valueFormat = DISPLAY_FORMAT,
  clearable = true,
  highlightToday = true,
  dateParser = parseDateInput,
  placeholder = DISPLAY_FORMAT,
  maxLength,
  onChangeCapture,
  popoverProps,
  className,
  ...rest
}: DateFieldProps) {
  const handleChangeCapture: ChangeEventHandler<HTMLInputElement> = (event) => {
    const input = event.currentTarget;
    const formattedValue = formatDateTypingInput(input.value);

    if (formattedValue !== input.value) {
      input.value = formattedValue;
    }

    onChangeCapture?.(event);
  };

  return (
    <DateInput
      {...rest}
      value={value || null}
      onChange={onChange}
      valueFormat={valueFormat}
      placeholder={placeholder}
      maxLength={maxLength ?? DISPLAY_FORMAT.length}
      clearable={clearable}
      highlightToday={highlightToday}
      dateParser={dateParser}
      onChangeCapture={handleChangeCapture}
      leftSection={leftSection ?? <IconCalendar size={16} stroke={1.5} />}
      popoverProps={{ position: 'bottom-start', withinPortal: true, shadow: 'md', ...popoverProps }}
      className={['kbfe-date-field', className].filter(Boolean).join(' ')}
    />
  );
}
