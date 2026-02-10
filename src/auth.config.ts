import type { NextAuthConfig } from "next-auth";

const enableDevUser = process.env.ENABLE_DEV_USER === "true";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Dev user bypass — skip all auth checks
      if (enableDevUser) return true;

      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api/");

      // Let API routes handle their own auth (they return 401 individually)
      if (isApiRoute) return true;

      // For app pages, redirect to login if not authenticated
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
