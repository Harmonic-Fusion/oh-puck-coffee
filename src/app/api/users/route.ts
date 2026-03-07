import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search")?.trim();

  // Share dialog user picker: search by name or email, return id/name/image only, limit 10
  if (search && search.length > 0) {
    const term = `%${search}%`;
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .where(
        or(
          ilike(users.name, term),
          ilike(users.email, term),
        ),
      )
      .limit(10);
    return NextResponse.json(results);
  }

  // Admins can see all users, members can only see themselves
  if (session.user.role === "admin" || session.user.role === "super-admin") {
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
