import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const ALICE_ID = "user-alice";
const BOB_ID = "user-bob";
const BEAN_ID = "bean-1";

const mock = vi.hoisted(() => ({
  session: null as { user: { id: string; role: string } } | null,
  dbQueue: [] as unknown[][],
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/db", () => {
  function dequeue(): unknown[] {
    return mock.dbQueue.shift() ?? [];
  }
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() =>
      Object.assign(Promise.resolve(dequeue()), {
        orderBy: () => Promise.resolve(dequeue()),
        limit: () => Promise.resolve(dequeue()),
      }),
    ),
    orderBy: vi.fn().mockImplementation(() => Promise.resolve(dequeue())),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
    },
  };
});

import { GET as compareGet } from "@/app/api/beans/compare/route";

function shotRow(
  id: string,
  userId: string,
  overrides: Partial<{
    isReferenceShot: boolean;
    isHidden: boolean;
    doseGrams: string;
    createdAt: Date;
  }> = {},
) {
  return {
    id,
    beanId: BEAN_ID,
    userId,
    doseGrams: overrides.doseGrams ?? "18",
    yieldGrams: "36",
    grindLevel: "3",
    brewTimeSecs: "28",
    brewTempC: "93",
    preInfusionDuration: null,
    brewPressure: "9",
    flowRate: null,
    shotQuality: "4",
    rating: "4",
    bitter: null,
    sour: null,
    notes: null,
    flavors: null,
    bodyTexture: null,
    adjectives: null,
    isReferenceShot: overrides.isReferenceShot ?? false,
    isHidden: overrides.isHidden ?? false,
    createdAt: overrides.createdAt ?? new Date("2024-01-01"),
  };
}

function beanRow() {
  return {
    id: BEAN_ID,
    name: "Ethiopia",
    originId: null,
    roasterId: null,
    originName: null,
    roasterName: null,
    originDetails: null,
    processingMethod: null,
    roastLevel: "Light",
    roastDate: null,
    isRoastDateBestGuess: false,
    createdAt: new Date(),
    beansOpenDate: null,
    userBeanCreatedAt: new Date(),
    beanId: BEAN_ID,
    userId: ALICE_ID,
    shotHistoryAccess: "restricted",
  };
}

beforeEach(() => {
  mock.session = { user: { id: ALICE_ID, role: "member" } };
  mock.dbQueue = [];
});

describe("GET /api/beans/compare", () => {
  it("includes other members' shots for members when shared shot history applies", async () => {
    const aliceShot = shotRow("s-alice", ALICE_ID, { isReferenceShot: true });
    const bobShot = shotRow("s-bob", BOB_ID, { isReferenceShot: true });
    mock.dbQueue = [
      [beanRow()],
      [aliceShot],
      [{ userId: BOB_ID, beanId: BEAN_ID }],
      [bobShot],
    ];

    const req = new NextRequest(
      `http://localhost/api/beans/compare?beanIds=${BEAN_ID}`,
    );
    const res = await compareGet(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      beans: Array<{ shotComparisons: { shots: Array<{ id: string }> } }>;
    };
    const ids = body.beans[0].shotComparisons.shots.map((s) => s.id).sort();
    expect(ids).toEqual(["s-alice", "s-bob"]);
  });
});
