import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { config } from "@/shared/config";
import { Entitlements, hasEntitlement } from "@/lib/entitlements";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasUnlimitedShots =
    session.user.role === "admin" ||
    hasEntitlement(session.user.entitlements, Entitlements.NO_SHOT_VIEW_LIMIT);

  const [row] = await db
    .select({ total: count() })
    .from(shots)
    .where(eq(shots.userId, session.user.id));

  return NextResponse.json({
    total: row?.total ?? 0,
    limit: hasUnlimitedShots ? null : config.shotViewLimit,
  });
}
