import { NextResponse } from "next/server";
import { db } from "@/db";
import { beans, beansShare } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

type BeanRow = typeof beans.$inferSelect;
type BeanShareRow = typeof beansShare.$inferSelect;

export type CanAccessBeanResult =
  | { allowed: true; bean: BeanRow; userBean: BeanShareRow | null }
  | { allowed: false; error: NextResponse };

function logBeanAccess(
  beanId: string,
  userId: string | null,
  context: Record<string, unknown>,
) {
  console.error("[canAccessBean]", { beanId, userId, ...context });
}

/**
 * Checks if a user (or unauthenticated visitor) can access a bean.
 * Uses only beans_share: ownership = status 'owner', membership = status 'accepted' or 'self' with unshared_at null.
 * Flow: admin → owner/member via beans_share → general_access anyone_with_link (auth) → general_access public → deny.
 * Returns { allowed, bean, userBean? } when allowed (userBean = user's beans_share row if any), or { allowed: false, error } when denied.
 */
export async function canAccessBean(
  userId: string | null,
  beanId: string,
  userRole?: "member" | "admin" | "super-admin",
): Promise<CanAccessBeanResult> {
  logBeanAccess(beanId, userId, { userRole, step: "start" });

  const [bean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, beanId))
    .limit(1);

  if (!bean) {
    logBeanAccess(beanId, userId, { step: "bean_not_found" });
    return {
      allowed: false,
      error: NextResponse.json({ error: "Bean not found" }, { status: 404 }),
    };
  }

  const forbidden = (): CanAccessBeanResult => ({
    allowed: false,
    error: NextResponse.json(
      { error: "Forbidden", code: "bean_access_denied" },
      { status: 403 },
    ),
  });

  async function getUserShare(): Promise<BeanShareRow | null> {
    if (!userId) return null;
    const [share] = await db
      .select()
      .from(beansShare)
      .where(
        and(eq(beansShare.beanId, beanId), eq(beansShare.userId, userId)),
      )
      .limit(1);
    return share ?? null;
  }

  // 1. Admin/super-admin can access any bean
  if (userId && (userRole === "admin" || userRole === "super-admin")) {
    const userBean = await getUserShare();
    logBeanAccess(beanId, userId, { step: "allowed_admin", userBean: !!userBean });
    return { allowed: true, bean, userBean };
  }

  // 2. User has a beans_share row: owner, or accepted/self with unshared_at null, or unfollowed (read-only unshared view)
  if (userId) {
    const share = await getUserShare();
    if (share) {
      logBeanAccess(beanId, userId, {
        step: "share_found",
        status: share.status,
        unsharedAt: share.unsharedAt ?? null,
      });
      if (share.status === "owner") {
        logBeanAccess(beanId, userId, { step: "allowed_owner" });
        return { allowed: true, bean, userBean: share };
      }
      if (
        (share.status === "accepted" || share.status === "self") &&
        share.unsharedAt === null
      ) {
        logBeanAccess(beanId, userId, { step: "allowed_member" });
        return { allowed: true, bean, userBean: share };
      }
      if (share.status === "unfollowed") {
        logBeanAccess(beanId, userId, { step: "allowed_unfollowed" });
        return { allowed: true, bean, userBean: share };
      }
      // Pending or unshared member: no access via share; fall through to general_access
    } else {
      logBeanAccess(beanId, userId, { step: "no_share_row" });
    }
  }

  // 3. Anyone with the link (authenticated only)
  if (bean.generalAccess === "anyone_with_link" && userId) {
    const userBean = await getUserShare();
    logBeanAccess(beanId, userId, { step: "allowed_anyone_with_link", userBean: !!userBean });
    return { allowed: true, bean, userBean };
  }

  // 4. Public — anyone including unauthenticated
  if (bean.generalAccess === "public") {
    const userBean = userId ? await getUserShare() : null;
    logBeanAccess(beanId, userId, { step: "allowed_public", userBean: !!userBean });
    return { allowed: true, bean, userBean };
  }

  logBeanAccess(beanId, userId, {
    step: "forbidden",
    generalAccess: bean.generalAccess,
    hasUserId: !!userId,
  });
  return forbidden();
}

/**
 * Returns true if the current user is the bean owner (has beans_share row with status 'owner').
 * Use after canAccessBean when you need to distinguish owner from other allowed users.
 */
export function isBeanOwner(result: CanAccessBeanResult): boolean {
  if (!result.allowed || !result.userBean) return false;
  return result.userBean.status === "owner";
}

/**
 * Recursive unsharing: when a member is unshared, set unshared_at and reshare_allowed=false
 * on that row and on all descendants (members they invited) for the same bean.
 */
export async function unshareMemberAndDescendants(
  beanId: string,
  shareId: string,
): Promise<void> {
  const [share] = await db
    .select()
    .from(beansShare)
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    )
    .limit(1);

  if (!share || share.unsharedAt !== null) return;

  const now = new Date();

  await db
    .update(beansShare)
    .set({ unsharedAt: now, reshareAllowed: false, updatedAt: now })
    .where(
      and(eq(beansShare.id, shareId), eq(beansShare.beanId, beanId)),
    );

  const descendants = await db
    .select()
    .from(beansShare)
    .where(
      and(
        eq(beansShare.beanId, beanId),
        eq(beansShare.invitedBy, share.userId),
        isNull(beansShare.unsharedAt),
      ),
    );

  for (const desc of descendants) {
    await unshareMemberAndDescendants(beanId, desc.id);
  }
}

/**
 * When general_access is downgraded to 'restricted', unshare all members with status 'self'
 * (they were granted access via the previous more permissive general_access).
 */
export async function unshareSelfMembersOnRestricted(beanId: string): Promise<void> {
  const now = new Date();
  await db
    .update(beansShare)
    .set({ unsharedAt: now, updatedAt: now })
    .where(
      and(
        eq(beansShare.beanId, beanId),
        eq(beansShare.status, "self"),
        isNull(beansShare.unsharedAt),
      ),
    );
}
