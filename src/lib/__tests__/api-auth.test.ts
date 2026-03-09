/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { beans, beansShare } from "@/db/schema";

let limitCallCount = 0;
let selectResults: unknown[][] = [];

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation((_n: number) => {
            const count = limitCallCount++;
            const flat = selectResults.flat();
            const row = flat[count];
            if (Array.isArray(row)) return Promise.resolve(row);
            if (row !== undefined && row !== null) return Promise.resolve([row]);
            return Promise.resolve([]);
          }),
        }),
      }),
    }),
  },
}));

import { canAccessBean } from "@/lib/beans-access";

const beanId = "a1b2c3d4-e5f6-7890-abcd-000000000001";
const userId = "a1b2c3d4-e5f6-7890-abcd-000000000002";

function makeBean(overrides: Record<string, unknown> = {}) {
  return {
    id: beanId,
    name: "Test Bean",
    originId: null,
    roasterId: null,
    originDetails: null,
    processingMethod: null,
    roastLevel: "medium",
    roastDate: null,
    isRoastDateBestGuess: false,
    generalAccess: "restricted",
    shareSlug: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    ...overrides,
  };
}

function makeOwnerShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-id-owner",
    beanId,
    userId,
    invitedBy: null,
    status: "owner",
    shotHistoryAccess: "restricted",
    reshareAllowed: false,
    beansOpenDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMemberShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-id-member",
    beanId,
    userId,
    invitedBy: "other-user-id",
    status: "accepted",
    shotHistoryAccess: "restricted",
    reshareAllowed: false,
    beansOpenDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("canAccessBean", () => {
  beforeEach(() => {
    limitCallCount = 0;
    selectResults = [];
  });

  it("returns 404 when bean does not exist", async () => {
    selectResults = [[]];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(false);
    expect(result).toHaveProperty("error");
    const res = (result as { error: Response }).error;
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Bean not found");
  });

  it("allows access when user is the owner (beans_share status owner)", async () => {
    const bean = makeBean();
    const ownerShare = makeOwnerShare();
    selectResults = [[bean], [ownerShare]];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.bean.id).toBe(beanId);
      expect(result.userBean?.status).toBe("owner");
    }
  });

  it("allows access when user has beans_share row (accepted member)", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean();
    const memberShare = makeMemberShare({ userId, invitedBy: otherUserId });
    selectResults = [[bean], [memberShare]];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.userBean).toEqual(memberShare);
    }
  });

  it("allows access when user has unfollowed status (read-only)", async () => {
    const bean = makeBean();
    const unfollowedShare = makeMemberShare({
      userId,
      status: "unfollowed",
    });
    selectResults = [[bean], [unfollowedShare]];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.userBean?.status).toBe("unfollowed");
    }
  });

  it("denies access when unauthenticated and general access is anyone_with_link (no public beans)", async () => {
    const bean = makeBean({ generalAccess: "anyone_with_link" });
    selectResults = [[bean]];
    const result = await canAccessBean(null, beanId, undefined);
    expect(result.allowed).toBe(false);
  });

  it("allows access when general access is anyone_with_link and user is authenticated", async () => {
    const bean = makeBean({ generalAccess: "anyone_with_link" });
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.bean.generalAccess).toBe("anyone_with_link");
    }
  });

  it("denies access when bean is restricted and user has no beans_share row", async () => {
    const bean = makeBean();
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      const res = (result as { error: Response }).error;
      expect(res.status).toBe(403);
    }
  });

  it("allows access when user is admin regardless of ownership", async () => {
    const bean = makeBean();
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "admin");
    expect(result.allowed).toBe(true);
  });

  it("allows access when user is super-admin regardless of ownership", async () => {
    const bean = makeBean();
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "super-admin");
    expect(result.allowed).toBe(true);
  });
});

void beans;
void beansShare;
