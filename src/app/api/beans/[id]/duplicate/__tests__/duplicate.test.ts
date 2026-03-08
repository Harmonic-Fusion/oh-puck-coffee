import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const ALICE_ID = "00000000-0000-4000-a000-000000000001";
const BOB_ID = "00000000-0000-4000-a000-000000000002";
const BEAN_ID = "00000000-0000-4000-b000-000000000001";
const NEW_BEAN_ID = "00000000-0000-4000-b000-000000000002";

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

  const insertChain = {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => Promise.resolve(dequeue())),
    }),
  };

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => Promise.resolve(dequeue())),
  };

  return {
    db: {
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
      select: vi.fn().mockReturnValue(selectChain),
    },
  };
});

import { POST } from "@/app/api/beans/[id]/duplicate/route";

function makeSession(userId: string) {
  return { user: { id: userId, role: "member" as const } };
}

function makeAccessAllowed(beanId: string, userId: string, asOwner = false) {
  const bean = {
    id: beanId,
    name: "Test Bean",
    originId: null,
    roasterId: null,
    originDetails: null,
    processingMethod: null,
    roastLevel: "Medium" as const,
    roastDate: null,
    isRoastDateBestGuess: false,
    generalAccess: "restricted" as const,
  };
  const userBean = asOwner
    ? {
        beanId,
        userId,
        status: "owner" as const,
        beansOpenDate: null as Date | null,
      }
    : { beanId, userId, status: "accepted" as const, beansOpenDate: null as Date | null };
  return { allowed: true as const, bean, userBean };
}

function jsonReq(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const DUPLICATE_URL = `http://localhost/api/beans/${BEAN_ID}/duplicate`;

beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.dbQueue = [];
});

describe("POST /api/beans/:id/duplicate", () => {
  it("returns 401 when not authenticated", async () => {
    mock.canAccessBeanResult = makeAccessAllowed(BEAN_ID, ALICE_ID);

    const res = await POST(jsonReq(DUPLICATE_URL, {}), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user cannot access the bean", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = {
      allowed: false,
      error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    };

    const res = await POST(jsonReq(DUPLICATE_URL, {}), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 201 with new bean and owner row when shotOption is none (no shots)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(BEAN_ID, BOB_ID);
    const newBean = {
      id: NEW_BEAN_ID,
      name: "Test Bean",
      originId: null,
      roasterId: null,
      roastLevel: "Medium",
      generalAccess: "restricted",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.dbQueue = [[newBean]];

    const res = await POST(jsonReq(DUPLICATE_URL, { shotOption: "none" }), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; name: string };
    expect(body.id).toBe(NEW_BEAN_ID);
    expect(body.name).toBe("Test Bean");
  });

  it("returns 201 when shotOption is migrate (moves user's shots to new bean)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(BEAN_ID, BOB_ID);
    const newBean = {
      id: NEW_BEAN_ID,
      name: "Test Bean",
      originId: null,
      roasterId: null,
      roastLevel: "Medium",
      generalAccess: "restricted",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mock.dbQueue = [[newBean]];

    const res = await POST(jsonReq(DUPLICATE_URL, { shotOption: "migrate" }), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(NEW_BEAN_ID);
  });

  it("accepts empty body (default shotOption duplicate)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(BEAN_ID, BOB_ID);
    mock.dbQueue = [
      [{ id: NEW_BEAN_ID, name: "Test Bean", generalAccess: "restricted" }],
      [], // myShots select (default duplicate, no shots)
    ];

    const res = await POST(jsonReq(DUPLICATE_URL, {}), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(201);
  });

  it("is available to unshared member (canAccessBean allows read-only access)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = {
      ...makeAccessAllowed(BEAN_ID, BOB_ID),
      userBean: {
        beanId: BEAN_ID,
        userId: BOB_ID,
        status: "accepted" as const,
        beansOpenDate: null,
        unsharedAt: new Date(),
      },
    };
    mock.dbQueue = [
      [{ id: NEW_BEAN_ID, name: "Test Bean", generalAccess: "restricted" }],
      [], // myShots select
    ];

    const res = await POST(jsonReq(DUPLICATE_URL, {}), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(201);
  });
});
