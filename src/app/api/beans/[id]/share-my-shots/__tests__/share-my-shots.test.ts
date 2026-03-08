import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const BOB_ID = "00000000-0000-4000-a000-000000000002";
const BEAN_ID = "00000000-0000-4000-b000-000000000001";

const mock = vi.hoisted(() => ({
  session: null as unknown,
  canAccessBeanResult: null as unknown,
  dbQueue: [] as unknown[][],
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/lib/beans-access", () => ({
  canAccessBean: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mock.canAccessBeanResult)),
}));

vi.mock("@/db", () => {
  function dequeue(): unknown[] {
    return mock.dbQueue.shift() ?? [];
  }

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      limit: () => Promise.resolve(dequeue()),
    })),
  };

  return {
    db: {
      update: vi.fn().mockReturnValue(updateChain),
      select: vi.fn().mockReturnValue(selectChain),
    },
  };
});

import { PATCH } from "@/app/api/beans/[id]/share-my-shots/route";

function makeSession(userId: string) {
  return { user: { id: userId, role: "member" as const } };
}

function makeAccessWithUserBean(beanId: string, userId: string, shotHistoryAccess: "none" | "restricted" | "anyone_with_link" | "public" = "restricted") {
  return {
    allowed: true as const,
    bean: { id: beanId, name: "Test Bean" },
    userBean: {
      beanId,
      userId,
      shotHistoryAccess,
      beansOpenDate: null,
      reshareAllowed: false,
      createdAt: new Date(),
    },
  };
}

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const SHARE_MY_SHOTS_URL = `http://localhost/api/beans/${BEAN_ID}/share-my-shots`;

beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.dbQueue = [];
});

describe("PATCH /api/beans/:id/share-my-shots — shot history access toggle", () => {
  it("returns 200 and updated shotHistoryAccess when member sets anyone_with_link", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessWithUserBean(BEAN_ID, BOB_ID, "restricted");
    const updatedRow = {
      beanId: BEAN_ID,
      userId: BOB_ID,
      beansOpenDate: null,
      shotHistoryAccess: "anyone_with_link" as const,
      reshareAllowed: false,
      createdAt: new Date(),
    };
    mock.dbQueue = [[updatedRow]];

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "anyone_with_link" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shotHistoryAccess: string };
    expect(body.shotHistoryAccess).toBe("anyone_with_link");
  });

  it("returns 200 and updated shotHistoryAccess when member sets public", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessWithUserBean(BEAN_ID, BOB_ID, "anyone_with_link");
    const updatedRow = {
      beanId: BEAN_ID,
      userId: BOB_ID,
      beansOpenDate: null,
      shotHistoryAccess: "public" as const,
      reshareAllowed: false,
      createdAt: new Date(),
    };
    mock.dbQueue = [[updatedRow]];

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "public" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shotHistoryAccess: string };
    expect(body.shotHistoryAccess).toBe("public");
  });

  it("returns 200 when member sets restricted (only other members see)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessWithUserBean(BEAN_ID, BOB_ID, "public");
    const updatedRow = {
      beanId: BEAN_ID,
      userId: BOB_ID,
      beansOpenDate: null,
      shotHistoryAccess: "restricted" as const,
      reshareAllowed: false,
      createdAt: new Date(),
    };
    mock.dbQueue = [[updatedRow]];

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "restricted" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shotHistoryAccess: string };
    expect(body.shotHistoryAccess).toBe("restricted");
  });

  it("returns 200 when member sets none (never share)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessWithUserBean(BEAN_ID, BOB_ID, "restricted");
    const updatedRow = {
      beanId: BEAN_ID,
      userId: BOB_ID,
      beansOpenDate: null,
      shotHistoryAccess: "none" as const,
      reshareAllowed: false,
      createdAt: new Date(),
    };
    mock.dbQueue = [[updatedRow]];

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "none" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shotHistoryAccess: string };
    expect(body.shotHistoryAccess).toBe("none");
  });

  it("returns 400 for invalid shotHistoryAccess", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessWithUserBean(BEAN_ID, BOB_ID);

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "invalid" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mock.session = null;

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "public" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no beans_share row (bean not in collection)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = {
      allowed: true as const,
      bean: { id: BEAN_ID, name: "Test Bean" },
      userBean: null,
    };

    const res = await PATCH(
      jsonReq(SHARE_MY_SHOTS_URL, { shotHistoryAccess: "public" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/collection/i);
  });
});
