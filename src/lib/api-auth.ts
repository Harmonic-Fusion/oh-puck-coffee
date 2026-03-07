import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans, userBeans, beansShare } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Checks if the current user is a super admin.
 * Returns the session if super admin, null otherwise.
 */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (session.user.role !== "super-admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Checks if the current user is an admin or super-admin.
 * Returns the session if admin/super-admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (session.user.role !== "admin" && session.user.role !== "super-admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Checks if the current user is authenticated.
 * Returns the session if authenticated, null otherwise.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}

/**
 * Checks if the current user can access data for a specific userId.
 * Admins/Super-admins can access any user's data, members can only access their own.
 */
export function canAccessUserData(
  sessionUserId: string,
  targetUserId: string,
  userRole?: "member" | "admin" | "super-admin",
): boolean {
  if (userRole === "admin" || userRole === "super-admin") {
    return true;
  }
  return sessionUserId === targetUserId;
}

/**
 * Validates that a member can only access their own data.
 * Returns an error response if access is denied, null if allowed.
 */
export function validateMemberAccess(
  sessionUserId: string,
  targetUserId: string,
  userRole?: "member" | "admin" | "super-admin",
): NextResponse | null {
  if (!canAccessUserData(sessionUserId, targetUserId, userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

type BeanRow = typeof beans.$inferSelect;
type UserBeanRow = typeof userBeans.$inferSelect;

export type CanAccessBeanResult =
  | { allowed: true; bean: BeanRow; userBean: UserBeanRow | null }
  | { allowed: false; error: NextResponse };

/**
 * Checks if a user (or unauthenticated visitor) can access a bean.
 * Implements: admin → creator → user_beans → beans_share (auto-create user_beans) → general_access link → general_access public → deny.
 * Returns { allowed, bean, userBean? } when allowed, or { allowed: false, error } when denied.
 */
export async function canAccessBean(
  userId: string | null,
  beanId: string,
  userRole?: "member" | "admin" | "super-admin",
): Promise<CanAccessBeanResult> {
  const [bean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, beanId))
    .limit(1);

  if (!bean) {
    return {
      allowed: false,
      error: NextResponse.json({ error: "Bean not found" }, { status: 404 }),
    };
  }

  const forbidden = (): CanAccessBeanResult => ({
    allowed: false,
    error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  });

  async function getUserBean(): Promise<UserBeanRow | null> {
    if (!userId) return null;
    const [ub] = await db
      .select()
      .from(userBeans)
      .where(
        and(eq(userBeans.beanId, beanId), eq(userBeans.userId, userId)),
      )
      .limit(1);
    return ub ?? null;
  }

  // 1. Admin/super-admin can access any bean
  if (userId && (userRole === "admin" || userRole === "super-admin")) {
    const userBean = await getUserBean();
    return { allowed: true, bean, userBean };
  }

  // 2. Creator can access
  if (userId && bean.createdBy === userId) {
    const userBean = await getUserBean();
    return { allowed: true, bean, userBean };
  }

  // 3. User has a user_beans row (has bean in collection)
  if (userId) {
    const [ub] = await db
      .select()
      .from(userBeans)
      .where(
        and(eq(userBeans.beanId, beanId), eq(userBeans.userId, userId)),
      )
      .limit(1);
    if (ub) return { allowed: true, bean, userBean: ub };
  }

  // 4. User is an accepted member in beans_share — allow and auto-create user_beans if missing
  if (userId) {
    const [share] = await db
      .select()
      .from(beansShare)
      .where(
        and(
          eq(beansShare.beanId, beanId),
          eq(beansShare.userId, userId),
          eq(beansShare.status, "accepted"),
        ),
      )
      .limit(1);
    if (share) {
      let userBean = await getUserBean();
      if (!userBean) {
        const [inserted] = await db
          .insert(userBeans)
          .values({
            beanId,
            userId,
            openBagDate: null,
          })
          .returning();
        userBean = inserted ?? null;
      }
      return { allowed: true, bean, userBean };
    }
  }

  // 5. Anyone with the link (authenticated only)
  if (bean.generalAccess === "anyone_with_link" && userId) {
    const userBean = await getUserBean();
    return { allowed: true, bean, userBean };
  }

  // 6. Public — anyone including unauthenticated
  if (bean.generalAccess === "public") {
    const userBean = userId ? await getUserBean() : null;
    return { allowed: true, bean, userBean };
  }

  return forbidden();
}
