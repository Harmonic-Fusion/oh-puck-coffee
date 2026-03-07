/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { beans, userBeans, beansShare } from "@/db/schema";

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
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            beanId: "b",
            userId: "u",
            openBagDate: null,
            createdAt: new Date(),
            shareMyShotsPublicly: false,
          },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

import { canAccessBean } from "@/lib/api-auth";

const beanId = "a1b2c3d4-e5f6-7890-abcd-000000000001";
const userId = "a1b2c3d4-e5f6-7890-abcd-000000000002";

function makeBean(overrides: Record<string, unknown> = {}) {
  return {
    id: beanId,
    name: "Test Bean",
    origin: null,
    roaster: null,
    originId: null,
    roasterId: null,
    originDetails: null,
    processingMethod: null,
    roastLevel: "medium",
    roastDate: null,
    isRoastDateBestGuess: false,
    createdBy: userId,
    generalAccess: "restricted",
    generalAccessShareShots: false,
    shareSlug: null,
    createdAt: new Date(),
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

  it("allows access when user is the creator", async () => {
    const bean = makeBean({ createdBy: userId });
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.bean.id).toBe(beanId);
      expect(result.bean.createdBy).toBe(userId);
    }
  });

  it("allows access when user has user_beans row", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean({ createdBy: otherUserId });
    const userBeanRow = {
      beanId,
      userId,
      openBagDate: null,
      createdAt: new Date(),
      shareMyShotsPublicly: false,
    };
    selectResults = [[bean], [userBeanRow]];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.userBean).toEqual(userBeanRow);
    }
  });

  it("allows access when general access is public (no auth required)", async () => {
    const bean = makeBean({
      createdBy: "other-user-id",
      generalAccess: "public",
    });
    selectResults = [[bean]];
    const result = await canAccessBean(null, beanId, undefined);
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.bean.generalAccess).toBe("public");
      expect(result.userBean).toBeNull();
    }
  });

  it("allows access when general access is anyone_with_link and user is authenticated", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean({
      createdBy: otherUserId,
      generalAccess: "anyone_with_link",
    });
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.bean.generalAccess).toBe("anyone_with_link");
    }
  });

  it("denies access when bean is restricted and user is not creator or shared with", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean({ createdBy: otherUserId });
    selectResults = [[bean], [], []];
    const result = await canAccessBean(userId, beanId, "member");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      const res = (result as { error: Response }).error;
      expect(res.status).toBe(403);
    }
  });

  it("allows access when user is admin regardless of ownership", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean({ createdBy: otherUserId });
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "admin");
    expect(result.allowed).toBe(true);
  });

  it("allows access when user is super-admin regardless of ownership", async () => {
    const otherUserId = "a1b2c3d4-e5f6-7890-abcd-000000000003";
    const bean = makeBean({ createdBy: otherUserId });
    selectResults = [[bean], []];
    const result = await canAccessBean(userId, beanId, "super-admin");
    expect(result.allowed).toBe(true);
  });
});

void beans;
void userBeans;
void beansShare;
