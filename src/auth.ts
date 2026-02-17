import type { Provider } from "next-auth/providers";
import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { authConfig } from "./auth.config";
import { config } from "./shared/config";
import { createLogger } from "./lib/logger";

// Initialize logger early
import "./lib/logger-init";

const authLogger = createLogger("auth", "debug");

// ── Auth debug diagnostics ───────────────────────────────────────────
const useSecureCookies = config.nextAuthUrl.startsWith("https://");

if (config.enableDebugging) {
  authLogger.debug("── Auth configuration ──");
  authLogger.debug("  NEXTAUTH_URL        =", config.nextAuthUrl);
  authLogger.debug("  useSecureCookies     =", useSecureCookies);
  authLogger.debug("  trustHost            =", config.trustHost);
  authLogger.debug("  NEXTAUTH_SECRET set? =", !!config.nextAuthSecret);
  authLogger.debug("  SECRET length        =", config.nextAuthSecret?.length ?? 0);
  authLogger.debug("  NODE_ENV             =", process.env.NODE_ENV);
  authLogger.debug("  GOOGLE_CLIENT_ID set?=", !!config.googleClientId);
  authLogger.debug("  enableDevUser        =", config.enableDevUser);
  authLogger.debug("  enableDebugging      =", config.enableDebugging);
  authLogger.debug("─────────────────────────");
}

// Build providers list conditionally to avoid Configuration errors
// when Google OAuth credentials are not set (e.g. dev-only deployments)
function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (config.googleClientId && config.googleClientSecret) {
    providers.push(
      Google({
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      })
    );
  } else if (!config.enableDevUser) {
    authLogger.warn(
      "GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are not set. " +
        "Google OAuth will be unavailable. Set ENABLE_DEV_USER=true for local development."
    );
  }

  return providers;
}

// Detect if we're in a build phase where env vars may not be available
// Next.js sets NEXT_PHASE during build. We also check for the presence of
// build-time indicators to handle cases where NEXT_PHASE might not be set
const isBuildPhase = 
  process.env.NEXT_PHASE === "phase-production-build" || 
  process.env.NEXT_PHASE === "phase-development-build" ||
  // Fallback: check if we're likely in a build context
  // This is a best-effort detection for Docker builds where NEXT_PHASE might not be set
  // Runtime validation in getSession() will catch missing secrets at runtime
  (typeof process.env.npm_lifecycle_event !== "undefined" && 
   process.env.npm_lifecycle_event === "build" &&
   !config.nextAuthSecret &&
   !config.enableDevUser);

// Use a placeholder secret during build if none is available
// This allows Next.js to build successfully, but auth will fail at runtime if secret is missing
const authSecret = isBuildPhase && !config.nextAuthSecret
  ? "build-placeholder-secret-not-used-at-runtime-min-32-chars"
  : config.nextAuthSecret;

