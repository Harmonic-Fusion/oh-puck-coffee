/**
 * Guardrails to prevent E2E test database operations from running against production.
 * Call validateTestEnvironment() before any create/drop/truncate of the test DB.
 */

export function validateTestEnvironment(databaseUrl: string): void {
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error(
      "[e2e guardrails] DATABASE_URL is required for E2E tests. Use .env.test with a database name ending in _test.",
    );
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(
      "[e2e guardrails] DATABASE_URL must be a valid URL (e.g. postgresql://user:pass@host:5432/dbname).",
    );
  }

  const pathname = url.pathname.replace(/^\//, "");
  const dbName = pathname.split("/")[0] || "";

  if (!dbName.endsWith("_test")) {
    throw new Error(
      `[e2e guardrails] Refusing to run E2E database operations: database name must end with _test. Got: "${dbName}". ` +
        "Use DATABASE_URL=.../coffee_test in .env.test.",
    );
  }

  const host = url.hostname.toLowerCase();
  const allowedHosts = ["localhost", "127.0.0.1"];
  if (!allowedHosts.includes(host)) {
    throw new Error(
      `[e2e guardrails] Refusing to run E2E database operations: host must be localhost or 127.0.0.1. Got: "${host}".`,
    );
  }

  if (process.env.RAILWAY_ENVIRONMENT !== undefined) {
    throw new Error(
      "[e2e guardrails] Refusing to run E2E tests on Railway. Unset RAILWAY_ENVIRONMENT.",
    );
  }

  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    throw new Error(
      "[e2e guardrails] Refusing to run E2E tests on Vercel. Unset VERCEL.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[e2e guardrails] Refusing to run E2E tests with NODE_ENV=production.",
    );
  }
}
