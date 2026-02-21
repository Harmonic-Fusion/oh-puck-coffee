/**
 * Helper functions for converting flavorWheelBody between form format (string[]) and database format (TEXT)
 * 
 * Database stores as TEXT (JSON string for arrays, plain string for backward compatibility)
 * Form expects string[] (new format) or string (old format)
 */

/**
 * Convert flavorWheelBody from form format to database format
 * - string[] → JSON string
 * - string → string (backward compatibility)
 * - null/undefined → null
 */
export function flavorBodyToDb(
  value: string | string[] | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value; // Backward compatibility
  if (Array.isArray(value)) return JSON.stringify(value);
  return null;
}

/**
 * Convert flavorWheelBody from database format to form format
 * - JSON string → string[]
 * - Plain string → string (backward compatibility)
 * - null → null
 */
export function flavorBodyFromDb(
  value: string | null | undefined
): string | string[] | null {
  if (!value) return null;
  // Try to parse as JSON (new format)
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON, return as string (backward compatibility)
  }
  return value;
}
