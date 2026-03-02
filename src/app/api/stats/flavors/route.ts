import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { shots } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const beanId = searchParams.get("beanId");

  // Build where conditions
  const conditions = [eq(shots.isHidden, false)];
  if (session.user.role !== "admin" && session.user.role !== "super-admin") {
    conditions.push(eq(shots.userId, session.user.id));
  }
  if (beanId) {
    conditions.push(eq(shots.beanId, beanId));
  }

  // Fetch all non-hidden shots with flavors and ratings
  const shotRows = await db
    .select({
      id: shots.id,
      flavors: shots.flavors,
      rating: shots.rating,
    })
    .from(shots)
    .where(and(...conditions));

  // Aggregate flavors with their average rating
  const flavorStats: Record<string, { totalRating: number; count: number }> = {};

  for (const shot of shotRows) {
    if (!shot.flavors || !Array.isArray(shot.flavors)) continue;
    
    const rating = shot.rating ? parseFloat(shot.rating) : null;
    if (rating === null) continue; // Only count shots with ratings

    for (const flavor of shot.flavors) {
      if (!flavorStats[flavor]) {
        flavorStats[flavor] = { totalRating: 0, count: 0 };
      }
      flavorStats[flavor].totalRating += rating;
      flavorStats[flavor].count += 1;
    }
  }

  // Convert to array and calculate average rating
  const result = Object.entries(flavorStats)
    .map(([flavor, { totalRating, count }]) => ({
      flavor,
      avgRating: parseFloat((totalRating / count).toFixed(1)),
      count,
    }))
    .filter((d) => d.count >= 1)
    .sort((a, b) => b.avgRating - a.avgRating); // Order by average rating descending

  return NextResponse.json({ flavors: result });
}
