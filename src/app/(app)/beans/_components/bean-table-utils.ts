export function multiSelectFilterFn(
  rowValue: string | null | undefined,
  filterValues: string[],
): boolean {
  if (!filterValues || filterValues.length === 0) return true;
  if (rowValue == null) return false;
  return filterValues.includes(rowValue);
}

export function dateRangeFilterFn(
  rowValue: Date | string | null | undefined,
  filterValue: [string, string],
): boolean {
  if (!filterValue || (!filterValue[0] && !filterValue[1])) return true;
  if (!rowValue) return false;
  const d = new Date(rowValue).getTime();
  if (filterValue[0] && d < new Date(filterValue[0]).getTime()) return false;
  if (filterValue[1]) {
    const toEnd = new Date(filterValue[1]);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd.getTime()) return false;
  }
  return true;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
