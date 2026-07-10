import { useQuery } from '@tanstack/react-query';

import { fetchChargeCodes } from '@shared/api/chargeCodes';
import { fetchUoms } from '@shared/api/uoms';
import { queryKeys } from '@shared/api/queryKeys';

/** Master-data lookups needed by the quotation form (charge codes + UOMs). */
export function useQuotationFormData() {
  const chargeCodesQuery = useQuery({
    queryKey: queryKeys.chargeCodes({ page: 1, limit: 200, is_active: true }),
    queryFn: () => fetchChargeCodes({ page: 1, limit: 200, is_active: true }),
  });

  const uomsQuery = useQuery({
    queryKey: queryKeys.uoms({ limit: 200, is_active: true }),
    queryFn: () => fetchUoms({ limit: 200, is_active: true }),
  });

  return { chargeCodesQuery, uomsQuery };
}
