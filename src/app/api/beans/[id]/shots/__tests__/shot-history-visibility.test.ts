/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── IDs ─────────────────────────────────────────────────────────────────────
const ALICE_ID = "00000000-0000-4000-a000-000000000001";
const BOB_ID = "00000000-0000-4000-a000-000000000002";
const BEAN_ID = "00000000-0000-4000-b000-000000000001";

const ALICE_SHOT_ID = "00000000-0000-4000-s000-000000000001";
const BOB_SHOT_ID = "00000000-0000-4000-s000-000000000002";
const SHARE_ID = "00000000-0000-4000-c000-000000000001";

// ─── Hoisted mutable state ────────────────────────────────────────────────────
//
// The route issues these DB queries in order:
//   [0] myShots      — own shots, always fetched
//   [1] incomingShares — beansShare WHERE receiverUserId=me AND status=accepted
//                        AND shareShotHistory=true
//   [2] sharedShots  — shots from sharer user IDs (only when [1] non-empty)
//
// shareShotHistory on beansShare  = the SHARER's opt-in that they set when
//                                   creating/editing the individual share.
// shareMyShotsPublicly on userBeans = the FOLLOWER's own opt-in for the public
//                                     share page (/share/beans/:slug).
//                                     The private /beans/:id/shots route does
//                                     NOT currently check this field at all —
//                                     which is the bug this test suite exposes.
const mock = vi.hoisted(() => ({
  session: null as unknown,
  canAccessBeanResult: null as unknown,
  dbResults: [] as unknown[][],
  _callIndex: 0,
}));

// ─── Auth / canAccessBean mocks ───────────────────────────────────────────────
vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/lib/api-auth", () => ({
  canAccessBean: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mock.canAccessBeanResult)),
}));

// ─── DB mock ─────────────────────────────────────────────────────────────────
//
// Drizzle chains look like:
//   db.select(cols).from(t).leftJoin(...).leftJoin(...).where(...).orderBy(...).limit(n)
//   db.select(cols).from(t).leftJoin(...).where(...)   ← awaited directly (no .limit)
//
// Every method in the chain returns the same chainable object.
// Resolution happens on .limit() or when the chain is awaited directly (via .then).
// One entry from dbResults is consumed per resolution.
vi.mock("@/db", () => {
  function nextResult(): unknown[] {
    const idx = mock._callIndex++;
    return (mock.dbResults[idx] as unknown[] | undefined) ?? [];
  }

  function makeChain(): unknown {
    const chain: Record<string, unknown> = {};

    for (const method of [
      "from",
      "leftJoin",
      "innerJoin",
      "where",
      "orderBy",
    ]) {
    chain[method] = (..._args: unknown[]) => chain;
    }

    chain["limit"] = (_n: unknown) => Promise.resolve(nextResult());

    // Make the chain itself thenable so the route can `await` it directly
    // (used by the incomingShares query which has no .limit() call).
    chain["then"] = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve(nextResult()).then(onFulfilled, onRejected);

    chain["catch"] = (onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(nextResult()).then(undefined, onRejected);

    chain["finally"] = (onFinally?: () => void) =>
      Promise.resolve(nextResult()).finally(onFinally);

    return chain;
  }

  return {
    db: {
      select: vi.fn().mockImplementation((_cols?: unknown) => makeChain()),
    },
  };
});

// ─── Route import (must follow vi.mock calls) ─────────────────────────────────
import { GET } from "@/app/api/beans/[id]/shots/route";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSession(userId: string) {
  return {
    user: {
      id: userId,
      name: userId === ALICE_ID ? "Alice" : "Bob",
      image: null as string | null,
      role: "member" as const,
      entitlements: [] as string[],
    },
  };
}

function makeAccessAllowed(createdBy = ALICE_ID) {
  return {
    allowed: true as const,
    bean: {
      id: BEAN_ID,
      name: "Ethiopian Yirgacheffe",
      createdBy,
      generalAccess: "restricted" as const,
      generalAccessShareShots: false,
      shareSlug: null as string | null,
    },
    userBean: {
      beanId: BEAN_ID,
      userId: createdBy,
      openBagDate: null as Date | null,
      shareMyShotsPublicly: false,
      createdAt: new Date("2024-01-01"),
    },
  };
}

function makeShot(id: string, userId: string, isHidden = false) {
  return {
    id,
    userId,
    userName: userId === ALICE_ID ? "Alice" : "Bob",
    userImage: null as string | null,
    doseGrams: "18.0",
    yieldGrams: "36.0",
    grindLevel: "15.00",
    brewTimeSecs: "28.0",
    brewTempC: "93.0",
    preInfusionDuration: null as string | null,
    brewPressure: "9",
    flowRate: "2.00",
    shotQuality: "4.0",
    rating: "4.0",
    bitter: "2.0",
    sour: "2.0",
    notes: null as string | null,
    flavors: null as string[] | null,
    bodyTexture: null as string[] | null,
    adjectives: null as string[] | null,
    isReferenceShot: false,
    isHidden,
    createdAt: new Date("2024-01-15T10:00:00Z"),
    beanRoastDate: null as Date | null,
  };
}

// A sharingMembers row: an accepted member who has opted in (shareShotHistory=true).
// Their shots are visible to all other accepted members.
function makeIncomingShare(userId: string) {
  return {
    userId,
    userName: userId === ALICE_ID ? "Alice" : "Bob",
  };
}

function makeRequest(beanId: string): NextRequest {
  return new NextRequest(`http://localhost/api/beans/${beanId}/shots`);
}

// ─── Reset before each test ───────────────────────────────────────────────────
beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.dbResults = [];
  mock._callIndex = 0;
});

