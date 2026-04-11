import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import { applyUserEquipmentPatchJson } from "@/lib/user-equipment-patch";

const MACHINE = "machine" as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const { id: machineId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  return applyUserEquipmentPatchJson(machineId, MACHINE, session, body);
}
