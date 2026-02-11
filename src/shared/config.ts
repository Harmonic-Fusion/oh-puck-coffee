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

export const config = {
  /** Database connection string */
  databaseUrl: process.env.DATABASE_URL!,

  /** Auth.js / NextAuth */
  nextAuthUrl: normalizeNextAuthUrl(),
  nextAuthSecret: process.env.NEXTAUTH_SECRET,
  /**
   * Trust host header. Required when running behind a reverse proxy (Railway, Vercel, etc.)
   * Can be set via AUTH_TRUST_HOST or NEXTAUTH_TRUST_HOST environment variable.
   * Defaults to true in production, false in development.
   */
  trustHost: (() => {
    const explicit = process.env.AUTH_TRUST_HOST || process.env.NEXTAUTH_TRUST_HOST;
    if (explicit === "true") return true;
    if (explicit === "false") return false;
    // Default: true in production, false in development
    return process.env.NODE_ENV === "production";
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
