import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const ALICE_ID = "00000000-0000-4000-a000-000000000001";
const SHOT_ID = "00000000-0000-4000-a000-000000000010";
const SHARE_UID = "abc12xyz";

const mock = vi.hoisted(() => ({
  session: null as unknown,
  dbQueue: [] as unknown[][],
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/lib/short-uid", () => ({
  generateShortUid: vi.fn().mockReturnValue("abc12xyz"),
}));

vi.mock("@/db", () => {
  function dequeue(): unknown[] {
    return mock.dbQueue.shift() ?? [];
  }

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() =>
      Object.assign(Promise.resolve(undefined), {
        limit: () => Promise.resolve(dequeue()),
      }),
    ),
  };

  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
    },
  };
});

import { POST as createShare } from "@/app/api/shares/route";
import { GET as getShare, DELETE as deleteShare } from "@/app/api/shares/[uid]/route";

function makeSession(userId: string) {
  return { user: { id: userId, role: "member" as const } };
}

function jsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const POST_SHARES_URL = "http://localhost/api/shares";
const GET_SHARE_URL = `http://localhost/api/shares/${SHARE_UID}`;
const DELETE_SHARE_URL = `http://localhost/api/shares/${SHARE_UID}`;

beforeEach(() => {
  mock.session = null;
  mock.dbQueue = [];
});

describe("Individual shot sharing (shots.share_slug)", () => {
  describe("POST /api/shares — create share slug", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await createShare(
        jsonReq(POST_SHARES_URL, "POST", { shotId: SHOT_ID }),
      );

      expect(res.status).toBe(401);
    });

    it("returns 400 when shotId is missing or invalid", async () => {
      mock.session = makeSession(ALICE_ID);

      const res = await createShare(
        jsonReq(POST_SHARES_URL, "POST", {}),
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 when shot not found or not owned by user", async () => {
      mock.session = makeSession(ALICE_ID);
      mock.dbQueue = [[]];

      const res = await createShare(
        jsonReq(POST_SHARES_URL, "POST", { shotId: SHOT_ID }),
      );

      expect(res.status).toBe(404);
    });

    it("returns 200 with existing share when shot already has shareSlug", async () => {
      mock.session = makeSession(ALICE_ID);
      const shot = {
        id: SHOT_ID,
        userId: ALICE_ID,
        shareSlug: "existing-slug",
        createdAt: new Date(),
      };
      mock.dbQueue = [[shot]];

      const res = await createShare(
        jsonReq(POST_SHARES_URL, "POST", { shotId: SHOT_ID }),
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe("existing-slug");
    });

    it("returns 201 and sets share_slug when shot has no shareSlug", async () => {
      mock.session = makeSession(ALICE_ID);
      const shot = {
        id: SHOT_ID,
        userId: ALICE_ID,
        shareSlug: null as string | null,
        createdAt: new Date(),
      };
      mock.dbQueue = [[shot]];

      const res = await createShare(
        jsonReq(POST_SHARES_URL, "POST", { shotId: SHOT_ID }),
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { id: string; shotId: string };
      expect(body.id).toBe(SHARE_UID);
      expect(body.shotId).toBe(SHOT_ID);
    });
  });

  describe("GET /api/shares/:uid — read shared shot by slug", () => {
    it("returns 404 when uid does not match any shot", async () => {
      mock.dbQueue = [[]];

      const res = await getShare(
        new NextRequest(GET_SHARE_URL),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(404);
    });

    it("returns 200 with shot data when slug matches", async () => {
      const shotRow = {
        id: SHOT_ID,
        userName: "Alice",
        userImage: null,
        beanName: "Test Bean",
        beanRoastLevel: "Medium",
        beanRoastDate: new Date(),
        grinderName: null,
        machineName: null,
        doseGrams: "18",
        yieldGrams: "36",
        grindLevel: "15",
        brewTimeSecs: "28",
        brewTempC: "93",
        preInfusionDuration: null,
        brewPressure: "9",
        estimateMaxPressure: null,
        flowControl: null,
        flowRate: "2",
        shotQuality: "4",
        rating: "4",
        bitter: "2",
        sour: "2",
        notes: null,
        flavors: null,
        bodyTexture: null,
        adjectives: null,
        isReferenceShot: false,
        createdAt: new Date(),
      };
      mock.dbQueue = [[shotRow]];

      const res = await getShare(
        new NextRequest(GET_SHARE_URL),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; shareId: string; brewRatio: number | null };
      expect(body.shareId).toBe(SHARE_UID);
      expect(body.brewRatio).toBe(2);
    });
  });

  describe("DELETE /api/shares/:uid — remove share slug", () => {
    it("returns 401 when not authenticated", async () => {
      const res = await deleteShare(
        new NextRequest(DELETE_SHARE_URL, { method: "DELETE" }),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(401);
    });

    it("returns 404 when uid does not match any shot", async () => {
      mock.session = makeSession(ALICE_ID);
      mock.dbQueue = [[]];

      const res = await deleteShare(
        new NextRequest(DELETE_SHARE_URL, { method: "DELETE" }),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(404);
    });

    it("returns 403 when shot belongs to another user", async () => {
      mock.session = makeSession(ALICE_ID);
      mock.dbQueue = [[{ id: SHOT_ID, userId: "00000000-0000-4000-a000-000000000002" }]];

      const res = await deleteShare(
        new NextRequest(DELETE_SHARE_URL, { method: "DELETE" }),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(403);
    });

    it("returns 204 when owner removes share slug", async () => {
      mock.session = makeSession(ALICE_ID);
      mock.dbQueue = [[{ id: SHOT_ID, userId: ALICE_ID }]];

      const res = await deleteShare(
        new NextRequest(DELETE_SHARE_URL, { method: "DELETE" }),
        { params: Promise.resolve({ uid: SHARE_UID }) },
      );

      expect(res.status).toBe(204);
    });
  });
});
