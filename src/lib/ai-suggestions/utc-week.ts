/**
 * Start of the ISO-style week with Monday 00:00:00.000 UTC (inclusive lower bound for usage).
 */
export function getUtcMondayStart(reference: Date): Date {
  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth();
  const day = reference.getUTCDate();
  const d = new Date(Date.UTC(y, m, day));
  const dow = d.getUTCDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
