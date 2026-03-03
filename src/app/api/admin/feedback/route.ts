import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { feedback, users } from "@/db/schema";
import { desc, count, ilike, and, eq, gte, lte, SQL } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const search = searchParams.get("search") || "";
  const typeFilter = searchParams.get("type") || "";
  const statusFilter = searchParams.get("status") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const conditions: SQL[] = [];
  if (search) {
    conditions.push(ilike(feedback.subject, `%${search}%`));
  }
  if (typeFilter) {
    conditions.push(eq(feedback.type, typeFilter as "bug" | "feature" | "other"));
  }
  if (statusFilter) {
    conditions.push(
      eq(
        feedback.status,
        statusFilter as "new" | "reviewed" | "in_progress" | "complete" | "wont_implement"
      )
    );
  }
  if (dateFrom) {
    conditions.push(gte(feedback.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(feedback.createdAt, to));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: feedback.id,
        userId: feedback.userId,
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        status: feedback.status,
        priority: feedback.priority,
        createdAt: feedback.createdAt,
        userEmail: users.email,
        userName: users.name,
      })
      .from(feedback)
      .leftJoin(users, eq(feedback.userId, users.id))
      .where(whereClause)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(feedback).where(whereClause),
  ]);

  return NextResponse.json({ data: rows, total, limit, offset });
}
