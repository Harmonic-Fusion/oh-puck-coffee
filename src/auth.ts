import type { Provider } from "next-auth/providers";
import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { authConfig } from "./auth.config";
import { config } from "./shared/config";

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
    console.warn(
      "[auth] GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET are not set. " +
        "Google OAuth will be unavailable. Set ENABLE_DEV_USER=true for local development."
    );
  }

  return providers;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: config.trustHost,
  secret: config.nextAuthSecret,
  // Explicitly lock the cookie prefix so it stays consistent between
  // the sign-in request (cookie set) and the OAuth callback (cookie read).
  // Behind Railway / Vercel reverse proxies the auto-detection can flip
  // between requests, causing the PKCE code_verifier cookie to "vanish".
  useSecureCookies: config.nextAuthUrl.startsWith("https://"),
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
        // Fetch user role from database
        const [dbUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
        if (dbUser) {
          session.user.role = dbUser.role as "member" | "admin";
        }
      }
      return session;
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
  const session = await auth();
  if (session) return session;

  if (config.enableDevUser) {
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
