/**
 * Centralized environment configuration.
 * All env variable reads go through here for type safety and defaults.
 */
/**
 * Normalize NEXTAUTH_URL to ensure it has a protocol.
 * Railway may set it to just a hostname (e.g., "app.railway.app")
 * but NextAuth requires a full URL with protocol.
 */
function normalizeNextAuthUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  
  // If it already has a protocol, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // Otherwise, assume https for production, http for development
  const protocol = process.env.NODE_ENV === "production" ? "https://" : "http://";
  const normalized = `${protocol}${url}`;
  
  // Set it back in process.env so NextAuth can read it
  process.env.NEXTAUTH_URL = normalized;
  
  return normalized;
}

/**
 * Determine the port number for the server.
 * Priority:
 * 1. PORT environment variable (if provided)
 * 2. Port extracted from NEXTAUTH_URL (if PORT is not provided)
 * 3. Default to 3000
 */
function determinePort(): number {
  // If PORT is explicitly set, use it
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port)) {
      return port;
    }
  }
  
  // Try to extract port from NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl.startsWith("http") ? nextAuthUrl : `http://${nextAuthUrl}`);
      if (url.port) {
        const port = parseInt(url.port, 10);
        if (!isNaN(port)) {
          // Set PORT in process.env so Next.js can use it
          process.env.PORT = url.port;
          return port;
        }
      }
    } catch {
      // Invalid URL, fall through to default
    }
  }
  
  // Default to 3000
  if (!process.env.PORT) {
    process.env.PORT = "3000";
  }
  return 3000;
}

function isRunningOnRailway(): boolean {
  return !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PUBLIC_DOMAIN;
}

function sanitizeDatabaseUrlForLogs(rawUrl: string): string {
  // Best-effort redaction. Prefer URL parsing, fall back to simple string heuristics.
  try {
    const url = new URL(rawUrl);

    // Redact credentials in authority.
    if (url.username) url.username = "****";
    if (url.password) url.password = "****";

    // Redact common password-like query params.
    const redactedParams = ["password", "pass", "pwd", "secret", "token"];
    for (const key of redactedParams) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "****");
    }

    return url.toString();
  } catch {
    // Remove basic auth segment (user[:pass]@) if present.
    const withoutAuth = rawUrl.replace(/\/\/[^/@]*@/g, "//****@");
    // If we still have a user:pass pattern, redact the password part.
    return withoutAuth.replace(/:([^@/]+)@/g, ":****@");
  }
}

function readDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  let hostname: string | undefined;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error(
      `[config] Invalid DATABASE_URL. Expected a valid URL like ` +
        `"postgresql://user:password@host:5432/db". Got: "${sanitizeDatabaseUrlForLogs(
          databaseUrl
        )}"`
    );
  }

  const isRailwayInternalHost =
    hostname === "postgres.railway.internal" || hostname.endsWith(".railway.internal");

  if (isRailwayInternalHost && !isRunningOnRailway()) {
    throw new Error(
      `[config] DATABASE_URL points to a Railway private hostname ("${hostname}") which is not reachable ` +
        `outside Railway. Use the Railway *public* Postgres connection string for local/dev or non-Railway ` +
        `deployments, or run this app inside the same Railway project/environment as the Postgres service.`
    );
  }

  return databaseUrl;
}

export const config = {
  /** Database connection string */
  databaseUrl: readDatabaseUrl(),

  /** Server port (defaults to 3000, or inferred from NEXTAUTH_URL if PORT is not set) */
  port: determinePort(),

  /** Auth.js / NextAuth */
  nextAuthUrl: normalizeNextAuthUrl(),
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  /**
   * Trust host header. Required for Auth.js v5 in all environments.
   * Can be set via AUTH_TRUST_HOST or NEXTAUTH_TRUST_HOST environment variable.
   * 
   * Defaults:
   * - true in development (Auth.js v5 requires this even for localhost)
   * - true in production or when running on Railway/Vercel (behind reverse proxy)
   */
  trustHost: (() => {
    const explicit = process.env.AUTH_TRUST_HOST || process.env.NEXTAUTH_TRUST_HOST;
    if (explicit === "true") return true;
    if (explicit === "false") return false;
    
    // Auth.js v5 requires trustHost: true in development
    const isDevelopment = 
      process.env.NODE_ENV === "development" ||
      !process.env.NODE_ENV;
    
    // Default to true in development
    if (isDevelopment) return true;
    
    // In production, trust host if on Railway/Vercel or explicitly production
    const isProduction = process.env.NODE_ENV === "production";
    const isRailway = isRunningOnRailway();
    const isVercel = !!process.env.VERCEL;
    return isProduction || isRailway || isVercel;
  })(),

  /** Google OAuth */
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  /**
   * When true, bypasses Google OAuth and creates/uses a local dev user.
   * Defaults to false if not set.
   */
  enableDevUser: process.env.ENABLE_DEV_USER === "true",
} as const;
