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
      reshareAllowed: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(validUuid);
      expect(result.data.reshareAllowed).toBe(true);
    }
  });

  it("accepts minimal payload and defaults reshareAllowed to false", () => {
    const result = createBeanShareSchema.safeParse({
      userId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(validUuid);
      expect(result.data.reshareAllowed).toBe(false);
    }
  });

  it("accepts any non-empty string for userId (no longer UUID)", () => {
    const result = createBeanShareSchema.safeParse({
      userId: "not-a-uuid",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.userId).toBe("not-a-uuid");
  });

  it("rejects missing userId", () => {
    const result = createBeanShareSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean reshareAllowed", () => {
    const result = createBeanShareSchema.safeParse({
      userId: validUuid,
      reshareAllowed: 1,
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
    }
  });

  it("accepts anyone_with_link", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "anyone_with_link",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.generalAccess).toBe("anyone_with_link");
  });

  it("rejects public (removed in one-way sharing)", () => {
    const result = updateGeneralAccessSchema.safeParse({
      generalAccess: "public",
    });
    expect(result.success).toBe(false);
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
      expect(result.data.shotHistoryAccess).toBeUndefined();
      expect(result.data.reshareAllowed).toBeUndefined();
    }
  });

  it("accepts shotHistoryAccess only", () => {
    const result = updateBeanShareSchema.safeParse({
      shotHistoryAccess: "anyone_with_link",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shotHistoryAccess).toBe("anyone_with_link");
      expect(result.data.reshareAllowed).toBeUndefined();
    }
  });

  it("accepts reshareAllowed only", () => {
    const result = updateBeanShareSchema.safeParse({
      reshareAllowed: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reshareAllowed).toBe(true);
  });

  it("accepts both fields", () => {
    const result = updateBeanShareSchema.safeParse({
      shotHistoryAccess: "restricted",
      reshareAllowed: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shotHistoryAccess).toBe("restricted");
      expect(result.data.reshareAllowed).toBe(true);
    }
  });

  it("rejects invalid shotHistoryAccess", () => {
    const result = updateBeanShareSchema.safeParse({
      shotHistoryAccess: "open",
    });
    expect(result.success).toBe(false);
  });

  it("rejects public for shotHistoryAccess (removed in one-way sharing)", () => {
    const result = updateBeanShareSchema.safeParse({
      shotHistoryAccess: "public",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean reshareAllowed", () => {
    const result = updateBeanShareSchema.safeParse({
      reshareAllowed: "yes",
    });
    expect(result.success).toBe(false);
  });
});
