import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";

const updateNameSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(100),
});

/**
 * GET /api/users/me — return the current user's profile + linked account info
 */
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      isCustomName: users.isCustomName,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Fetch linked OAuth accounts (provider name only — no tokens)
  const linkedAccounts = await db
    .select({
      provider: accounts.provider,
      type: accounts.type,
    })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return NextResponse.json({
    ...user,
    linkedAccounts,
  });
}

/**
 * PATCH /api/users/me — update the current user's display name.
 * Sets isCustomName = true so Google sign-in won't overwrite it.
 * Send { name: "" } or { name: null } to reset back to Google-provided name.
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body: unknown = await request.json();

  // Allow resetting to Google name by sending empty/null name
  const resetSchema = z.object({ name: z.literal("").or(z.null()) });
  const resetResult = resetSchema.safeParse(body);

  if (resetResult.success) {
    // Reset: clear custom flag — next Google login will set the name
    await db
      .update(users)
      .set({ isCustomName: false })
      .where(eq(users.id, session.user.id));

    const [updated] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        isCustomName: users.isCustomName,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    return NextResponse.json(updated);
  }

  // Normal update with a non-empty name
  const parsed = updateNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await db
    .update(users)
    .set({ name: parsed.data.name, isCustomName: true })
    .where(eq(users.id, session.user.id));

  const [updated] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      isCustomName: users.isCustomName,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json(updated);
}
