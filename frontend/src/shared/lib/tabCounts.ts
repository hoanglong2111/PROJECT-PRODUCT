/**
 * Count items per status-filter tab, where `'all'` is the item total and every
 * other tab counts items whose status (via `getStatus`) is in `statusTabs[tab]`.
 * Used by list screens whose tab strip mirrors a status-filter (quotations,
 * quotation-requests, delivery-orders, ...).
 */
export function buildTabCounts<Tab extends string, Status, Item>(
  items: Item[],
  tabValues: readonly Tab[],
  statusTabs: Record<Exclude<Tab, 'all'>, Status[]>,
  getStatus: (item: Item) => Status,
): Record<Tab, number> {
  return tabValues.reduce(
    (counts, tab) => {
      if (tab === 'all') {
        counts[tab] = items.length;
        return counts;
      }
      const statuses = statusTabs[tab as Exclude<Tab, 'all'>];
      counts[tab] = items.filter((item) => statuses.includes(getStatus(item))).length;
      return counts;
    },
    {} as Record<Tab, number>,
  );
}
