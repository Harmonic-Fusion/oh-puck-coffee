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
//   [0] myShots         — own shots, always fetched
//   [1] sharingMembers  — beansShare WHERE status IN (accepted, owner, self) AND unsharedAt IS NULL
//                         AND shot_history_access IN ('restricted', 'anyone_with_link', 'public')
//   [2] sharedShots     — shots from sharer user IDs (only when [1] non-empty)
//
// shotHistoryAccess: none = never share; restricted = only other bean members; anyone_with_link = + authenticated with link; public = public page.
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

vi.mock("@/lib/beans-access", () => ({
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

function makeAccessAllowed(_ownerId = ALICE_ID) {
  return {
    allowed: true as const,
    bean: {
      id: BEAN_ID,
      name: "Ethiopian Yirgacheffe",
      generalAccess: "restricted" as const,
      shareSlug: null as string | null,
    },
    userBean: {
      beanId: BEAN_ID,
      userId: ALICE_ID,
      status: "owner" as const,
      shotHistoryAccess: "restricted" as const,
      reshareAllowed: false,
      beansOpenDate: null as Date | null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      unsharedAt: null as Date | null,
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

// A sharingMembers row: member with shotHistoryAccess IN ('restricted', 'anyone_with_link', 'public').
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
// shotHistoryAccess on beans_share — per-member control:
//   none = never share (excluded from sharingMembers)
//   restricted = only other bean members (included when viewer is member)
//   anyone_with_link = other members + any authenticated user with the link
//   public = anyone on the public share page
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: No share relationship at all.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Alice owns bean, no share relationship", () => {
  it("Bob cannot see Alice's shots when Alice has not shared with him", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // [0] myShots for Bob → none
    // [1] sharingMembers for Bob → none (no accepted share with non-restricted access)
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
    // [1] sharingMembers for Alice → none (Bob never created a share to Alice)
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
// shotHistoryAccess = 'none' → never share; 'restricted' → only other bean members (included here).
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Alice shares with Bob (accepted) — shotHistoryAccess controls visibility for Bob", () => {
  it("Bob cannot see Alice's shots when Alice has shotHistoryAccess=none (none = never share)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // sharingMembers only includes restricted/anyone_with_link/public; Alice has none so not included.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [], // sharingMembers: empty (Alice has none)
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Bob CAN see Alice's shots when Alice has shotHistoryAccess=restricted (only other members)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // restricted = only other bean members; Bob is a member so sharingMembers includes Alice.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [makeIncomingShare(ALICE_ID)], // sharingMembers: Alice has restricted
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

  it("Bob CAN see Alice's shots when shotHistoryAccess is anyone_with_link or public", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // Alice set shotHistoryAccess to anyone_with_link or public when she created or edited the share.
    // The sharingMembers query returns Alice's row.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [makeIncomingShare(ALICE_ID)], // sharingMembers: shotHistoryAccess anyone_with_link or public
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
// shotHistoryAccess=none: member's shots are NOT visible to anyone else.
// shotHistoryAccess=restricted: member's shots ARE visible to other bean members.
// ─────────────────────────────────────────────────────────────────────────────
describe("shotHistoryAccess none vs restricted", () => {
  it("Bob cannot see Alice's shots when Alice has shotHistoryAccess=none", async () => {
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
    mock.session = makeSession(BOB_ID);

    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [], // sharingMembers: empty (Alice has none)
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Bob CAN see Alice's shots when Alice has shotHistoryAccess=restricted (only other members)", async () => {
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
    mock.session = makeSession(BOB_ID);

    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [makeIncomingShare(ALICE_ID)], // sharingMembers: restricted included
      [makeShot(ALICE_SHOT_ID, ALICE_ID)], // sharedShots
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Bob CAN see Alice's shots when Alice is in sharingMembers (shotHistoryAccess restricted or broader)", async () => {
    // Alice's beans_share row has shotHistoryAccess <> 'restricted', so she
    // appears in sharingMembers and her shots are included.
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
    mock.session = makeSession(BOB_ID);

    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)],
      [makeIncomingShare(ALICE_ID)], // shotHistoryAccess not restricted → row returned
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
// Unshared members' shots excluded (sharingMembers query filters unsharedAt IS NULL)
// ─────────────────────────────────────────────────────────────────────────────
describe("Unshared members' shots excluded from shared view", () => {
  it("Bob sees only his own shots when Alice has been unshared (sharingMembers excludes unshared)", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // Alice was unshared → sharingMembers query (unsharedAt IS NULL) returns [].
    // Bob's own shots still returned; no shared shots from Alice.
    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots for Bob
      [], // sharingMembers: empty because Alice has unsharedAt set
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots).toHaveLength(1);
    expect(body.shots[0].userId).toBe(BOB_ID);
  });

  it("when all members have shotHistoryAccess=none, user sees only their own shots", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(BOB_SHOT_ID, BOB_ID)], // myShots
      [], // sharingMembers: empty (all none)
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots).toHaveLength(1);
    expect(body.shots[0].userId).toBe(BOB_ID);
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
      [], // sharingMembers: no Bob→Alice share
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
  });

  it("Alice can see Bob's shots when Bob has shotHistoryAccess=restricted (only other members)", async () => {
    // Alice→Bob share exists and Bob accepted. Bob set shotHistoryAccess to restricted (or broader).
    // sharingMembers returns Bob, so Alice sees Bob's shots.
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [makeIncomingShare(BOB_ID)], // Bob is a member with restricted or broader
      [makeShot(BOB_SHOT_ID, BOB_ID)],
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
  });

  it("Alice cannot see Bob's shots when Bob has shotHistoryAccess=none", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [], // sharingMembers: Bob has none so not included
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
// Scenario 5: Bob shares history with Alice via a reverse share.
// ─────────────────────────────────────────────────────────────────────────────
describe("Scenario: Bob creates a reverse share to Alice", () => {
  it("Alice can see Bob's shots when Bob has shotHistoryAccess restricted or broader", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [makeIncomingShare(BOB_ID)], // Bob→Alice share with shotHistoryAccess <> restricted
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

  it("Alice cannot see Bob's shots when Bob has shotHistoryAccess=none", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [], // sharingMembers: Bob has none so not included
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(0);
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
  });

  it("Alice can see Bob's shots when Bob has shotHistoryAccess restricted or broader", async () => {
    mock.session = makeSession(ALICE_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    mock.dbResults = [
      [makeShot(ALICE_SHOT_ID, ALICE_ID)],
      [makeIncomingShare(BOB_ID)],
      [makeShot(BOB_SHOT_ID, BOB_ID)],
    ];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: Array<{ userId: string }> };
    expect(body.shots.filter((s) => s.userId === BOB_ID)).toHaveLength(1);
    expect(body.shots.filter((s) => s.userId === ALICE_ID)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hidden shots: the isHidden flag is always respected for shared shots.
// ─────────────────────────────────────────────────────────────────────────────
describe("Hidden shots are never leaked to other users", () => {
  it("Bob does NOT see Alice's hidden shots even when shotHistoryAccess is not restricted", async () => {
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

  it("includes the sharer when shotHistoryAccess is not restricted", async () => {
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

  it("does not include other members in contributors when they have shotHistoryAccess=none", async () => {
    mock.session = makeSession(BOB_ID);
    mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);

    // Alice has none so not in sharingMembers; contributors = only Bob.
    mock.dbResults = [[], []];

    const res = await GET(makeRequest(BEAN_ID), {
      params: Promise.resolve({ id: BEAN_ID }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      contributors: Array<{ userId: string; isCurrentUser: boolean }>;
    };
    expect(body.contributors).toHaveLength(1);
    expect(body.contributors[0].userId).toBe(BOB_ID);
    expect(body.contributors[0].isCurrentUser).toBe(true);
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
