import { NextResponse } from "next/server";
import { getSession } from "@/auth";

/**
 * Checks if the current user is an admin.
 * Returns the session if admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.role !== "admin") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
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
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { session, error: null };
}

/**
 * Checks if the current user can access data for a specific userId.
 * Admins can access any user's data, members can only access their own.
 */
export function canAccessUserData(sessionUserId: string, targetUserId: string, userRole?: "member" | "admin"): boolean {
  if (userRole === "admin") {
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
  userRole?: "member" | "admin"
): NextResponse | null {
  if (!canAccessUserData(sessionUserId, targetUserId, userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
