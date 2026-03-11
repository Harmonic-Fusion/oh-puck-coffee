import { db } from "@/db";
import { origins, roasters } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createOriginId, createRoasterId } from "@/lib/nanoid-ids";

/**
 * Resolve an origin name to an origin id. If the name exists, returns its id;
 * otherwise creates a new origin row and returns the new id.
 * Returns null if name is missing or blank.
 */
export async function resolveOriginId(
  name: string | undefined | null,
): Promise<string | null> {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return null;

  const [existing] = await db
    .select({ id: origins.id })
    .from(origins)
    .where(eq(origins.name, trimmed))
    .limit(1);

  if (existing) return existing.id;

  const id = createOriginId();
  await db.insert(origins).values({ id, name: trimmed });
  return id;
}

/**
 * Resolve a roaster name to a roaster id. If the name exists, returns its id;
 * otherwise creates a new roaster row and returns the new id.
 * Returns null if name is missing or blank.
 */
export async function resolveRoasterId(
  name: string | undefined | null,
): Promise<string | null> {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return null;

  const [existing] = await db
    .select({ id: roasters.id })
    .from(roasters)
    .where(eq(roasters.name, trimmed))
    .limit(1);

  if (existing) return existing.id;

  const id = createRoasterId();
  await db.insert(roasters).values({ id, name: trimmed });
  return id;
}
