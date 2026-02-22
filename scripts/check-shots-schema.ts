import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

function loadEnv(): void {
  config({ path: ".env" });
  config({ path: ".env.local", override: false });
}

function getDatabaseUrl(): string {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL environment variable is required but not set");
  }
  return databaseUrl;
}

const client = postgres(getDatabaseUrl());
const db = drizzle(client);

async function checkSchema() {
  console.log("Checking shots table schema...\n");

  // Query information_schema to get all columns
  const columns = await db.execute(sql`
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'shots'
    ORDER BY ordinal_position;
  `);

  console.log("Columns in shots table:");
  console.log("─".repeat(60));
  for (const col of columns) {
    const row = col as { column_name: string; data_type: string; is_nullable: string };
    const nullable = row.is_nullable === "YES" ? "NULL" : "NOT NULL";
    console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${nullable}`);
  }
  console.log("─".repeat(60));
  console.log(`\nTotal columns: ${columns.length}`);

  // Check specifically for flavor-related columns
  const flavorColumns = columns.filter((col) => {
    const row = col as { column_name: string; data_type: string; is_nullable: string };
    return (
      row.column_name.includes("flavor") || 
      row.column_name === "body_texture" || 
      row.column_name === "adjectives"
    );
  });

  console.log("\nFlavor-related columns:");
  if (flavorColumns.length === 0) {
    console.log("  ⚠️  No flavor-related columns found!");
  } else {
    for (const col of flavorColumns) {
      const row = col as { column_name: string; data_type: string; is_nullable: string };
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    }
  }

  await client.end();
}

checkSchema().catch((err) => {
  console.error("Failed to check schema:", err);
  process.exit(1);
});
