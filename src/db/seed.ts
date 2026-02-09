import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { grinders, machines } from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
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

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
