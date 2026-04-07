import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  refreshAiBeansMemory,
  refreshAiUserMemory,
} from "@/lib/ai-suggestions/memory-refresh";
import { config } from "@/shared/config";
import {
  aiMemoryRefreshRequestSchema,
  aiMemoryRefreshResponseSchema,
} from "@/shared/ai-suggestions/schema";

function bearerMatches(expected: string, authorization: string | null): boolean {
  if (!authorization) return false;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  if (!m) return false;
  const token = m[1]!;
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!config.aiMemoryRefreshSecret) {
    return NextResponse.json(
      { error: "Memory refresh is not configured" },
      { status: 503 },
    );
  }

  if (!bearerMatches(config.aiMemoryRefreshSecret, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = aiMemoryRefreshRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { userId, beanId } = parsed.data;
  const refreshed: { user?: boolean; bean?: boolean } = {};

  try {
    if (userId) {
      await refreshAiUserMemory(userId);
      refreshed.user = true;
    }
    if (beanId) {
      await refreshAiBeansMemory(beanId);
      refreshed.bean = true;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Memory refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const body = aiMemoryRefreshResponseSchema.parse({ ok: true as const, refreshed });
  return NextResponse.json(body);
}
