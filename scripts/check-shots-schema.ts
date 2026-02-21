import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readEnvDatabaseUrl } from "../src/lib/dot-env";
import { sql } from "drizzle-orm";

const client = postgres(readEnvDatabaseUrl());
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
  for (const col of columns.rows) {
    const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
    console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`);
  }
  console.log("─".repeat(60));
  console.log(`\nTotal columns: ${columns.rows.length}`);

  // Check specifically for flavor-related columns
  const flavorColumns = columns.rows.filter((col: any) => 
    col.column_name.includes("flavor") || 
    col.column_name === "body_texture" || 
    col.column_name === "adjectives"
  );

  console.log("\nFlavor-related columns:");
  if (flavorColumns.length === 0) {
    console.log("  ⚠️  No flavor-related columns found!");
  } else {
    for (const col of flavorColumns) {
      console.log(`  ✓ ${col.column_name} (${col.data_type})`);
    }
  }

  await client.end();
}

checkSchema().catch((err) => {
  console.error("Failed to check schema:", err);
  process.exit(1);
});
