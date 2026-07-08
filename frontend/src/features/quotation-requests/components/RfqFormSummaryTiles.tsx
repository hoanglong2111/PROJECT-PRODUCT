import { SimpleGrid } from '@mantine/core';

import { SummaryTile } from '@shared/components/order-intake';
import { formatMoney } from '@shared/utils/money';

import type { TFn } from '../model/quotationRequestModel';
import type { RfqFormApi } from '../hooks/useQuotationRequestForm';

export function RfqFormSummaryTiles({ form, t }: { form: RfqFormApi; t: TFn }) {
  const { cargoMetric, customerRef, incoterm, requestTotal, selectedSupplier, totalCbm } = form;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
      <SummaryTile label={t('quotationRequests.field.customerRef')} value={customerRef || 'KBI'} />
      <SummaryTile label={t('quotationRequests.field.supplier')} value={selectedSupplier?.supplier_name ?? '-'} />
      <SummaryTile label={t('quotationRequests.field.incoterm')} value={incoterm ?? '-'} />
      {cargoMetric ? (
        <SummaryTile
          label={cargoMetric.label}
          hint={cargoMetric.hint}
          value={cargoMetric.value}
          tone="accent"
        />
      ) : null}
      <SummaryTile
        label={t('quotationRequests.totalCbm')}
        hint={t('quotationRequests.field.volumeDerivedHint')}
        value={Number(totalCbm.toFixed(4)).toLocaleString()}
      />
      <SummaryTile
        label={t('quotationRequests.field.requestTotalUsd')}
        value={formatMoney(requestTotal, 'USD')}
        tone="accent"
      />
    </SimpleGrid>
  );
}
