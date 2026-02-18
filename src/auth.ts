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

/**
 * Returns the current session.
 * Use this instead of `auth()` in API routes.
 */
export async function getSession(): Promise<Session | null> {
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
