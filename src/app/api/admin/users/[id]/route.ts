import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { users, shots, subscriptions, userEntitlements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import * as z from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  // Fetch user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch subscription and entitlements in parallel with shots
  const [userShots, [subscription], entitlementRows] = await Promise.all([
    db
      .select({
        id: shots.id,
        rating: shots.rating,
        shotQuality: shots.shotQuality,
        createdAt: shots.createdAt,
      })
      .from(shots)
      .where(eq(shots.userId, id))
      .orderBy(desc(shots.createdAt)),
    db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1),
    db
      .select({ lookupKey: userEntitlements.lookupKey })
      .from(userEntitlements)
      .where(eq(userEntitlements.userId, id)),
  ]);

  const shotCount = userShots.length;
  const lastShot = userShots.length > 0 ? userShots[0].createdAt : null;

  // Average rating & quality
  const ratedShots = userShots.filter((s) => s.rating != null);
  const avgRating = ratedShots.length > 0
    ? parseFloat(
        (ratedShots.reduce((acc, s) => acc + parseFloat(s.rating ?? "0"), 0) / ratedShots.length).toFixed(1)
      )
    : null;

  const qualityShots = userShots.filter((s) => s.shotQuality != null);
  const avgQuality = qualityShots.length > 0
    ? parseFloat(
        (qualityShots.reduce((acc, s) => acc + parseFloat(s.shotQuality ?? "0"), 0) / qualityShots.length).toFixed(1)
      )
    : null;

  // Shots over time (daily counts, last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const shotsOverTime: Record<string, number> = {};
  for (const shot of userShots) {
    const d = new Date(shot.createdAt);
    if (d >= ninetyDaysAgo) {
      const dateStr = d.toISOString().slice(0, 10);
      shotsOverTime[dateStr] = (shotsOverTime[dateStr] ?? 0) + 1;
    }
  }

  // Fill in missing dates
  const shotsPerDay: { date: string; shots: number }[] = [];
  const cursor = new Date(ninetyDaysAgo);
  const today = new Date();
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    shotsPerDay.push({ date: dateStr, shots: shotsOverTime[dateStr] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Day of week distribution
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const shot of userShots) {
    const day = new Date(shot.createdAt).getDay();
    dayOfWeekCounts[day]++;
  }
  const dayOfWeek = dayNames.map((name, i) => ({
    day: name,
    shots: dayOfWeekCounts[i],
  }));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      emailVerified: user.emailVerified,
      isCustomName: user.isCustomName,
    },
    subscription: subscription
      ? {
          status: subscription.status,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeProductId: subscription.stripeProductId,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt,
        }
      : null,
    entitlements: entitlementRows.map((r) => r.lookupKey),
    shotCount,
    lastShot,
    avgRating,
    avgQuality,
    shotsPerDay,
    dayOfWeek,
  });
}

const updateUserSchema = z.object({
  role: z.enum(["member", "admin", "super-admin"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const [user] = await db
    .update(users)
    .set({ role: parsed.data.role })
    .where(eq(users.id, id))
    .returning();

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}
