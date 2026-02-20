// Special grinders that should appear at the top of the list
export const SPECIAL_GRINDERS = ["Pre-ground"] as const;

export function isSpecialGrinder(name: string): boolean {
  return SPECIAL_GRINDERS.includes(name as typeof SPECIAL_GRINDERS[number]);
}
