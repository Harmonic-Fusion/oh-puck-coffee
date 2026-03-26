import type { ShotWithJoins } from "@/components/shots/hooks";
import type { FlavorStat } from "@/components/stats/hooks";
import { FLAVOR_WHEEL_DATA } from "@/shared/flavor-wheel";
import type { FlavorNode } from "@/shared/flavor-wheel/types";

// ── Flavor depth cache ────────────────────────────────────────────────

function buildFlavorDepthCache(): Map<string, number> {
  const cache = new Map<string, number>();

  function traverse(node: FlavorNode, depth: number): void {
    cache.set(node.name, depth);
    if (node.children) {
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    }
  }

  for (const category of FLAVOR_WHEEL_DATA.children) {
    traverse(category, 1);
  }

  return cache;
}

/**
 * Cached map of flavor name → wheel depth (1 = category, 2 = subcategory, 3 = leaf).
 * Initialized once at module load time.
 */
export const FLAVOR_DEPTH_CACHE: ReadonlyMap<string, number> =
  buildFlavorDepthCache();

/**
 * Aggregates flavor statistics from a list of shots.
 *
 * Semantics match `GET /api/stats/flavors` and `FlavorRatingsChart`:
 * - Only shots where `rating` is non-null are counted.
 * - `shot.rating` is used exclusively (not the legacy `shotQuality` fallback).
 *
 * @returns Sorted descending by avgRating.
 */
export function aggregateFlavorStatsFromShots(
  shots: ShotWithJoins[],
): FlavorStat[] {
  const flavorStats: Record<string, { totalRating: number; count: number }> =
    {};

  for (const shot of shots) {
    if (!shot.flavors || !Array.isArray(shot.flavors)) continue;

    const rating = Number(shot.rating);
    if (!shot.rating || isNaN(rating) || rating <= 0) continue;

    for (const flavor of shot.flavors) {
      if (!flavorStats[flavor]) {
        flavorStats[flavor] = { totalRating: 0, count: 0 };
      }
      flavorStats[flavor].totalRating += rating;
      flavorStats[flavor].count += 1;
    }
  }

  return Object.entries(flavorStats)
    .map(([flavor, { totalRating, count }]) => ({
      flavor,
      avgRating: parseFloat((totalRating / count).toFixed(1)),
      count,
    }))
    .filter((d) => d.count >= 1)
    .sort((a, b) => b.avgRating - a.avgRating);
}
