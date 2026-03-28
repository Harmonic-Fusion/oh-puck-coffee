/**
 * Known entitlement lookup keys (must match Stripe product entitlements).
 * Importable by both client and server code.
 */
export const Entitlements = {
  NO_SHOT_VIEW_LIMIT: "no-shot-view-limit",
  STATS_VIEW: "stats-view",
  BEANS_SHARE: "beans-share",
  /** Higher / unlimited photo limits vs free tier caps. */
  PHOTO_UPLOADS: "photo-uploads",
} as const;

export type EntitlementKey = (typeof Entitlements)[keyof typeof Entitlements];

/** Entitlements granted to all users on the free tier. */
export const FreeEntitlementDefaults: EntitlementKey[] = [
  Entitlements.NO_SHOT_VIEW_LIMIT,
  Entitlements.STATS_VIEW,
  Entitlements.BEANS_SHARE,
];

/**
 * Returns true if the entitlements array includes the given lookup key.
 * Pure function — safe to import in client components.
 */
export function hasEntitlement(
  entitlements: string[] | undefined,
  key: EntitlementKey,
): boolean {
  return entitlements?.includes(key) ?? false;
}
