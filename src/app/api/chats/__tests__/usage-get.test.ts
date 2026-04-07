import { describe, it, expect, vi, beforeEach } from "vitest";

const ALICE_ID = "u_alice_test_usage_12345";

const mock = vi.hoisted(() => ({
  session: null as unknown,
  selectWhereQueue: [] as unknown[][],
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/db", () => {
  function nextSelect(): unknown[] {
    return mock.selectWhereQueue.shift() ?? [];
  }

  function whereResult() {
    return {
      then: (onFulfilled?: (v: unknown) => unknown) =>
        Promise.resolve(nextSelect()).then(onFulfilled),
    };
  }

  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => whereResult()),
        }),
      }),
    },
  };
});

import { GET } from "@/app/api/chats/usage/route";

beforeEach(() => {
  mock.session = null;
  mock.selectWhereQueue = [];
});

describe("GET /api/chats/usage", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns used count, limit, and weekStartsAt", async () => {
    mock.session = {
      user: {
        id: ALICE_ID,
        entitlements: ["ai-shot-suggestions-plus"],
      },
    };
    mock.selectWhereQueue = [[{ n: 2 }]];

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usedThisWeek).toBe(2);
    expect(body.weeklyLimit).toBe(27);
    expect(typeof body.weekStartsAt).toBe("string");
    expect(body.weekStartsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
