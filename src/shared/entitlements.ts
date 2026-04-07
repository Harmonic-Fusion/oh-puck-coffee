interface EntitlementDef {
  key: string;
  label: string;
  description: string;
}

/**
 * Single source of truth for every entitlement.
 * Keys must match the Stripe product entitlement lookup keys.
 * Importable by both client and server code.
 */
export const EntitlementDefs = {
  NO_SHOT_VIEW_LIMIT: {
    key: "no-shot-view-limit",
    label: "No shot view limit",
    description:
      "Access your complete shot history with no cap on older entries",
  },
  STATS_VIEW: {
    key: "stats-view",
    label: "Stats view",
    description:
      "Detailed analytics, trends, and insights across all your shots",
  },
  BEANS_SHARE: {
    key: "beans-share",
    label: "Bean share",
    description: "Share beans with others and allow them to reshare",
  },
  PHOTO_UPLOADS: {
    key: "photo-uploads",
    label: "Photo uploads",
    description:
      "Higher limits for attaching photos to shots and storing image data",
  },
  AI_SHOT_SUGGESTIONS: {
    key: "ai-shot-suggestions",
    label: "AI shot suggestions",
    description: "AI-powered suggestions to dial in your next shot",
  },
  AI_SHOT_SUGGESTIONS_PLUS: {
    key: "ai-shot-suggestions-plus",
    label: "AI shot suggestions (Double Shot)",
    description:
      "Higher weekly limit for AI-powered dialing-in suggestions",
  },
} as const satisfies Record<string, EntitlementDef>;

/** Slug-only lookup (backwards-compatible with existing call-sites). */
export const Entitlements = Object.fromEntries(
  Object.entries(EntitlementDefs).map(([name, def]) => [name, def.key]),
) as { [K in keyof typeof EntitlementDefs]: (typeof EntitlementDefs)[K]["key"] };

export type EntitlementKey = (typeof Entitlements)[keyof typeof Entitlements];

/** Full list of entitlement keys (order stable). */
export const ALL_ENTITLEMENT_KEYS = Object.values(
  Entitlements,
) as EntitlementKey[];

const defsByKey = new Map(
  Object.values(EntitlementDefs).map((d) => [d.key, d]),
);

/** Look up the full definition (label, description) for an entitlement slug. */
export function getEntitlementDef(key: EntitlementKey): EntitlementDef {
  return defsByKey.get(key)!;
}

/** Entitlements granted to all users on the free tier. */
export const FreeEntitlementDefaults: EntitlementKey[] = [];

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

/** Weekly cap for user-initiated AI shot suggestion chats (Monday 00:00 UTC window). */
export const AiSuggestionLimits = {
  free: 3,
  single: 9,
  double: 27,
} as const;

/**
 * Resolves the user's weekly AI suggestion limit from JWT entitlements.
 * Order: Double Shot → Single Shot → free tier.
 */
export function getAiSuggestionLimit(
  entitlements: string[] | undefined,
): number {
  if (hasEntitlement(entitlements, Entitlements.AI_SHOT_SUGGESTIONS_PLUS)) {
    return AiSuggestionLimits.double;
  }
  if (hasEntitlement(entitlements, Entitlements.AI_SHOT_SUGGESTIONS)) {
    return AiSuggestionLimits.single;
  }
  return AiSuggestionLimits.free;
}
