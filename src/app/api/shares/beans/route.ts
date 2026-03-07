import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, beansShare, userBeans } from "@/db/schema";
import { and, desc, eq, ilike, isNotNull, or, inArray } from "drizzle-orm";

type BeanRow = {
  id: string;
  name: string;
  origin: string | null;
  roaster: string | null;
  originDetails: string | null;
  processingMethod: string | null;
  roastLevel: string;
  roastDate: Date | null;
  isRoastDateBestGuess: boolean;
  shareSlug: string | null;
  createdAt: Date;
};

/**
 * GET /api/shares/beans — List beans the user can add: public beans and (when authenticated) beans shared with the user.
 * Query params: search (optional), limit (default 20).
 * When authenticated, response includes inCollection: boolean per bean.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10), 1),
    50,
  );

  const searchPattern = search ? `%${search}%` : null;
  const searchCondition = searchPattern
    ? or(
        ilike(beans.name, searchPattern),
        ilike(beans.origin, searchPattern),
        ilike(beans.roaster, searchPattern),
      )
    : undefined;

  // 1) Public beans (general_access = 'public', has share_slug)
  const publicConditions = [
    eq(beans.generalAccess, "public"),
    isNotNull(beans.shareSlug),
  ];
  if (searchCondition) publicConditions.push(searchCondition);

  const publicResults = await db
    .select({
      id: beans.id,
      name: beans.name,
      origin: beans.origin,
      roaster: beans.roaster,
      originDetails: beans.originDetails,
      processingMethod: beans.processingMethod,
      roastLevel: beans.roastLevel,
      roastDate: beans.roastDate,
      isRoastDateBestGuess: beans.isRoastDateBestGuess,
      shareSlug: beans.shareSlug,
      createdAt: beans.createdAt,
    })
    .from(beans)
    .where(and(...publicConditions))
    .orderBy(desc(beans.createdAt))
    .limit(limit);

  const beanMap = new Map<string, BeanRow>();
  for (const r of publicResults) {
    beanMap.set(r.id, r);
  }

  // 2) When authenticated, add beans shared with the user (accepted only; pending need to be accepted first)
  if (session?.user?.id) {
    const sharedRows = await db
      .select({ beanId: beansShare.beanId })
      .from(beansShare)
      .where(
        and(
          eq(beansShare.userId, session.user.id),
          eq(beansShare.status, "accepted"),
        ),
      );

    const sharedIds = sharedRows.map((r) => r.beanId).filter((id) => !beanMap.has(id));

    if (sharedIds.length > 0) {
      const sharedConditions = [inArray(beans.id, sharedIds)];
      if (searchCondition) sharedConditions.push(searchCondition);
      const sharedBeans = await db
        .select({
          id: beans.id,
          name: beans.name,
          origin: beans.origin,
          roaster: beans.roaster,
          originDetails: beans.originDetails,
          processingMethod: beans.processingMethod,
          roastLevel: beans.roastLevel,
          roastDate: beans.roastDate,
          isRoastDateBestGuess: beans.isRoastDateBestGuess,
          shareSlug: beans.shareSlug,
          createdAt: beans.createdAt,
        })
        .from(beans)
        .where(and(...sharedConditions));

      for (const r of sharedBeans) {
        if (!beanMap.has(r.id)) beanMap.set(r.id, r);
      }
    }
  }

  const combined = Array.from(beanMap.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const limited = combined.slice(0, limit);

  // 3) When authenticated, add inCollection for each bean
  if (session?.user?.id && limited.length > 0) {
    const ids = limited.map((b) => b.id);
    const inCollectionRows = await db
      .select({ beanId: userBeans.beanId })
      .from(userBeans)
      .where(
        and(
          eq(userBeans.userId, session.user.id),
          inArray(userBeans.beanId, ids),
        ),
      );
    const inCollectionSet = new Set(
      inCollectionRows.map((r) => r.beanId),
    );

    return NextResponse.json(
      limited.map((b) => ({
        ...b,
        inCollection: inCollectionSet.has(b.id),
      })),
    );
  }

  return NextResponse.json(
    limited.map((b) => ({ ...b, inCollection: false })),
  );
}
