export type DelayBasis = {
  actualEntryDate: string | null;
  plannedEntryDate: string | null;
  warehouseDeadline: string;
};

const toDayNumber = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  return Math.floor(date.getTime() / 86_400_000);
};

export function calcDelay({ actualEntryDate, plannedEntryDate, warehouseDeadline }: DelayBasis) {
  const basisDate = actualEntryDate ?? plannedEntryDate;

  if (!basisDate) {
    return { days: 0, isLate: false, type: 'unknown' as const };
  }

  const days = toDayNumber(basisDate) - toDayNumber(warehouseDeadline);

  return {
    days,
    isLate: days > 0,
    type: actualEntryDate ? ('actual' as const) : ('forecast' as const),
  };
}
