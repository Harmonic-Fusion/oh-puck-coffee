import { describe, it, expect } from "vitest";
import {
  Entitlements,
  hasEntitlement,
  FreeEntitlementDefaults,
} from "@/shared/entitlements";

describe("Entitlements", () => {
  it("exposes expected keys", () => {
    expect(Entitlements.NO_SHOT_VIEW_LIMIT).toBe("no-shot-view-limit");
    expect(Entitlements.STATS_VIEW).toBe("stats-view");
    expect(Entitlements.BEANS_SHARE).toBe("bean-share");
  });
});

describe("hasEntitlement", () => {
  it("returns true when entitlements array contains the key", () => {
    expect(
      hasEntitlement(
        ["no-shot-view-limit", "bean-share"],
        Entitlements.BEANS_SHARE,
      ),
    ).toBe(true);
    expect(
      hasEntitlement(["bean-share"], Entitlements.BEANS_SHARE),
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
      hasEntitlement(["bean-share-extra"], Entitlements.BEANS_SHARE),
    ).toBe(false);
    expect(
      hasEntitlement(["bean-share"], Entitlements.BEANS_SHARE),
    ).toBe(true);
  });
});

describe("FreeEntitlementDefaults", () => {
  it("includes BEAN_SHARE so free users can share beans", () => {
    expect(FreeEntitlementDefaults).toContain(Entitlements.BEANS_SHARE);
  });

  it("includes NO_SHOT_VIEW_LIMIT", () => {
    expect(FreeEntitlementDefaults).toContain(Entitlements.NO_SHOT_VIEW_LIMIT);
  });
});
