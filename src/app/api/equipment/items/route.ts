import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/auth";
import {
  equipmentListItemFields,
  parseEquipmentListScope,
  specsFromDb,
} from "@/lib/equipment-list";
import {
  listExtraGearAllByName,
  listExtraGearMineByName,
} from "@/lib/user-gear-extra-queries";
import { userGearExtraTypeSchema } from "@/shared/equipment/schema";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeRaw = searchParams.get("type");
  const parsedType = userGearExtraTypeSchema.safeParse(typeRaw);
  if (!parsedType.success) {
    return NextResponse.json(
      { error: "Invalid or missing type (kettle, scale, pour_over, french_press, moka_pot, cold_brew)" },
      { status: 400 },
    );
  }
  const equipmentType = parsedType.data;

  const scope = parseEquipmentListScope(searchParams);
  if (scope === "invalid") {
    return NextResponse.json(
      { error: "Invalid scope (use mine or all)" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const rows =
    scope === "mine"
      ? await listExtraGearMineByName(equipmentType, userId)
      : await listExtraGearAllByName(equipmentType, userId);

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      isGlobal: r.isGlobal,
      ...equipmentListItemFields(
        r.brand,
        r.imageId,
        r.thumbnailBuf,
        specsFromDb(r.specs),
      ),
    })),
  );
}
