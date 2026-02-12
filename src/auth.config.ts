import type { NextAuthConfig } from "next-auth";
import { config } from "@/shared/config";
import { AppRoutes } from "@/app/routes";

export const authConfig = {
  providers: [],
  // Share the same secret with the main NextAuth instance so both
  // middleware and route-handler encrypt / decrypt cookies identically.
  secret: config.nextAuthSecret,
  pages: {
    signIn: AppRoutes.login.path,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Dev user bypass — skip all auth checks
      if (config.enableDevUser) return true;

      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api/");

      // Let API routes handle their own auth (they return 401 individually)
      if (isApiRoute) return true;

      // For app pages, redirect to login if not authenticated
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
