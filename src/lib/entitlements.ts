import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { hasEntitlement, type EntitlementKey } from "@/shared/entitlements";

export { Entitlements, type EntitlementKey, hasEntitlement } from "@/shared/entitlements";

/**
 * Checks if the current user is authenticated and has the given entitlement.
 * Follows the requireAuth / requireAdmin pattern from api-auth.ts.
 */
export async function requireEntitlement(key: EntitlementKey) {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  if (!hasEntitlement(session!.user.entitlements, key)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}
