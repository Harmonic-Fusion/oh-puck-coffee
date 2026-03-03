import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  return NextResponse.json({ entitlements: session!.user.entitlements ?? [] });
}
