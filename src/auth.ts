import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./db/schema";
import { authConfig } from "./auth.config";
import { config } from "./shared/config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      authorization: {
        params: {
          scope:
            "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets",
        },
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
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

  const [created] = await db
    .insert(users)
    .values({ name: "Dev User", email: DEV_USER_EMAIL })
    .returning();

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
      },
      expires: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  return null;
}
