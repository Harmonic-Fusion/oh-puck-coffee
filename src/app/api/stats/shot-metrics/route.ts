import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const shotId = searchParams.get("shotId");

  if (!shotId) {
    return NextResponse.json({ error: "shotId is required" }, { status: 400 });
  }

  // Get the shot to compute yield accuracy
  const [shot] = await db
    .select({
      userId: shots.userId,
      yieldGrams: shots.yieldGrams,
      yieldActualGrams: shots.yieldActualGrams,
      rating: shots.rating,
    })
    .from(shots)
    .where(eq(shots.id, shotId))
    .limit(1);

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  // Check if member can access this shot
  if (session.user.role !== "admin" && shot.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Compute yield accuracy
  let yieldAccuracyPct: number | null = null;
  if (shot.yieldGrams && shot.yieldActualGrams) {
    const yieldTarget = parseFloat(shot.yieldGrams);
    const yieldActual = parseFloat(shot.yieldActualGrams);
    if (yieldTarget > 0) {
      yieldAccuracyPct = (100 * Math.abs(yieldActual - yieldTarget)) / yieldTarget;
    }
  }

  // Get rating distribution: histogram of all user's non-hidden shots grouped by Math.floor(rating)
  const whereConditions = [
    eq(shots.userId, shot.userId),
    eq(shots.isHidden, false),
  ];
  if (session.user.role !== "admin") {
    // Already filtered by userId above, but keep for consistency
  }

  const allUserShots = await db
    .select({
      rating: shots.rating,
    })
    .from(shots)
    .where(and(...whereConditions));

  // Build histogram: group by Math.floor(rating)
  const ratingDistribution: { rating: number; count: number }[] = [];
  const histogram = new Map<number, number>();

  for (const s of allUserShots) {
    if (s.rating != null) {
      const rating = parseFloat(s.rating);
      const bucket = Math.floor(rating);
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }
  }

  // Convert to array and sort by rating
  for (let i = 1; i <= 5; i++) {
    ratingDistribution.push({
      rating: i,
      count: histogram.get(i) || 0,
    });
  }

  // Get current shot rating
  const currentShotRating = shot.rating ? parseFloat(shot.rating) : null;

  return NextResponse.json({
    yieldAccuracyPct,
    ratingDistribution,
    currentShotRating,
  });
}
