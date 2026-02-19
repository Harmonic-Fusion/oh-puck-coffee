import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { AppRoutes, AppRouteMap } from "./app/routes";
import { isPublicRoute } from "@/lib/routes-builder";
import { config as appConfig } from "./shared/config";

// ─────────────────────────────────────────────────────────────────────
// IMPORTANT: This middleware runs in the Edge Runtime.
// Do NOT import `auth` from "./auth" here — that pulls in DrizzleAdapter
// + the postgres client, which require Node.js TCP sockets unavailable
// in Edge.  Instead we check for the Auth.js session cookie directly.
// `next-auth/jwt` and `@/shared/config` are Edge-safe (no Node-only deps).
// Actual session validation happens in API routes / server components
// via `getSession()` from "@/auth".
// ─────────────────────────────────────────────────────────────────────

// Auth.js v5 session cookie names
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;

// Edge-safe dev user constants (shared with src/auth.ts)
import { DEV_USER_ID, DEV_USER_NAME, DEV_USER_EMAIL } from "./shared/dev-user";

function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname, AppRouteMap);
}

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some((name) => request.cookies.has(name));
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Non-protected routes pass through without any auth check.
  // This includes landing pages, auth pages, API routes, share pages.
  // Static assets are already excluded by the matcher config below.
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Dev user: mint a real JWT cookie ────────────────────────────
  // When ENABLE_DEV_USER is set and no session cookie exists yet,
  // encode a real JWT for the dev user so the entire auth stack
  // (cookie → jwt callback → session callback) is exercised normally.
  if (appConfig.enableDevUser && !hasSessionCookie(request)) {
    const secret = appConfig.nextAuthSecret;
    if (!secret) {
      // Can't mint a cookie without a secret — fall through to normal
      // cookie check which will redirect to login.
    } else {
      const useSecure = request.nextUrl.protocol === "https:";
      const cookieName = useSecure
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";

      const token = await encode({
        token: {
          sub: DEV_USER_ID,
          id: DEV_USER_ID,
          role: "admin",
          name: DEV_USER_NAME,
          email: DEV_USER_EMAIL,
        },
        secret,
        salt: cookieName,
      });

      const response = NextResponse.next();
      response.cookies.set(cookieName, token, {
        httpOnly: true,
        secure: useSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      return response;
    }
  }

  // ── Protected route: check for session cookie ────────────────────
  // This only checks cookie presence — NOT validity. Expired or
  // tampered sessions will fail when getSession() runs in the actual
  // route handler, which will then redirect to login.
  if (!hasSessionCookie(request)) {
    const url = new URL(AppRoutes.login.path, request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except:
  // - API auth routes (/api/auth/*)
  // - Health check (/api/health)
  // - Share pages (/share/*)
  // - Next.js internals (_next/*)
  // - Static assets (favicon.ico, sw.js, manifest.json, icons/*, logos/*, images/*)
  matcher: [
    // Exclude: API auth, health check, share pages, Next.js internals, static assets
    "/((?!api/auth|api/health|share|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|logos|images).*)",
  ],
};
