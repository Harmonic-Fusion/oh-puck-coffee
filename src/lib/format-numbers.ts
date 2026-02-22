/**
 * Number formatting utilities for consistent display throughout the app.
 */

// ── Temperature ─────────────────────────────────────────────────────

export type TempUnit = "C" | "F";

export const TEMP_UNIT_KEY = "coffee-temp-unit";

/** Fahrenheit → Celsius */
export function fToC(f: number): number {
  return parseFloat(((f - 32) * (5 / 9)).toFixed(1));
}

/** Celsius → Fahrenheit */
export function cToF(c: number): number {
  return parseFloat((c * (9 / 5) + 32).toFixed(1));
}

/** Read the persisted temperature unit from localStorage (defaults to "F"). */
export function getSavedTempUnit(): TempUnit {
  if (typeof window === "undefined") return "F";
  return (localStorage.getItem(TEMP_UNIT_KEY) as TempUnit) || "F";
}

/** Persist the temperature unit to localStorage. */
export function saveTempUnit(unit: TempUnit): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TEMP_UNIT_KEY, unit);
}

/**
 * Formats a temperature value (stored in Celsius) for display.
 * Converts to user's preferred unit and appends the degree symbol.
 *
 * @param celsiusValue  The temperature in °C (from the DB)
 * @param unit          The user's preferred display unit ("C" | "F")
 * @returns e.g. "93.3°C" or "200°F", or null if value is null/undefined
 */
export function formatTemp(
  celsiusValue: number | string | null | undefined,
  unit: TempUnit,
): string | null {
  if (celsiusValue == null) return null;
  const c = typeof celsiusValue === "string" ? parseFloat(celsiusValue) : celsiusValue;
  if (isNaN(c)) return null;

  if (unit === "F") {
    return `${roundToOneDecimal(cToF(c))}°F`;
  }
  return `${roundToOneDecimal(c)}°C`;
}

// ── Rounding ────────────────────────────────────────────────────────

/**
 * Rounds a number to at most one decimal place.
 * Removes trailing ".0" so whole numbers display cleanly.
 *
 * @returns The formatted string, or "-" if the value is null/undefined.
 */
export function roundToOneDecimal(
  value: number | string | null | undefined,
): string {
  if (value == null) return "-";
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "-";
  // Round to 1 decimal, then strip trailing .0
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}
