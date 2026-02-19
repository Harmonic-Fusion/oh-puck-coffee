import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { grinders, machines, tools } from "../src/db/schema";
import { readEnvDatabaseUrl } from "../src/lib/dot-env";

const client = postgres(readEnvDatabaseUrl());
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

const DEFAULT_TOOLS = [
  {
    slug: "wdt",
    name: "WDT",
    description: "Weiss Distribution Technique — breaks up clumps in the puck with fine needles",
  },
  {
    slug: "puck-screen",
    name: "Puck Screen",
    description: "Metal screen placed on top of the puck to improve water distribution",
  },
  {
    slug: "rdt",
    name: "RDT",
    description: "Ross Droplet Technique — a spritz of water on beans to reduce static",
  },
  {
    slug: "dosing-cup",
    name: "Dosing Cup",
    description: "Dedicated cup for weighing and transferring coffee grounds",
  },
  {
    slug: "distribution-tool",
    name: "Wedge Distribution",
    description: "Leveling tool spun on top of grounds for even distribution",
  },
  {
    slug: "paper-filter",
    name: "Paper Filter",
    description: "Filter paper placed above or below the puck for clarity",
  },
  {
    slug: "leveler",
    name: "Leveler",
    description: "Calibrated flat tool for leveling the coffee bed",
  },
] as const;

async function seed() {
  console.log("Seeding default equipment...\n");

  // --- Grinders ---
  const existingGrinders = await db.select({ name: grinders.name }).from(grinders);
  const existingGrinderNames = new Set(existingGrinders.map((g) => g.name));
  const newGrinders = DEFAULT_GRINDERS.filter((name) => !existingGrinderNames.has(name));

  if (newGrinders.length > 0) {
    for (const name of newGrinders) {
      await db.insert(grinders).values({ name }).onConflictDoNothing({ target: grinders.name });
    }
    console.log(`  ✓ Inserted ${newGrinders.length} new grinder(s)`);
  }
  if (DEFAULT_GRINDERS.length - newGrinders.length > 0) {
    console.log(`  · Skipped ${DEFAULT_GRINDERS.length - newGrinders.length} existing grinder(s)`);
  }

  // --- Machines ---
  const existingMachines = await db.select({ name: machines.name }).from(machines);
  const existingMachineNames = new Set(existingMachines.map((m) => m.name));
  const newMachines = DEFAULT_MACHINES.filter((name) => !existingMachineNames.has(name));

  if (newMachines.length > 0) {
    for (const name of newMachines) {
      await db.insert(machines).values({ name }).onConflictDoNothing({ target: machines.name });
    }
    console.log(`  ✓ Inserted ${newMachines.length} new machine(s)`);
  }
  if (DEFAULT_MACHINES.length - newMachines.length > 0) {
    console.log(`  · Skipped ${DEFAULT_MACHINES.length - newMachines.length} existing machine(s)`);
  }

  // --- Tools ---
  const existingTools = await db.select({ slug: tools.slug }).from(tools);
  const existingToolSlugs = new Set(existingTools.map((t) => t.slug));
  const newTools = DEFAULT_TOOLS.filter((tool) => !existingToolSlugs.has(tool.slug));

  if (newTools.length > 0) {
    for (const tool of newTools) {
      await db
        .insert(tools)
        .values({ slug: tool.slug, name: tool.name, description: tool.description })
        .onConflictDoNothing({ target: tools.slug });
    }
    console.log(`  ✓ Inserted ${newTools.length} new tool(s)`);
  }
  if (DEFAULT_TOOLS.length - newTools.length > 0) {
    console.log(`  · Skipped ${DEFAULT_TOOLS.length - newTools.length} existing tool(s)`);
  }

  console.log("\nSeed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
