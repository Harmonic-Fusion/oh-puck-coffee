import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const BEAN_ID = "00000000-0000-4000-b000-000000000001";
const OWNER_ID = "00000000-0000-4000-a000-000000000001";
const SLUG = "test-bean-slug";

const mock = vi.hoisted(() => ({
  session: null as unknown,
  dbQueue: [] as unknown[][],
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/db", () => {
  function dequeue(): unknown[] {
    return mock.dbQueue.shift() ?? [];
  }

  // Lazy: only call dequeue() when .limit() is invoked or when the thenable is awaited (no .limit).
  const thenableWithLimit = () => ({
    then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(dequeue()).then(onFulfilled, onRejected);
    },
    limit: () => Promise.resolve(dequeue()),
    orderBy: () => ({ limit: () => Promise.resolve(dequeue()) }),
  });

  const chainWithOrder = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(thenableWithLimit),
    orderBy: vi.fn().mockReturnThis(),
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(chainWithOrder),
    },
  };
});

import { GET as getBean } from "@/app/api/shares/beans/[slug]/route";
import { GET as getStats } from "@/app/api/shares/beans/[slug]/stats/route";

function makeBean(overrides: { generalAccess?: string; shareSlug?: string | null } = {}) {
  return {
    id: BEAN_ID,
    name: "Test Bean",
    originId: null,
    roasterId: null,
    originDetails: null,
    processingMethod: null,
    roastLevel: "Medium",
    roastDate: null,
    isRoastDateBestGuess: false,
    generalAccess: "anyone_with_link" as const,
    shareSlug: SLUG,
    createdAt: new Date(),
    updatedAt: new Date(),
    updatedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  mock.dbQueue = [];
});

describe("GET /api/shares/beans/:slug — public share page", () => {
  it("returns 404 when slug does not match any bean", async () => {
    mock.dbQueue = [[]];

    const res = await getBean(new NextRequest(`http://localhost/api/shares/beans/${SLUG}`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Bean not found");
  });

  it("returns 403 when generalAccess is restricted (no auth required to see denial)", async () => {
    mock.dbQueue = [[makeBean({ generalAccess: "restricted" })]];

    const res = await getBean(new NextRequest(`http://localhost/api/shares/beans/${SLUG}`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Access denied");
  });

  it("returns 200 with bean and shots when generalAccess is anyone_with_link (unauthenticated ok)", async () => {
    const bean = makeBean({ generalAccess: "anyone_with_link" });
    const ownerRow = { userId: OWNER_ID };
    const optedInRows = [{ userId: OWNER_ID }]; // owner with shotHistoryAccess=public so shots are included
    const creatorShots = [
      {
        id: "s1",
        doseGrams: "18",
        yieldGrams: "36",
        grindLevel: "15",
        brewTimeSecs: "28",
        brewTempC: "93",
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
        userName: "Alice",
        userImage: null,
        grinderName: null,
        machineName: null,
      },
    ];
    mock.dbQueue = [[bean], [ownerRow], optedInRows, creatorShots];

    const res = await getBean(new NextRequest(`http://localhost/api/shares/beans/${SLUG}`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bean: { id: string; generalAccess: string }; shots: unknown[] };
    expect(body.bean.id).toBe(BEAN_ID);
    expect(body.bean.generalAccess).toBe("anyone_with_link");
    expect(body.shots).toHaveLength(1);
  });

  it("returns 200 with bean and shots when generalAccess is public (unauthenticated ok)", async () => {
    const bean = makeBean({ generalAccess: "public" });
    const ownerRow = { userId: OWNER_ID };
    const optedInRows: { userId: string }[] = [];
    const creatorShots: unknown[] = [];
    mock.dbQueue = [[bean], [ownerRow], optedInRows, creatorShots];

    const res = await getBean(new NextRequest(`http://localhost/api/shares/beans/${SLUG}`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { bean: { generalAccess: string } };
    expect(body.bean.generalAccess).toBe("public");
  });

  it("includes shots only from owner and members with shotHistoryAccess=public", async () => {
    const bean = makeBean({ generalAccess: "public" });
    const ownerRow = { userId: OWNER_ID };
    const contributorId = "00000000-0000-4000-a000-000000000002";
    const optedInRows = [{ userId: OWNER_ID }, { userId: contributorId }];
    const ownerAndContributorShots = [
      { id: "s1", createdAt: new Date(), userName: "Alice" },
      { id: "s2", createdAt: new Date(), userName: "Bob" },
    ];
    mock.dbQueue = [[bean], [ownerRow], optedInRows, ownerAndContributorShots];

    const res = await getBean(new NextRequest(`http://localhost/api/shares/beans/${SLUG}`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { shots: unknown[] };
    expect(body.shots).toHaveLength(2);
  });
});

describe("GET /api/shares/beans/:slug/stats — public stats", () => {
  it("returns 404 when slug does not match any bean", async () => {
    mock.dbQueue = [[]];

    const res = await getStats(new NextRequest(`http://localhost/api/shares/beans/${SLUG}/stats`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 403 when generalAccess is restricted", async () => {
    mock.dbQueue = [[makeBean({ generalAccess: "restricted" })]];

    const res = await getStats(new NextRequest(`http://localhost/api/shares/beans/${SLUG}/stats`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Access denied");
  });

  it("returns 200 with shotCount, followerCount, averageRating, flavorsByAverageRating when public", async () => {
    const bean = makeBean({ generalAccess: "public" });
    const ownerRow = { userId: OWNER_ID };
    const optedInRows: { userId: string }[] = [];
    const creatorShots = [{ rating: "4.0", flavors: ["chocolate"] }];
    const contributorShots: { rating: string | null; flavors: string[] | null }[] = [];
    mock.dbQueue = [
      [bean],
      [ownerRow],
      [{ count: 2 }],
      optedInRows,
      creatorShots,
      contributorShots,
    ];

    const res = await getStats(new NextRequest(`http://localhost/api/shares/beans/${SLUG}/stats`), {
      params: Promise.resolve({ slug: SLUG }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      shotCount: number;
      followerCount: number;
      averageRating: number | null;
      flavorsByAverageRating: unknown[];
    };
    expect(body).toHaveProperty("shotCount");
    expect(body).toHaveProperty("followerCount");
    expect(body).toHaveProperty("averageRating");
    expect(body).toHaveProperty("flavorsByAverageRating");
  });
});
