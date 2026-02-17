import { readFileSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { grinders, machines, tools } from "./schema";
import { DEFAULT_TOOLS } from "@/shared/equipment/constants";

// Load .env.local / .env — tsx doesn't auto-load like Next.js
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file not found, skip
  }
}

const CONFIG = {
  DATABASE_URL: process.env.DATABASE_URL,
};

if (!CONFIG.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(CONFIG.DATABASE_URL);
const db = drizzle(client);

const DEFAULT_GRINDERS = [
  "Niche Zero",
  "Eureka Mignon Specialita",
  "Baratza Sette 270",
  "Comandante C40",
  "1Zpresso JX-Pro",
  "DF64",
  "Mazzer Mini",
  "Breville Smart Grinder Pro",
];

const DEFAULT_MACHINES = [
  "Breville Barista Express",
  "La Marzocco Linea Mini",
  "Gaggia Classic Pro",
  "Decent DE1",
  "Rancilio Silvia",
  "Breville Bambino Plus",
  "Profitec Pro 600",
  "Lelit Bianca",
  "Flair 58",
  "Cafelat Robot",
];

async function seed() {
  console.log("Seeding default equipment...");

  for (const name of DEFAULT_GRINDERS) {
    await db
      .insert(grinders)
      .values({ name })
      .onConflictDoNothing({ target: grinders.name });
  }
  console.log(`  ✓ ${DEFAULT_GRINDERS.length} grinders`);

  for (const name of DEFAULT_MACHINES) {
    await db
      .insert(machines)
      .values({ name })
      .onConflictDoNothing({ target: machines.name });
  }
  console.log(`  ✓ ${DEFAULT_MACHINES.length} machines`);

  for (const tool of DEFAULT_TOOLS) {
    await db
      .insert(tools)
      .values({
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
      })
      .onConflictDoNothing({ target: tools.slug });
  }
  console.log(`  ✓ ${DEFAULT_TOOLS.length} tools`);

  // Clean up: delete "Tamper" tool if it exists
  await db.delete(tools).where(eq(tools.slug, "tamper"));
  console.log("  ✓ Removed tamper tool (if existed)");

  // Clean up: rename "Distribution Tool" → "Wedge Distribution"
  await db
    .update(tools)
    .set({ name: "Wedge Distribution" })
    .where(eq(tools.slug, "distribution-tool"));
  console.log('  ✓ Renamed "Distribution Tool" → "Wedge Distribution"');

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
