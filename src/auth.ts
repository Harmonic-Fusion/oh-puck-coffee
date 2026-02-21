import type { Provider } from "next-auth/providers";
import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, accounts, verificationTokens } from "./db/schema";
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
  authLogger.debug("  enableDebugging      =", config.enableDebugging);
  authLogger.debug("─────────────────────────");
}

// Build providers list conditionally to avoid Configuration errors
// when Google OAuth credentials are not set
function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (config.googleClientId && config.googleClientSecret) {
    providers.push(
      Google({
        clientId: config.googleClientId,
        clientSecret: config.googleClientSecret,
      })
    );
  } else {
    authLogger.warn(
      "GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are not set. " +
        "Google OAuth will be unavailable."
    );
  }

  return providers;
}

// Detect if we're in a build phase where env vars may not be available
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-development-build" ||
  (typeof process.env.npm_lifecycle_event !== "undefined" &&
    process.env.npm_lifecycle_event === "build" &&
    !config.nextAuthSecret);

// Use a placeholder secret during build if none is available
const authSecret =
  isBuildPhase && !config.nextAuthSecret
    ? "build-placeholder-secret-not-used-at-runtime-min-32-chars"
    : config.nextAuthSecret;

// Validate NEXTAUTH_SECRET at runtime (skip during build)
if (!isBuildPhase) {
  if (!config.nextAuthSecret) {
    throw new Error(
      "[auth] NEXTAUTH_SECRET is required. " +
        "Set it in your environment variables. " +
        "Generate one with: openssl rand -base64 32"
    );
  }
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
  debug: config.enableDebugging,
  trustHost: config.trustHost,
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  useSecureCookies,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: buildProviders(),
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, `user` is the adapter's DB user
      if (user) {
        token.id = user.id;
        const [dbUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        token.role = (dbUser?.role as "member" | "admin") ?? "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async signIn() {
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

        const [dbUser] = await db
          .select({ isCustomName: users.isCustomName })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        const hasCustomName = dbUser?.isCustomName ?? false;

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
import { DEV_USER_ID, DEV_USER_NAME, DEV_USER_EMAIL } from "./shared/dev-user";

/**
 * Ensure the dev user exists in the database (upsert).
 * Called once per process and cached so subsequent `getSession()` calls
 * don't hit the DB every time.
 */
let devUserEnsured = false;
async function ensureDevUser(): Promise<void> {
  if (devUserEnsured) return;

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, DEV_USER_ID))
      .limit(1);

    if (!existing) {
      try {
        await db.insert(users).values({
          id: DEV_USER_ID,
          name: DEV_USER_NAME,
          email: DEV_USER_EMAIL,
          role: "admin",
        });
        authLogger.info("Dev user created", {
          id: DEV_USER_ID,
          name: DEV_USER_NAME,
          email: DEV_USER_EMAIL,
        });
      } catch (insertError) {
        // Handle race condition: user might have been created between check and insert
        // Also handle unique constraint violations (e.g., email already exists)
        if (
          insertError instanceof Error &&
          (insertError.message.includes("duplicate key") ||
            insertError.message.includes("unique constraint") ||
            insertError.message.includes("violates unique constraint"))
        ) {
          authLogger.debug("Dev user already exists (race condition)", {
            id: DEV_USER_ID,
          });
          // Verify the user actually exists now
          const [verified] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, DEV_USER_ID))
            .limit(1);
          if (!verified) {
            // Check if there's a user with the dev email but different ID
            const [conflictingUser] = await db
              .select({ id: users.id, email: users.email })
              .from(users)
              .where(eq(users.email, DEV_USER_EMAIL))
              .limit(1);
            
            if (conflictingUser) {
              authLogger.error("Dev user insert failed: email conflict", {
                devUserId: DEV_USER_ID,
                conflictingUserId: conflictingUser.id,
                email: DEV_USER_EMAIL,
              });
              throw new Error(
                `Dev user (${DEV_USER_ID}) could not be created. ` +
                `A user with email ${DEV_USER_EMAIL} already exists with ID ${conflictingUser.id}. ` +
                `Please either delete that user or use a different email for the dev user. ` +
                `You can run: pnpm ensure-dev-user to fix this automatically.`
              );
            }
            
            authLogger.error("Dev user insert failed with constraint error but user still doesn't exist", {
              id: DEV_USER_ID,
              error: insertError.message,
            });
            // Throw an error to prevent getSession() from returning a session with a non-existent user
            throw new Error(
              `Dev user (${DEV_USER_ID}) could not be created. ` +
              `Database error: ${insertError instanceof Error ? insertError.message : String(insertError)}. ` +
              `You can run: pnpm ensure-dev-user to fix this automatically.`
            );
          }
        } else {
          // Re-throw unexpected errors
          authLogger.error("Unexpected error creating dev user", {
            id: DEV_USER_ID,
            error: insertError instanceof Error ? insertError.message : String(insertError),
          });
          throw insertError;
        }
      }
    }
    
    // Final verification: ensure the user actually exists before marking as ensured
    const [finalCheck] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, DEV_USER_ID))
      .limit(1);
    
    if (!finalCheck) {
      throw new Error(
        `Dev user (${DEV_USER_ID}) does not exist in database after ensure attempt`
      );
    }
    
    devUserEnsured = true;
  } catch (error) {
    authLogger.error("Failed to ensure dev user", {
      error: error instanceof Error ? error.message : String(error),
      id: DEV_USER_ID,
    });
    // Don't set devUserEnsured = true on error, so we retry on next call
    // This allows recovery if the DB was temporarily unavailable
    throw error;
  }
}

/**
 * Returns the current session.
 * Use this instead of `auth()` in API routes.
 *
 * When `ENABLE_DEV_USER=true`, the middleware mints a real JWT cookie
 * for the dev user, so `auth()` decodes it through the normal
 * jwt → session callback pipeline. We just ensure the DB row exists
 * first so foreign-key references work.
 */
export async function getSession(): Promise<Session | null> {
  // ── Dev user: ensure DB row, then use the normal JWT flow ──────
  if (config.enableDevUser) {
    await ensureDevUser();
  }

  // Runtime validation
  if (
    !isBuildPhase &&
    authSecret === "build-placeholder-secret-not-used-at-runtime-min-32-chars"
  ) {
    throw new Error(
      "[auth] NEXTAUTH_SECRET is required. " +
        "Set it in your environment variables."
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
    if (config.enableDebugging) {
      authLogger.error("Error retrieving session:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause:
          error instanceof Error && error.cause
            ? String(error.cause)
            : undefined,
      });
    }
    throw error;
  }

  return null;
}
