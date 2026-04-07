import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const refreshUser = vi.fn();
const refreshBean = vi.fn();

vi.mock("@/lib/ai-suggestions/memory-refresh", () => ({
  refreshAiUserMemory: (...args: unknown[]) => refreshUser(...args),
  refreshAiBeansMemory: (...args: unknown[]) => refreshBean(...args),
}));

vi.mock("@/shared/config", () => ({
  config: {
    get aiMemoryRefreshSecret() {
      return "secret-for-test";
    },
  },
}));

import { POST } from "../route";

const URL = "http://localhost/api/ai-memory/refresh";

function req(body: unknown, auth?: string): NextRequest {
  return new NextRequest(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai-memory/refresh", () => {
  beforeEach(() => {
    refreshUser.mockReset();
    refreshBean.mockReset();
    refreshUser.mockResolvedValue(undefined);
    refreshBean.mockResolvedValue(undefined);
  });

  it("returns 401 without valid bearer token", async () => {
    const res = await POST(req({ userId: "u_1" }, "Bearer wrong"));
    expect(res.status).toBe(401);
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it("calls refresh helpers with valid bearer", async () => {
    const res = await POST(
      req({ userId: "u_1", beanId: "b_1" }, "Bearer secret-for-test"),
    );
    expect(res.status).toBe(200);
    expect(refreshUser).toHaveBeenCalledWith("u_1");
    expect(refreshBean).toHaveBeenCalledWith("b_1");
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.refreshed).toEqual({ user: true, bean: true });
  });
});