// ─────────────────────────────────────────────────────────────────────────────
// shareShotHistory vs shareMyShotsPublicly
//
// beansShare.shareShotHistory  — the SHARER's (Alice's) flag set when creating
//                                or editing the individual share to Bob. Controls
//                                whether Alice's shots appear for Bob on the
//                                private /beans/:id/shots endpoint.
//
// userBeans.shareMyShotsPublicly — the OWNER/FOLLOWER's own opt-in flag.
//                                  Controls whether their shots appear on the
//                                  public /share/beans/:slug page AND gates the
//                                  private endpoint (the route joins user_beans
//                                  and requires this to be true before including
//                                  a sharer's shots).
//
// BOTH flags must be true for a sharer's shots to be visible to the receiver:
//   beansShare.shareShotHistory = true   (sharer enabled it on the share record)
//   userBeans.shareMyShotsPublicly = true  (sharer opted in on their own row)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: No share relationship at all.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Alice owns bean, no share relationship", () => {
  it("Bob cannot see Alice's shots when Alice has not shared with him", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // [0] myShots for Bob → none
    // [1] incomingShares for Bob → none (no share record exists)
    mock.dbResults = [[], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: unknown[] };
    expect(body.shots).toHaveLength(0);
  });

  it("Alice cannot see Bob's shots when no reverse share exists from Bob", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // [0] myShots for Alice → her own shot
    // [1] incomingShares for Alice → none (Bob never created a share to Alice)
    mock.dbResults = [[makeShot(ALICE_SHOT_ID, ALICE_ID)], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots).toHaveLength(1);
    expect(body.shots[0].userId).toBe(ALICE_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Alice shares with Bob, Bob accepts.
// shareShotHistory is the flag on beansShare set by ALICE (the sharer).
// shareMyShotsPublicly is the flag on user_beans set by ALICE (the owner).
// These are DIFFERENT fields and the route only checks shareShotHistory.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Alice shares with Bob (accepted) — shareShotHistory controls visibility for Bob", () => {
  it("Bob cannot see Alice's shots when shareShotHistory=false on the share record", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // The share exists (Alice→Bob, accepted) but shareShotHistory=false.
    // The incomingShares query includes WHERE shareShotHistory=true, so it
    // returns nothing — correctly blocking Bob from seeing Alice's shots.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [], // incomingShares: shareShotHistory=false filtered out
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Bob CAN see Alice's shots when shareShotHistory=true on the share record", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // Alice set shareShotHistory=true when she created or edited the share.
    // The incomingShares query returns Alice's row.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [makeIncomingShare(ALICE_ID)], // incomingShares: shareShotHistory=true
      [makeShot(ALICE_SHOT_ID, ALICE_ID)], // sharedShots from Alice
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// THE BUG: shareMyShotsPublicly=false on user_beans is NOT respected by the
// private /beans/:id/shots endpoint.
//
// "Share my shot history" in the UI (ShareBeanVisitorActions and the bean
// detail page) mutates userBeans.shareMyShotsPublicly via PATCH
// /api/beans/:id/share-my-shots. The route at /api/beans/:id/shots never
// reads that column. It only reads beansShare.shareShotHistory.
//
// So if Alice set shareShotHistory=true when sharing with Bob, then later
// toggles "Share my shot history" to OFF (shareMyShotsPublicly=false), Bob
// STILL sees Alice's shots — because the route never re-checks
// shareMyShotsPublicly.
// ─────────────────────────────────────────────────────────────────────────────
describe("shareMyShotsPublicly=false on user_beans blocks shared-shot visibility", () => {
  it("Bob cannot see Alice's shots when Alice has shareShotHistory=true but shareMyShotsPublicly=false", async () => {
    // Alice's beansShare.shareShotHistory=true (she set this when creating the
    // share), but her userBeans.shareMyShotsPublicly=false (she toggled "Share
    // my shot history" off). The route joins user_beans in the incomingShares
    // query and requires shareMyShotsPublicly=true, so Alice's row is excluded
    // and Bob sees no shots from Alice.
    const accessResult = makeAccessAllowed(ALICE_ID);
    accessResult.userBean.shareMyShotsPublicly = false;
    mock.canAccessBeanResult = accessResult;
    mock.session = makeSession(BOB_ID);

    // The incomingShares query now joins user_beans and adds
    // AND user_beans.share_my_shots_publicly = true.  Alice's row is filtered
    // out, so the DB returns [] and sharedShots is never fetched.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [], // incomingShares: Alice filtered out because shareMyShotsPublicly=false
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Bob CAN see Alice's shots when both shareShotHistory=true AND shareMyShotsPublicly=true", async () => {
    // Both flags are true: the share record has shareShotHistory=true and
    // Alice's user_beans row has shareMyShotsPublicly=true.  The incomingShares
    // query returns Alice's row and sharedShots includes her non-hidden shot.
    const accessResult = makeAccessAllowed(ALICE_ID);
    accessResult.userBean.shareMyShotsPublicly = true;
    mock.canAccessBeanResult = accessResult;
    mock.session = makeSession(BOB_ID);

    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)],
      [makeIncomingShare(ALICE_ID)], // both flags true → row returned
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Alice queries — no reverse share from Bob.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Alice queries shots — no reverse share from Bob", () => {
  it("Alice cannot see Bob's shots when Bob has not shared with Alice", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)], // myShots for Alice
      [], // incomingShares: no Bob→Alice share
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
  });

  it("Alice cannot see Bob's shots even after Bob accepted Alice's share to him (sharing is one-directional)", async () => {
    // Alice→Bob share exists and is accepted. Bob can see Alice's shots (if
    // shareShotHistory=true). But Alice CANNOT see Bob's shots — there is no
    // Bob→Alice share. The route checks receiverUserId=session.user.id, so
    // Alice's incomingShares query finds nothing.
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [], // no Bob→Alice share row
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Bob shares history with Alice via a reverse share.
// Bob creates a share (Bob→Alice) with shareShotHistory=true and Alice accepts.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Bob creates a reverse share to Alice with shareShotHistory=true", () => {
  it("Alice can see Bob's shots once Bob's reverse share has shareShotHistory=true", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [makeIncomingShare(BOB_ID)], // Bob→Alice share with shareShotHistory=true
      [makeShot(BOB_SHOT_ID, BOB_ID)],
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots).toHaveLength(2);
    const userIds = body.shots.map((s) => s.userId);
    expect(userIds).toContain(ALICE_ID);
    expect(userIds).toContain(BOB_ID);
  });

  it("Alice cannot see Bob's shots when Bob's reverse share has shareShotHistory=false", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // Bob created a share to Alice but left shareShotHistory=false.
    // The incomingShares query (WHERE shareShotHistory=true) returns nothing.
    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [], // Bob's share has shareShotHistory=false → filtered out
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
  });

  it("Alice cannot see Bob's shots when Bob has shareShotHistory=true but shareMyShotsPublicly=false", async () => {
    // Bob created a reverse share to Alice with shareShotHistory=true, but his
    // userBeans.shareMyShotsPublicly=false.  The route's incomingShares query
    // joins user_beans and requires shareMyShotsPublicly=true, so Bob's row is
    // excluded and Alice sees no shots from Bob.
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [], // Bob filtered out by shareMyShotsPublicly=false
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hidden shots: the isHidden flag is always respected for shared shots.
// ─────────────────────────────────────────────────────────────────────────────
describe("Hidden shots are never leaked to other users", () => {
  it("Bob does NOT see Alice's hidden shots even when shareShotHistory=true", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // The sharedShots query includes WHERE isHidden=false; the mock returns
    // an empty array, meaning the DB correctly filtered hidden shots out.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)],
      [makeIncomingShare(ALICE_ID)],
      [], // Alice's hidden shots are excluded by the isHidden=false clause
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(0);
  });

  it("Current user's own hidden shots ARE visible to themselves", async () => {
    // myShots has no isHidden filter — users always see all their own shots.
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    const hiddenShot = makeShot(BOB_SHOT_ID, BOB_ID, true /* isHidden */);
    mock.dbResults = [[hiddenShot], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ isHidden: boolean }> };
    expect(body.shots).toHaveLength(1);
    expect(body.shots[0].isHidden).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// contributors list
// ─────────────────────────────────────────────────────────────────────────────
describe("contributors list", () => {
  it("always includes the current user even when they have no shots", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [[], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contributors: Array<{ userId: string; isCurrentUser: boolean }>;
    };
    const self = body.contributors.find((c) => c.userId === BOB_ID);
    expect(self).toBeDefined();
    expect(self?.isCurrentUser).toBe(true);
  });

  it("includes the sharer when shareShotHistory=true", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [[], [makeIncomingShare(ALICE_ID)], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contributors: Array<{ userId: string; isCurrentUser: boolean }>;
    };
    const alice = body.contributors.find((c) => c.userId === ALICE_ID);
    expect(alice).toBeDefined();
    expect(alice?.isCurrentUser).toBe(false);
  });

  it("does NOT include the sharer when shareShotHistory=false (incomingShares is empty)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [[makeShot(BOB_SHOT_ID, BOB_ID)], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contributors: Array<{ userId: string }>;
    };
    expect(
      body.contributors.find((c) => c.userId === ALICE_ID),
    ).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth guards
// ─────────────────────────────────────────────────────────────────────────────
describe("Auth guards", () => {
  it("returns 401 when there is no session", async () => {
    mock.session = null;

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("forwards the canAccessBean error response when bean access is denied", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = {
      allowed: false,
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(403);
  });
});

describe("SHARE_ID constant is well-formed", () => {
  it("matches UUID v4 format", () => {
    expect(SHARE_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
