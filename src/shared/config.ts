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

  /** Google OAuth */
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  /**
   * When true, bypasses Google OAuth and creates/uses a local dev user.
   * Defaults to false if not set.
   */
  enableDevUser: process.env.ENABLE_DEV_USER === "true",
} as const;
