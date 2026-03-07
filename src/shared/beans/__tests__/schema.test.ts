import { describe, it, expect } from "vitest";
import {
  createBeanShareSchema,
  updateGeneralAccessSchema,
  updateBeanShareSchema,
} from "@/shared/beans/schema";

const validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ── createBeanShareSchema ────────────────────────────────────────────────

describe("createBeanShareSchema", () => {
  it("accepts valid payload with all fields", () => {
    const result = createBeanShareSchema.safeParse({
      userId: validUuid,
      reshareEnabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(validUuid);
      expect(result.data.reshareEnabled).toBe(true);
    }
  });

  it("accepts minimal payload and defaults reshareEnabled to false", () => {
    const result = createBeanShareSchema.safeParse({
      userId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(validUuid);
      expect(result.data.reshareEnabled).toBe(false);
    }
  });

  it("rejects invalid UUID for userId", () => {
    const result = createBeanShareSchema.safeParse({
      userId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = createBeanShareSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean reshareEnabled", () => {
    const result = createBeanShareSchema.safeParse({
      userId: validUuid,
      reshareEnabled: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ── updateGeneralAccessSchema ─────────────────────────────────────────────

describe("updateGeneralAccessSchema", () => {
  it("accepts restricted", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "restricted",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.generalAccess).toBe("restricted");
      expect(result.data.generalAccessShareShots).toBeUndefined();
    }
  });

  it("accepts anyone_with_link", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "anyone_with_link",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.generalAccess).toBe("anyone_with_link");
  });

  it("accepts public", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "public",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.generalAccess).toBe("public");
  });

  it("accepts optional generalAccessShareShots", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "public",
      generalAccessShareShots: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.generalAccessShareShots).toBe(true);
    }
  });

  it("rejects invalid generalAccess value", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "open_to_world",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing generalAccess", () => {
    const result = updateGeneralAccessSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── updateBeanShareSchema ────────────────────────────────────────────────

describe("updateBeanShareSchema", () => {
  it("accepts empty object (no updates)", () => {
    const result = updateBeanShareSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shareShotHistory).toBeUndefined();
      expect(result.data.reshareEnabled).toBeUndefined();
    }
  });

  it("accepts shareShotHistory only", () => {
    const result = updateBeanShareSchema.safeParse({
      shareShotHistory: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shareShotHistory).toBe(true);
      expect(result.data.reshareEnabled).toBeUndefined();
    }
  });

  it("accepts reshareEnabled only", () => {
    const result = updateBeanShareSchema.safeParse({
      reshareEnabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reshareEnabled).toBe(true);
  });

  it("accepts both fields", () => {
    const result = updateBeanShareSchema.safeParse({
      shareShotHistory: false,
      reshareEnabled: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shareShotHistory).toBe(false);
      expect(result.data.reshareEnabled).toBe(true);
    }
  });

  it("rejects non-boolean shareShotHistory", () => {
    const result = updateBeanShareSchema.safeParse({
      shareShotHistory: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean reshareEnabled", () => {
    const result = updateBeanShareSchema.safeParse({
      reshareEnabled: "yes",
    });
    expect(result.success).toBe(false);
  });
});