// Validate NEXTAUTH_SECRET in production (skip during build)
// Next.js evaluates modules during build, but env vars may not be available
if (!isBuildPhase && !config.enableDevUser) {
  if (!config.nextAuthSecret) {
    throw new Error(
      "[auth] NEXTAUTH_SECRET is required in production. " +
      "Set it in your environment variables or use ENABLE_DEV_USER=true for local development."
    );
  }
  // Auth.js requires the secret to be at least 32 characters
  if (config.nextAuthSecret.length < 32) {
    throw new Error(
      "[auth] NEXTAUTH_SECRET must be at least 32 characters long. " +
      `Current length: ${config.nextAuthSecret.length}. ` +
      "Generate a secure secret with: openssl rand -base64 32"
    );
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: config.enableDebugging, // Enable Auth.js verbose debug logging only when ENABLED_DEBUGGING is set
  trustHost: config.trustHost,
  secret: authSecret,
  // Explicitly use database sessions when adapter is configured
  // This prevents Auth.js from falling back to JWT sessions
  session: {
    strategy: "database",
  },
  // Explicitly lock the cookie prefix so it stays consistent between
  // the sign-in request (cookie set) and the OAuth callback (cookie read).
  // Behind Railway / Vercel reverse proxies the auto-detection can flip
  // between requests, causing the PKCE code_verifier cookie to "vanish".
  useSecureCookies,
  // Use the Proxy db directly - it has a getPrototypeOf trap that makes
  // DrizzleAdapter's `is()` checks work correctly via prototype chain walking.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: buildProviders(),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch latest user data from database (role, name, image may be
        // refreshed on each Google sign-in via the signIn event)
        const [dbUser] = await db
          .select({
            role: users.role,
            name: users.name,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        if (dbUser) {
          session.user.role = dbUser.role as "member" | "admin";
          if (dbUser.name) session.user.name = dbUser.name;
          if (dbUser.image) session.user.image = dbUser.image;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after successful sign-in
      // If url is relative, make it absolute
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If url is on the same origin, allow it
      if (new URL(url).origin === baseUrl) return url;
      // Default to home page
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      // This callback runs before the session is created
      // If there's a JWT error, it will be caught by the route handler
      return true;
    },
  },
  events: {
    async signIn({ user, account, profile: oauthProfile }) {
      if (config.enableDebugging) {
        authLogger.child("event").debug("signIn:", {
          userId: user.id,
          email: user.email,
          accountProvider: account?.provider,
        });
      }

      // Sync name & image from Google profile on every login
      if (account?.provider === "google" && user.id && oauthProfile) {
        const googleName = (oauthProfile as { name?: string }).name ?? null;
        const googleImage = (oauthProfile as { picture?: string }).picture ?? null;

        // Check if user has a custom name override
        const [dbUser] = await db
          .select({ isCustomName: users.isCustomName })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        const hasCustomName = dbUser?.isCustomName ?? false;

        // Build updates — skip name if user has set a custom one
        const updates: Record<string, string> = {};
        if (!hasCustomName && googleName && googleName !== user.name) {
          updates.name = googleName;
        }
        if (googleImage && googleImage !== user.image) {
          updates.image = googleImage;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(users)
            .set(updates)
            .where(eq(users.id, user.id));

          authLogger.debug("Synced Google profile →", {
            userId: user.id,
            updates,
            skippedName: hasCustomName,
          });
        }
      }
    },
  },
});

// ── Dev user bypass ──────────────────────────────────────────────────

const DEV_USER_EMAIL = "dev@coffee.local";

async function getOrCreateDevUser() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  if (existing) return existing;

  // Use onConflictDoNothing to handle concurrent requests
  const [created] = await db
    .insert(users)
    .values({ name: "Dev User", email: DEV_USER_EMAIL })
    .onConflictDoNothing({ target: users.email })
    .returning();

  // If another request beat us, fetch the existing row
  if (!created) {
    const [raced] = await db
      .select()
      .from(users)
      .where(eq(users.email, DEV_USER_EMAIL))
      .limit(1);
    return raced;
  }

  return created;
}

/**
 * Returns the current session, falling back to a dev user session
 * when `ENABLE_DEV_USER=true` and no real session exists.
 *
 * Use this instead of `auth()` in API routes.
 */
export async function getSession(): Promise<Session | null> {
  // Runtime validation: ensure we're not using the build placeholder secret
  if (!isBuildPhase && !config.enableDevUser && authSecret === "build-placeholder-secret-not-used-at-runtime-min-32-chars") {
    throw new Error(
      "[auth] NEXTAUTH_SECRET is required in production. " +
      "Set it in your environment variables or use ENABLE_DEV_USER=true for local development."
    );
  }

  try {
    const session = await auth();
    if (session) {
      if (config.enableDebugging) {
        authLogger.debug("Session retrieved successfully", {
          userId: session.user?.id,
          email: session.user?.email,
          expires: session.expires,
        });
      }
      return session;
    }
  } catch (error) {
    // Enhanced error logging for JWT/session errors
    if (config.enableDebugging) {
      authLogger.error("Error retrieving session:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error && error.cause ? String(error.cause) : undefined,
      });
    }
    // Re-throw to let callers handle it
    throw error;
  }

  if (config.enableDevUser) {
    if (config.enableDebugging) {
      authLogger.debug("No session found, using dev user fallback");
    }
    const devUser = await getOrCreateDevUser();
    return {
      user: {
        id: devUser.id,
        name: devUser.name,
        email: devUser.email,
        image: devUser.image,
        role: (devUser.role as "member" | "admin") || "member",
      },
      expires: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  return null;
}
