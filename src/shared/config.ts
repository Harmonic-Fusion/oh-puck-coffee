/**
 * Centralized environment configuration.
 * All env variable reads go through here for type safety and defaults.
 */
export const config = {
  /** Database connection string */
  databaseUrl: process.env.DATABASE_URL!,

  /** Auth.js / NextAuth */
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
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
