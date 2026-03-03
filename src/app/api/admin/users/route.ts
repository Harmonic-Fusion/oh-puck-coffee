import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { users, subscriptions, userEntitlements } from "@/db/schema";
import { desc, count, ilike, and, eq, inArray, SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { session, error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || "";

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(ilike(users.email, `%${search}%`));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        isCustomName: users.isCustomName,
        subscriptionStatus: subscriptions.status,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      })
      .from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(whereClause)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(whereClause),
  ]);

  // Fetch entitlements for the returned users
  const userIds = rows.map((r) => r.id);
  const entitlementRows =
    userIds.length > 0
      ? await db
          .select({
            userId: userEntitlements.userId,
            lookupKey: userEntitlements.lookupKey,
          })
          .from(userEntitlements)
          .where(inArray(userEntitlements.userId, userIds))
      : [];

  const entitlementsByUser = new Map<string, string[]>();
  for (const row of entitlementRows) {
    const list = entitlementsByUser.get(row.userId) ?? [];
    list.push(row.lookupKey);
    entitlementsByUser.set(row.userId, list);
  }

  const data = rows.map((row) => ({
    ...row,
    entitlements: entitlementsByUser.get(row.id) ?? [],
  }));

  return NextResponse.json({ data, total, limit, offset });
}
