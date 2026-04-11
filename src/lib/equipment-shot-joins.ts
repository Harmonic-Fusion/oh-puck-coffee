import { aliasedTable } from "drizzle-orm";
import { equipment } from "@/db/schema";

/** Aliased `equipment` rows for joining grinder and machine names on shots in one query. */
export const grinderEquipment = aliasedTable(equipment, "grinder_equipment");
export const machineEquipment = aliasedTable(equipment, "machine_equipment");
