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

vi.mock("@/lib/beans-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/beans-access")>();
  return {
    ...actual,
    canAccessBean: vi.fn().mockImplementation(() =>
      Promise.resolve(mock.canAccessBeanResult),
    ),
  };
});

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

  // select chain: .select().from().where()  or  .select().from().innerJoin().where()  or  .limit()
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
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
import { POST as postBean } from "@/app/api/beans/route";
import { POST } from "@/app/api/beans/[id]/shares/route";
import {
  PATCH as patchShare,
  DELETE as deleteShareHandler,
} from "@/app/api/beans/[id]/shares/[shareId]/route";
import { PATCH as patchGeneralAccess } from "@/app/api/beans/[id]/general-access/route";
import { POST as acceptShare } from "@/app/api/beans/[id]/shares/[shareId]/accept/route";
import { POST as addToCollection } from "@/app/api/beans/[id]/add-to-collection/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSession(userId: string, entitlements: string[] = [Entitlements.BEAN_SHARE]) {
  return { user: { id: userId, role: "member" as const, entitlements } };
}

function makeAccessAllowed(ownerId = ALICE_ID, asOwner = false) {
  const bean = {
    id: BEAN_ID,
    name: "Test Bean",
    generalAccess: "restricted" as const,
    shareSlug: null as string | null,
  };
  const userBean = asOwner
    ? {
        id: "owner-share-id",
        beanId: BEAN_ID,
        userId: ownerId,
        invitedBy: null,
        status: "owner" as const,
        shotHistoryAccess: "restricted" as const,
        reshareAllowed: false,
        beansOpenDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : null;
  return {
    allowed: true as const,
    bean,
    userBean,
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
const BEANS_URL  = "http://localhost/api/beans";
const ADD_TO_COLLECTION_URL = `http://localhost/api/beans/${BEAN_ID}/add-to-collection`;
const ACCEPT_SHARE_URL = `http://localhost/api/beans/${BEAN_ID}/shares/${SHARE_ID}/accept`;

// ─── Reset before each test ───────────────────────────────────────────────────
beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.dbQueue = [];
});

// ─────────────────────────────────────────────────────────────────────────────
// Bean sharing API — grouped by route, then by behavior
// ─────────────────────────────────────────────────────────────────────────────

describe("Bean sharing API", () => {
  // ─── POST /api/beans ───────────────────────────────────────────────────────
  describe("POST /api/beans", () => {
    it("creates bean and owner beans_share row with status 'owner'", async () => {
      mock.session = makeSession(ALICE_ID);
      const createdBean = {
        id: BEAN_ID,
        name: "New Bean",
        originId: null,
        roasterId: null,
        originDetails: null,
        processingMethod: null,
        roastLevel: "Medium",
        roastDate: null,
        isRoastDateBestGuess: false,
        generalAccess: "restricted",
        shareSlug: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: null,
      };
      const ownerShare = {
        id: "owner-share-id",
        beanId: BEAN_ID,
        userId: ALICE_ID,
        invitedBy: null,
        status: "owner" as const,
        shotHistoryAccess: "restricted" as const,
        reshareAllowed: true,
        beansOpenDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mock.dbQueue = [
        [createdBean],  // insert(beans).returning()
        [ownerShare],   // select().from(beansShare).where().limit(1)
      ];

      const res = await postBean(
        jsonReq(BEANS_URL, "POST", { name: "New Bean", roastLevel: "Medium" }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { userBean?: { status: string } };
      expect(body.userBean).toBeDefined();
      expect(body.userBean?.status).toBe("owner");
    });
  });

  // ─── POST /api/beans/:id/shares ────────────────────────────────────────────
  describe("POST /api/beans/:id/shares", () => {
    describe("permission enforcement", () => {
      const body = { userId: CAROL_ID, reshareAllowed: false };

      it("returns 403 when non-owner has no share record at all", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns
        mock.dbQueue = [[]]; // reshare check → no row

        const res = await POST(
          jsonReq(SHARES_URL, "POST", body),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(403);
        const json = (await res.json()) as { error: string };
        expect(json.error).toMatch(/forbidden/i);
      });

      it("returns 403 when non-owner share row exists but reshareAllowed is false", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed();
        mock.dbQueue = [[{ reshareAllowed: false }]]; // explicit false

        const res = await POST(
          jsonReq(SHARES_URL, "POST", body),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(403);
      });

      it("returns 201 when non-owner has reshareAllowed on their accepted share", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed();
        const newShare = {
          id: "new-share-id",
          beanId: BEAN_ID,
          userId: CAROL_ID,
          invitedBy: BOB_ID,
          status: "pending",
          shotHistoryAccess: "restricted" as const,
          reshareAllowed: false,
          createdAt: new Date().toISOString(),
        };
        mock.dbQueue = [
          [{ reshareAllowed: true }], // reshare check → Bob can reshare
          [],                         // individualShareCount (shares Bob already created)
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
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true); // Alice owns, Alice calls
        const newShare = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          invitedBy: ALICE_ID,
          status: "pending",
          shotHistoryAccess: "restricted" as const,
          reshareAllowed: false,
          createdAt: new Date().toISOString(),
        };
        mock.dbQueue = [
          [], // individualShareCount
          [], // existing share duplicate check
          [newShare], // insert.values.returning
        ];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: BOB_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(201);
      });
    });

    describe("direct invite lifecycle", () => {
      it("returns 200 with existing row when invitee already has an active share (duplicate prevention)", async () => {
        mock.session = makeSession(ALICE_ID);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        const existingShare = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          invitedBy: ALICE_ID,
          status: "accepted" as const,
          shotHistoryAccess: "restricted" as const,
          reshareAllowed: false,
          beansOpenDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          unsharedAt: null,
        };
        mock.dbQueue = [
          [],              // individualShareCount
          [existingShare], // existing share lookup
        ];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: BOB_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as { id: string; status: string };
        expect(body.id).toBe(SHARE_ID);
        expect(body.status).toBe("accepted");
      });

      it("returns 403 when at max bean shares limit (direct invites)", async () => {
        mock.session = makeSession(ALICE_ID, [Entitlements.BEAN_SHARE]);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        const tenShares = Array.from({ length: 10 }, (_, i) => ({
          id: `share-${i}`,
          beanId: BEAN_ID,
          invitedBy: ALICE_ID,
        }));
        mock.dbQueue = [tenShares, []];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: CAROL_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(403);
        const json = (await res.json()) as { code?: string };
        expect(json.code).toBe("MAX_BEAN_SHARES");
      });

      it("returns 403 when requester lacks bean-share entitlement", async () => {
        mock.session = makeSession(ALICE_ID, []);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        mock.dbQueue = [[], []];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: BOB_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(403);
        const json = (await res.json()) as { code?: string };
        expect(json.code).toBe("ENTITLEMENT_REQUIRED");
      });
    });

    describe("resharing", () => {
      it("creates pending share with invitedBy = resharer when member has reshareAllowed", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed(); // Alice owns
        const newShare = {
          id: "new-share-id",
          beanId: BEAN_ID,
          userId: CAROL_ID,
          invitedBy: BOB_ID,
          status: "pending",
          shotHistoryAccess: "restricted" as const,
          reshareAllowed: false,
          createdAt: new Date().toISOString(),
        };
        mock.dbQueue = [
          [{ reshareAllowed: true }],
          [], [], [newShare],
        ];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: CAROL_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(201);
        const resBody = (await res.json()) as { invitedBy: string; status: string };
        expect(resBody.invitedBy).toBe(BOB_ID);
        expect(resBody.status).toBe("pending");
      });
    });

    describe("re-invite after unfollow", () => {
      it("owner re-inviting unfollowed user returns 200 with status accepted when existing row has status unfollowed", async () => {
        mock.session = makeSession(ALICE_ID);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        const existingUnfollowed = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          invitedBy: ALICE_ID,
          status: "unfollowed" as const,
          shotHistoryAccess: "restricted" as const,
          reshareAllowed: false,
          beansOpenDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const updatedRow = {
          ...existingUnfollowed,
          status: "accepted" as const,
          invitedBy: ALICE_ID,
          updatedAt: new Date(),
        };
        mock.dbQueue = [
          [],                      // individualShareCount
          [existingUnfollowed],    // existing share lookup (status unfollowed)
          [updatedRow],            // update.set.where.returning
        ];

        const res = await POST(
          jsonReq(SHARES_URL, "POST", { userId: BOB_ID, reshareAllowed: false }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(200);
        const resBody = (await res.json()) as { status: string };
        expect(resBody.status).toBe("accepted");
      });
    });
  });

  // ─── POST /api/beans/:id/shares/:shareId/accept ────────────────────────────
  describe("POST /api/beans/:id/shares/:shareId/accept", () => {
    it("changes pending share to accepted and returns updated row", async () => {
      mock.session = makeSession(BOB_ID);
      const pendingShare = {
        id: SHARE_ID,
        beanId: BEAN_ID,
        userId: BOB_ID,
        invitedBy: ALICE_ID,
        status: "pending" as const,
        shotHistoryAccess: "restricted" as const,
        reshareAllowed: false,
        beansOpenDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const acceptedShare = { ...pendingShare, status: "accepted" as const, updatedAt: new Date() };
      mock.dbQueue = [[pendingShare], [acceptedShare]];

      const res = await acceptShare(
        new NextRequest(ACCEPT_SHARE_URL, { method: "POST" }),
        { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("accepted");
    });

    it("returns 404 when share not found or not pending", async () => {
      mock.session = makeSession(BOB_ID);
      mock.dbQueue = [[]];

      const res = await acceptShare(
        new NextRequest(ACCEPT_SHARE_URL, { method: "POST" }),
        { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
      );

      expect(res.status).toBe(404);
    });
  });

  // ─── POST /api/beans/:id/add-to-collection ──────────────────────────────────
  describe("POST /api/beans/:id/add-to-collection", () => {
    describe("self-join", () => {
      it("creates beans_share with status 'self' and invitedBy null when user follows via link", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = {
          allowed: true as const,
          bean: {
            id: BEAN_ID,
            name: "Test Bean",
            generalAccess: "anyone_with_link" as const,
            shareSlug: "abc",
          } as unknown,
          userBean: null,
        };
        mock.dbQueue = [];

        const res = await addToCollection(
          new NextRequest(ADD_TO_COLLECTION_URL, { method: "POST" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(201);
        const body = (await res.json()) as { message: string };
        expect(body.message).toMatch(/added to your collection/i);
      });

      it("returns 200 when user already has an active row (already in collection)", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = {
          allowed: true as const,
          bean: {
            id: BEAN_ID,
            name: "Test Bean",
            generalAccess: "restricted" as const,
            shareSlug: null,
          },
          userBean: {
            id: SHARE_ID,
            beanId: BEAN_ID,
            userId: BOB_ID,
            status: "accepted" as const,
            invitedBy: ALICE_ID,
          },
        };
        mock.dbQueue = [];

        const res = await addToCollection(
          new NextRequest(ADD_TO_COLLECTION_URL, { method: "POST" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(200);
        const body = (await res.json()) as { message?: string };
        expect(body.message).toMatch(/already in your collection/i);
      });
    });

    describe("re-follow after unfollow or removal", () => {
      it("re-follow via add-to-collection restores access when user had unfollowed", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = {
          allowed: true as const,
          bean: {
            id: BEAN_ID,
            name: "Test Bean",
            generalAccess: "anyone_with_link" as const,
            shareSlug: "abc",
          } as unknown,
          userBean: {
            id: SHARE_ID,
            beanId: BEAN_ID,
            userId: BOB_ID,
            status: "unfollowed" as const,
            invitedBy: null,
          },
        };
        mock.dbQueue = [[], []];

        const res = await addToCollection(
          new NextRequest(ADD_TO_COLLECTION_URL, { method: "POST" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect([200, 201]).toContain(res.status);
        const body = (await res.json()) as { message?: string };
        expect(body.message).toMatch(/already in your collection|added to your collection/i);
      });

      it("removed user re-following via add-to-collection can restore access (self) — when status was unfollowed", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = {
          allowed: true as const,
          bean: {
            id: BEAN_ID,
            name: "Test Bean",
            generalAccess: "anyone_with_link" as const,
            shareSlug: "link",
          } as unknown,
          userBean: {
            id: SHARE_ID,
            beanId: BEAN_ID,
            userId: BOB_ID,
            status: "unfollowed" as const,
            invitedBy: ALICE_ID,
          },
        };
        mock.dbQueue = [];

        const res = await addToCollection(
          new NextRequest(ADD_TO_COLLECTION_URL, { method: "POST" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect([200, 201]).toContain(res.status);
      });
    });
  });

  // ─── PATCH /api/beans/:id/shares/:shareId ───────────────────────────────────
  describe("PATCH /api/beans/:id/shares/:shareId", () => {
    it("returns 403 when non-owner tries to edit share options for another user's row", async () => {
      mock.session = makeSession(BOB_ID);
      mock.canAccessBeanResult = makeAccessAllowed();
      mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: CAROL_ID, reshareAllowed: false, shotHistoryAccess: "restricted", status: "accepted" }]];

      const res = await patchShare(
        jsonReq(SHARE_URL, "PATCH", { shotHistoryAccess: "anyone_with_link" }),
        { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toMatch(/forbidden/i);
    });

    it("returns 200 when owner edits share options", async () => {
      mock.session = makeSession(ALICE_ID);
      mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
      const share = { id: SHARE_ID, beanId: BEAN_ID, reshareAllowed: false, shotHistoryAccess: "restricted" as const, status: "accepted" };
      mock.dbQueue = [
        [share],
        [{ ...share, shotHistoryAccess: "anyone_with_link" }],
      ];

      const res = await patchShare(
        jsonReq(SHARE_URL, "PATCH", { shotHistoryAccess: "anyone_with_link" }),
        { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
      );

      expect(res.status).toBe(200);
    });

    it("returns 403 when non-owner tries to set reshareAllowed on their own row", async () => {
      // Bob (member, not owner) tries to set reshareAllowed on his own share row
      const bobShareId = "share-bob";
      mock.session = makeSession(BOB_ID);
      mock.canAccessBeanResult = makeAccessAllowed(); // Bob is member, not owner
      mock.dbQueue = [[{ id: bobShareId, beanId: BEAN_ID, userId: BOB_ID, reshareAllowed: false, shotHistoryAccess: "restricted", status: "accepted" }]];

      const res = await patchShare(
        jsonReq(SHARE_URL.replace(SHARE_ID, bobShareId), "PATCH", { reshareAllowed: true }),
        { params: Promise.resolve({ id: BEAN_ID, shareId: bobShareId }) },
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toMatch(/owner.*reshare/i);
    });
  });

  // ─── DELETE /api/beans/:id/shares/:shareId ──────────────────────────────────
  describe("DELETE /api/beans/:id/shares/:shareId", () => {
    describe("receiver (unfollow / decline)", () => {
      it("returns 204 when receiver unfollows (accepted share)", async () => {
        mock.session = makeSession(BOB_ID);
        const share = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          status: "accepted" as const,
          invitedBy: ALICE_ID,
        };
        const ownerRow = { userId: ALICE_ID };
        mock.dbQueue = [[share], [ownerRow], [], []];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(204);
      });

      it("returns 204 when receiver unfollows (self share)", async () => {
        mock.session = makeSession(BOB_ID);
        const share = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          status: "self" as const,
          invitedBy: null,
        };
        const ownerRow = { userId: ALICE_ID };
        mock.dbQueue = [[share], [ownerRow], [], []];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(204);
      });

      it("returns 204 when receiver declines a pending invite (hard-delete)", async () => {
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
        mock.canAccessBeanResult = makeAccessAllowed();
        mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: BOB_ID, status: "accepted" }]];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(403);
      });
    });

    describe("owner removes member", () => {
      it("returns 204 and recursively deletes member and descendants when owner deletes a share", async () => {
        mock.session = makeSession(ALICE_ID);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        const bobShare = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          invitedBy: ALICE_ID,
          status: "accepted" as const,
        };
        mock.dbQueue = [[bobShare], [bobShare], [], []];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(204);
      });

      it("returns 403 when non-owner tries to remove another member", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID);
        mock.dbQueue = [[{ id: SHARE_ID, beanId: BEAN_ID, userId: CAROL_ID, status: "accepted" }]];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(403);
      });
    });

    describe("voluntary unfollow (re-parent descendants)", () => {
      it("re-parents descendants to owner when member with invitees unfollows", async () => {
        mock.session = makeSession(BOB_ID);
        const bobShare = {
          id: SHARE_ID,
          beanId: BEAN_ID,
          userId: BOB_ID,
          status: "accepted" as const,
          invitedBy: ALICE_ID,
        };
        const ownerRow = { userId: ALICE_ID };
        mock.dbQueue = [[bobShare], [ownerRow], [], []];

        const res = await deleteShareHandler(
          new NextRequest(SHARE_URL, { method: "DELETE" }),
          { params: Promise.resolve({ id: BEAN_ID, shareId: SHARE_ID }) },
        );

        expect(res.status).toBe(204);
      });
    });
  });

  // ─── PATCH /api/beans/:id/general-access ────────────────────────────────────
  describe("PATCH /api/beans/:id/general-access", () => {
    describe("owner-only", () => {
      it("returns 403 when non-owner tries to change general access", async () => {
        mock.session = makeSession(BOB_ID);
        mock.canAccessBeanResult = makeAccessAllowed();

        const res = await patchGeneralAccess(
          jsonReq(GA_URL, "PATCH", { generalAccess: "anyone_with_link" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(403);
      });

      it("returns 200 when owner changes general access", async () => {
        mock.session = makeSession(ALICE_ID);
        mock.canAccessBeanResult = makeAccessAllowed(ALICE_ID, true);
        const updatedBean = {
          id: BEAN_ID,
          generalAccess: "anyone_with_link",
          shareSlug: "test-slug-abc",
        };
        mock.dbQueue = [[], [], [], [updatedBean]];

        const res = await patchGeneralAccess(
          jsonReq(GA_URL, "PATCH", { generalAccess: "anyone_with_link" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(200);
      });
    });

    describe("downgrade to restricted", () => {
      it("returns 400 CANNOT_DOWNGRADE_GENERAL_ACCESS when owner tries to downgrade from anyone_with_link to restricted", async () => {
        mock.session = makeSession(ALICE_ID);
        mock.canAccessBeanResult = {
          allowed: true as const,
          bean: {
            id: BEAN_ID,
            name: "Test Bean",
            generalAccess: "anyone_with_link" as const,
            shareSlug: "existing-slug",
          } as unknown,
          userBean: makeAccessAllowed(ALICE_ID, true).userBean,
        };

        const res = await patchGeneralAccess(
          jsonReq(GA_URL, "PATCH", { generalAccess: "restricted" }),
          { params: Promise.resolve({ id: BEAN_ID }) },
        );

        expect(res.status).toBe(400);
        const body = (await res.json()) as { code: string };
        expect(body.code).toBe("CANNOT_DOWNGRADE_GENERAL_ACCESS");
      });
    });
  });
});
