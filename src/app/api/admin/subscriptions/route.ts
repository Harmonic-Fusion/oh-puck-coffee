import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { desc, count, ilike, and, eq, SQL } from "drizzle-orm";

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

  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        userName: users.name,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeProductId: subscriptions.stripeProductId,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(whereClause),
  ]);

  return NextResponse.json({ data, total, limit, offset });
}
