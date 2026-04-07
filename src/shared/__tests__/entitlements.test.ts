import { describe, it, expect } from "vitest";
import {
  Entitlements,
  hasEntitlement,
  FreeEntitlementDefaults,
  getAiSuggestionLimit,
  AiSuggestionLimits,
} from "@/shared/entitlements";

describe("Entitlements", () => {
  it("exposes expected keys", () => {
    expect(Entitlements.NO_SHOT_VIEW_LIMIT).toBe("no-shot-view-limit");
    expect(Entitlements.STATS_VIEW).toBe("stats-view");
    expect(Entitlements.BEANS_SHARE).toBe("beans-share");
  });
});

describe("hasEntitlement", () => {
  it("returns true when entitlements array contains the key", () => {
    expect(
      hasEntitlement(
        ["no-shot-view-limit", "beans-share"],
        Entitlements.BEANS_SHARE,
      ),
    ).toBe(true);
    expect(
      hasEntitlement(["beans-share"], Entitlements.BEANS_SHARE),
    ).toBe(true);
  });

  it("returns false when entitlements array does not contain the key", () => {
    expect(
      hasEntitlement(["no-shot-view-limit"], Entitlements.BEANS_SHARE),
    ).toBe(false);
    expect(hasEntitlement([], Entitlements.BEANS_SHARE)).toBe(false);
  });

  it("returns false when entitlements is undefined", () => {
    expect(
      hasEntitlement(undefined, Entitlements.BEANS_SHARE),
    ).toBe(false);
  });

  it("returns false when entitlements is null (treated like undefined via ??)", () => {
    expect(
      hasEntitlement(null as unknown as string[], Entitlements.BEANS_SHARE),
    ).toBe(false);
  });

  it("matches exact key (no partial match)", () => {
    expect(
      hasEntitlement(["beans-share-extra"], Entitlements.BEANS_SHARE),
    ).toBe(false);
    expect(
      hasEntitlement(["beans-share"], Entitlements.BEANS_SHARE),
    ).toBe(true);
  });
});

describe("FreeEntitlementDefaults", () => {
  it("is empty — base entitlements come from Stripe / user_entitlements rows", () => {
    expect(FreeEntitlementDefaults).toEqual([]);
  });
});

describe("getAiSuggestionLimit", () => {
  it("returns 27 when plus entitlement is present (highest tier wins)", () => {
    expect(
      getAiSuggestionLimit([
        Entitlements.AI_SHOT_SUGGESTIONS,
        Entitlements.AI_SHOT_SUGGESTIONS_PLUS,
      ]),
    ).toBe(AiSuggestionLimits.double);
  });

  it("returns 9 for single-tier AI entitlement only", () => {
    expect(getAiSuggestionLimit([Entitlements.AI_SHOT_SUGGESTIONS])).toBe(
      AiSuggestionLimits.single,
    );
  });

  it("returns 3 for free tier (no AI entitlements)", () => {
    expect(getAiSuggestionLimit([])).toBe(AiSuggestionLimits.free);
    expect(getAiSuggestionLimit(undefined)).toBe(AiSuggestionLimits.free);
  });
});
