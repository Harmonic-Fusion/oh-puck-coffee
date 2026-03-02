import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { config } from "@/shared/config";

export async function GET() {
  const checks = {
    app: "ok",
    database: "unknown",
  };

  // Check database connection
  if (!config.databaseUrl) {
    return NextResponse.json(
      {
        status: "degraded",
        checks: {
          ...checks,
          database: "error",
          error: "DATABASE_URL not configured",
        },
      },
      { status: 503 }
    );
  }

  try {
    // Execute a simple query to verify database connectivity
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "degraded",
        checks: {
          ...checks,
          database: "error",
          error: errorMessage,
        },
      },
      { status: 503 }
    );
  }

  // All checks passed
  return NextResponse.json(
    {
      status: "ok",
      checks,
    },
    { status: 200 }
  );
}
