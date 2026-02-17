import { NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { tools } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await db
    .select()
    .from(tools)
    .orderBy(asc(tools.name));
  return NextResponse.json(results);
}
