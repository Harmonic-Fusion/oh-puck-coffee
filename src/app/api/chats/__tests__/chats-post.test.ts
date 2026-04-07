import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const ALICE_ID = "u_alice_test_12345678901";

const mock = vi.hoisted(() => ({
  session: null as unknown,
  canAccessBeanResult: null as unknown,
  /** Each `.where()` resolution consumes the next array (FIFO). */
  selectWhereQueue: [] as unknown[][],
  model: {} as unknown,
  generateTextImpl: null as (() => Promise<unknown>) | null,
  deleteWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/auth", () => ({
  getSession: vi.fn().mockImplementation(() => Promise.resolve(mock.session)),
}));

vi.mock("@/lib/beans-access", () => ({
  canAccessBean: vi
    .fn()
    .mockImplementation(() => Promise.resolve(mock.canAccessBeanResult)),
}));

vi.mock("@/lib/ai-suggestions/model", () => ({
  createSuggestionLanguageModel: vi.fn().mockImplementation(() => mock.model),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(() => {
    if (!mock.generateTextImpl) {
      return Promise.resolve({
        text: "Dial finer 0.2 and add 1°C.",
        totalUsage: { totalTokens: 100 },
        finishReason: "stop",
      });
    }
    return mock.generateTextImpl();
  }),
}));

vi.mock("@/db", () => {
  function nextSelect(): unknown[] {
    return mock.selectWhereQueue.shift() ?? [];
  }

  function whereResult() {
    return {
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve(nextSelect())),
      }),
      limit: vi.fn().mockImplementation(() => Promise.resolve(nextSelect())),
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
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      delete: vi.fn().mockImplementation(() => ({
        where: mock.deleteWhere,
      })),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue(undefined),
          }),
        };
        await fn(tx);
      }),
    },
  };
});

import { POST } from "@/app/api/chats/route";
import { generateText } from "ai";

const CHATS_URL = "http://localhost/api/chats";

function jsonReq(body: unknown): NextRequest {
  return new NextRequest(CHATS_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeAccess(beanId: string, userId: string) {
  return {
    allowed: true as const,
    bean: {
      id: beanId,
      name: "Test Bean",
      originId: null as string | null,
      roasterId: null,
      originDetails: null,
      processingMethod: "Washed",
      roastLevel: "Light",
      roastDate: null,
      isRoastDateBestGuess: false,
      generalAccess: "restricted" as const,
      shareSlug: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: null,
    },
    userBean: {
      id: "b2u_share",
      beanId,
      userId,
      status: "owner" as const,
      invitedBy: null,
      shotHistoryAccess: "restricted" as const,
      reshareAllowed: false,
      beansOpenDate: null,
      chatId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

beforeEach(() => {
  mock.session = null;
  mock.canAccessBeanResult = null;
  mock.selectWhereQueue = [];
  mock.model = { kind: "mock-model" };
  mock.generateTextImpl = null;
  mock.deleteWhere.mockClear();
  vi.mocked(generateText).mockClear();
});

describe("POST /api/chats", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await POST(jsonReq({ beanId: "b_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 503 when OpenAI is not configured", async () => {
    mock.session = {
      user: { id: ALICE_ID, role: "member", entitlements: [] },
    };
    mock.canAccessBeanResult = makeAccess("b_1", ALICE_ID);
    mock.model = null;

    const res = await POST(jsonReq({ beanId: "b_1" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("openai_not_configured");
  });

  it("returns 429 when weekly limit is reached", async () => {
    mock.session = {
      user: { id: ALICE_ID, role: "member", entitlements: [] },
    };
    mock.canAccessBeanResult = makeAccess("b_1", ALICE_ID);
    mock.model = { kind: "mock-model" };
    mock.selectWhereQueue = [[{ n: 3 }]];

    const res = await POST(jsonReq({ beanId: "b_1" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("ai_suggestion_limit");
  });

  it("returns 502 and deletes chat when generateText throws", async () => {
    mock.session = {
      user: { id: ALICE_ID, role: "member", entitlements: [] },
    };
    mock.canAccessBeanResult = makeAccess("b_1", ALICE_ID);
    mock.model = { kind: "mock-model" };
    mock.selectWhereQueue = [[{ n: 0 }], [], [], [], []];
    mock.generateTextImpl = () => Promise.reject(new Error("provider down"));

    const res = await POST(jsonReq({ beanId: "b_1" }));
    expect(res.status).toBe(502);
    expect(mock.deleteWhere).toHaveBeenCalled();
  });
});
