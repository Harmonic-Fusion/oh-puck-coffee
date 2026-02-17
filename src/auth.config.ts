import type { NextAuthConfig } from "next-auth";
import { config } from "@/shared/config";
import { AppRoutes } from "@/app/routes";

/**
 * Shared Auth.js configuration.
 *
 * This is spread into the full NextAuth instance in auth.ts.
 * Route protection is handled entirely by middleware.ts — the
 * `authorized` callback here is a no-op pass-through so that
 * NextAuth never blocks requests on its own.
 */
export const authConfig = {
  providers: [],
  // Share the same secret so cookies are read/written consistently.
  secret: config.nextAuthSecret,
  pages: {
    signIn: AppRoutes.login.path,
  },
  callbacks: {
    // Route protection is handled by middleware.ts. This callback
    // always returns true so NextAuth never redirects on its own.
    authorized() {
      return true;
    },
  },
} satisfies NextAuthConfig;
