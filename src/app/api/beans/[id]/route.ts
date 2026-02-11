import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { db } from "@/db";
import { beans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateMemberAccess } from "@/lib/api-auth";
import { createBeanSchema } from "@/shared/beans/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [bean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, id))
    .limit(1);

  if (!bean) {
    return NextResponse.json({ error: "Bean not found" }, { status: 404 });
  }

  // Check if member can access this bean
  const accessError = validateMemberAccess(
    session.user.id,
    bean.createdBy,
    session.user.role
  );
  if (accessError) return accessError;

  return NextResponse.json(bean);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [existingBean] = await db
    .select()
    .from(beans)
    .where(eq(beans.id, id))
    .limit(1);

  if (!existingBean) {
    return NextResponse.json({ error: "Bean not found" }, { status: 404 });
  }

  // Check if member can access this bean
  const accessError = validateMemberAccess(
    session.user.id,
    existingBean.createdBy,
    session.user.role
  );
  if (accessError) return accessError;

  const body = await request.json();
  const parsed = createBeanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [updatedBean] = await db
    .update(beans)
    .set(parsed.data)
    .where(eq(beans.id, id))
    .returning();

  return NextResponse.json(updatedBean);
}
