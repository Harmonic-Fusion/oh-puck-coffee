import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Entitlements } from "@/shared/entitlements";

// ─── IDs ─────────────────────────────────────────────────────────────────────
const ALICE_ID = "00000000-0000-4000-a000-000000000001";
const BOB_ID   = "00000000-0000-4000-a000-000000000002";
const CAROL_ID = "00000000-0000-4000-a000-000000000003";
const BEAN_ID  = "00000000-0000-4000-b000-000000000001";
const SHARE_ID = "00000000-0000-4000-c000-000000000001";

// ─── Hoisted state ───────────────────────────────────────────────────────────
const mock = vi.hoisted(() => ({
  session: null as unknown,
  canAccessBeanResult: null as unknown,
  dbQueue: [] as unknown[][],
}));

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/lib/api-auth", () => ({
  canAccessBean: vi.fn().mockImplementation(() =>
    Promise.resolve(mock.canAccessBeanResult),
  ),
}));

vi.mock("@/shared/config", () => ({
  config: { maxBeanShares: 10 },
}));

vi.mock("@/lib/short-uid", () => ({
  generateShortUid: vi.fn().mockReturnValue("test-slug-abc"),
}));

vi.mock("@/db", () => {
  function dequeue(): unknown[] {
    return mock.dbQueue.shift() ?? [];
  }

  // select chain: .select().from().where()  or  .select().from().where().limit()
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const data = dequeue();
      return Object.assign(Promise.resolve(data), {
        limit: () => Promise.resolve(data),
      });
    }),
  };

  // update chain: .update().set().where()  or  .update().set().where().returning()
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const data = dequeue();
      return Object.assign(Promise.resolve(data), {
        returning: () => Promise.resolve(data),
      });
    }),
  };

  // insert chain: .insert().values().returning()
  const insertChain = {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => Promise.resolve(dequeue())),
    }),
  };

  // delete chain: .delete().where()
  const deleteChain = {
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
      delete: vi.fn().mockReturnValue(deleteChain),
    },
  };
});

// ─── Route imports (must come after vi.mock calls) ───────────────────────────
import { POST } from "@/app/api/beans/[id]/shares/route";
import {
  PATCH as patchShare,
  DELETE as deleteShareHandler,
} from "@/app/api/beans/[id]/shares/[shareId]/route";
import { PATCH as patchGeneralAccess } from "@/app/api/beans/[id]/general-access/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSession(userId: string, entitlements: string[] = [Entitlements.BEAN_SHARE]) {
  return { user: { id: userId, role: "member" as const, entitlements } };
}

function makeAccessAllowed(createdBy = ALICE_ID) {
  return {
    allowed: true as const,
    bean: {
      id: BEAN_ID,
      name: "Test Bean",
      createdBy,
      generalAccess: "restricted" as const,
      generalAccessShareShots: false,
      shareSlug: null,
    },
    userBean: null,
  };
}

function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const SHARES_URL = `http://localhost/api/beans/${BEAN_ID}/shares`;
const SHARE_URL  = `http://localhost/api/beans/${BEAN_ID}/shares/${SHARE_ID}`;
const GA_URL     = `http://localhost/api/beans/${BEAN_ID}/general-access`;

