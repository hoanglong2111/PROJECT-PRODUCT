import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';

import type { Currency } from '@shared/api/tradeMasterData';
import { FieldHint } from '@shared/components/FieldHint';
import { useI18n } from '@shared/i18n';

type CurrencySelectProps = Omit<SelectProps, 'data' | 'value' | 'onChange'> & {
  currencies: Currency[];
  value: string | null;
  onChange: (value: string | null) => void;
  wrapperClassName?: string;
};

// Renders currencies by their short display symbol (e.g. "$", "₫") instead of the
// verbose "USD - United States Dollar" label, since the dropdown is used inline in
// dense fee rows. The full code/name/decimal-places still surface via a hover hint,
// so the short label never hides which currency is actually selected.
export function CurrencySelect({
  currencies,
  value,
  onChange,
  wrapperClassName,
  ...selectProps
}: CurrencySelectProps) {
  const { t } = useI18n();
  const data = useMemo(
    () => currencies.map((currency) => ({ value: currency.currency_code, label: currency.symbol || currency.currency_code })),
    [currencies],
  );
  const selected = useMemo(
    () => currencies.find((currency) => currency.currency_code === value) ?? null,
    [currencies, value],
  );
  const hint = selected
    ? `${selected.currency_code} - ${selected.currency_name} · ${t('quotations.currencyDecimalsLabel')}: ${selected.decimal_places}`
    : null;

  return (
    <div className={['rfq-currency-select', wrapperClassName].filter(Boolean).join(' ')}>
      <Select data={data} value={value} onChange={onChange} {...selectProps} />
      {hint ? <FieldHint label={hint} size={13} /> : null}
    </div>
  );
}
