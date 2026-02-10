import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  // Admins can see all users, members can only see themselves
  if (session.user.role === "admin") {
    const allUsers = await db.select().from(users);
    return NextResponse.json(allUsers);
  }

  // Members only see themselves
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json(user ? [user] : []);
}