// ─── Reset before each test ───────────────────────────────────────────────────
beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.dbQueue = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/beans/:id/shares
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/beans/:id/shares — reshare permission enforcement", () => {
  const body = { userId: CAROL_ID, reshareEnabled: false };

  it("returns 403 when non-owner has no share record at all", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns
    mock.dbQueue = [[]]; // reshare check → no row

    const res = await POST(
      jsonReq(SHARES_URL, "POST", body),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 403 when non-owner share row exists but reshareEnabled is false", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed();
    mock.dbQueue = [[{ reshareEnabled: false }]]; // explicit false

    const res = await POST(
      jsonReq(SHARES_URL, "POST", body),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(403);
  });

  it("returns 201 when non-owner has reshareEnabled on their accepted share", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed();
    const newShare = {
      id: "new-share-id",
      beanId: BEAN_ID,
      userId: CAROL_ID,
      invitedBy: BOB_ID,
      status: "pending",
      shareShotHistory: false,
      reshareEnabled: false,
      createdAt: new Date().toISOString(),
    };
    mock.dbQueue = [
      [{ reshareEnabled: true }], // reshare check → Bob can reshare
      [],                         // individualShareCount (shares Bob already created)
      [],                         // allMyBeans (Bob's beans with non-restricted access)
      [],                         // existing share duplicate check
      [newShare],                 // insert.values.returning
    ];

    const res = await POST(
      jsonReq(SHARES_URL, "POST", body),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(201);
  });

  it("returns 201 when the bean owner creates a share", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID); // Alice owns, Alice calls
    const newShare = {
      id: SHARE_ID,
      beanId: BEAN_ID,
      userId: BOB_ID,
      invitedBy: ALICE_ID,
      status: "pending",
      shareShotHistory: false,
      reshareEnabled: false,
      createdAt: new Date().toISOString(),
    };
    mock.dbQueue = [
      [], // individualShareCount
      [], // allMyBeans
      [], // existing share duplicate check
      [newShare], // insert.values.returning
    ];

    const res = await POST(
      jsonReq(SHARES_URL, "POST", { userId: BOB_ID, reshareEnabled: false }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/beans/:id/shares/:shareId
// ─────────────────────────────────────────────────────────────────────────────
describe("PATCH /api/beans/:id/shares/:shareId — owner-only", () => {
  it("returns 403 when non-owner tries to edit share options for another user's row", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns
    // The share row belongs to Carol, not Bob
    mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: CAROL_ID, reshareEnabled: false, shareShotHistory: false, status: "accepted" }]];

    const res = await patchShare(
      jsonReq(SHARE_URL, "PATCH", { shareShotHistory: true }),
      { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
    );

    expect(res.status).toBe(403);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 200 when owner edits share options", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
    const share = { id: SHARE_ID, beanId: BEAN_ID, reshareEnabled: false, shareShotHistory: false, status: "accepted" };
    mock.dbQueue = [
      [share],                                 // get share by shareId
      [{ ...share, shareShotHistory: true }],  // update.set.where.returning
    ];

    const res = await patchShare(
      jsonReq(SHARE_URL, "PATCH", { shareShotHistory: true }),
      { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
    );

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/beans/:id/shares/:shareId
// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /api/beans/:id/shares/:shareId — receiver and owner rules", () => {
  it("returns 403 when receiver tries to revoke an accepted share", async () => {
    mock.session = makeSession(BOB_ID);
    mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: BOB_ID, status: "accepted" }]];

    const res = await deleteShareHandler(
      new NextRequest(SHARE_URL, { method: "DELETE" }),
      { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
    );

    expect(res.status).toBe(403);
  });

  it("returns 204 when receiver declines a pending invite", async () => {
    mock.session = makeSession(BOB_ID);
    mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: BOB_ID, status: "pending" }]];

    const res = await deleteShareHandler(
      new NextRequest(SHARE_URL, { method: "DELETE" }),
      { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
    );

    expect(res.status).toBe(204);
  });

  it("returns 403 when a non-owner, non-receiver tries to delete a share", async () => {
    mock.session = makeSession(CAROL_ID);
    mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns (Carol ≠ Alice)
    mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: BOB_ID, status: "accepted" }]];

    const res = await deleteShareHandler(
      new NextRequest(SHARE_URL, { method: "DELETE" }),
      { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
    );

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/beans/:id/general-access
// ─────────────────────────────────────────────────────────────────────────────
describe("PATCH /api/beans/:id/general-access — owner-only", () => {
  it("returns 403 when non-owner tries to change general access", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns

    const res = await patchGeneralAccess(
      jsonReq(GA_URL, "PATCH", { generalAccess: "anyone_with_link" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(403);
  });

  it("returns 200 when owner changes general access", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
    const updatedBean = {
      id: BEAN_ID,
      createdBy: ALICE_ID,
      generalAccess: "anyone_with_link",
      generalAccessShareShots: false,
      shareSlug: "test-slug-abc",
    };
    mock.dbQueue = [
      [],            // individualShareCount (Alice's existing individual shares)
      [],            // allMyBeans (Alice's beans already set to non-restricted)
      [],            // db.update(beans).set().where() resolves
      [updatedBean], // db.select().from(beans).where().limit(1) re-fetch
    ];

    const res = await patchGeneralAccess(
      jsonReq(GA_URL, "PATCH", { generalAccess: "anyone_with_link" }),
      { params: Promise.resolve({ id: BEAN_ID }) },
    );

    expect(res.status).toBe(200);
  });
});
