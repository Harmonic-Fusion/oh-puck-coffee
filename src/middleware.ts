import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { config as appConfig } from "./shared/config";
import { AppRoutes } from "./app/routes";
import { auth } from "./auth";
import { createLogger } from "./lib/logger";

// Initialize logger early
import "./lib/logger-init";

const middlewareLogger = createLogger("auth", "debug", "middleware");

// Create NextAuth middleware instance
const baseAuth = NextAuth(authConfig).auth;

// ── Protected route prefixes ─────────────────────────────────────────
// These correspond to the (app) route group — the ONLY routes that
// require authentication. Everything else (landing pages, auth pages,
// share pages, API routes) is public or self-authenticating.
//
// When adding a NEW top-level (app) route, add its prefix here.
// When adding a new (landing) or (auth) page, NO changes needed.
const PROTECTED_PREFIXES = ["/log", "/dashboard", "/history", "/settings"];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// Helper to invoke baseAuth with proper typing
function invokeBaseAuth(request: NextRequest, event: NextFetchEvent) {
  return (baseAuth as unknown as (
    request: NextRequest,
    event: NextFetchEvent
  ) => Promise<Response | undefined>)(request, event);
}

// Wrap the auth middleware with error handling
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  try {
    const pathname = request.nextUrl.pathname;

    // Skip middleware for static assets (images, logos, etc.)
    if (
      pathname.startsWith("/logos/") ||
      pathname.startsWith("/images/") ||
      pathname.startsWith("/icons/") ||
      pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)
    ) {
      return NextResponse.next();
    }

    // Skip auth check for dev user mode - let NextAuth handle it
    if (appConfig.enableDevUser) {
      return await invokeBaseAuth(request, event);
    }

    // Only protected (app) routes require authentication.
    // Everything else — landing pages, auth pages, API routes,
    // share pages — passes through to NextAuth without blocking.
    if (!isProtectedRoute(pathname)) {
      return await invokeBaseAuth(request, event);
    }

    // ── Protected route: check authentication explicitly ──
    const session = await auth();

    const isLoggedIn =
      session !== null &&
      session !== undefined &&
      session.user !== null &&
      session.user !== undefined;

    if (!isLoggedIn) {
      // Redirect to login page with callbackUrl
      const url = new URL(AppRoutes.login.path, request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // User is authenticated, let NextAuth handle the rest
    return await invokeBaseAuth(request, event);
  } catch (error) {
    // Enhanced error logging for JWT/session errors in middleware
    if (appConfig.enableDebugging) {
      middlewareLogger.error("Error in auth middleware:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause:
          error instanceof Error && error.cause
            ? String(error.cause)
            : undefined,
        // Log request details
        url: request.url,
        method: request.method,
        headers: appConfig.enableDebugging
          ? Object.fromEntries(request.headers.entries())
          : undefined,
      });
    }
    // Re-throw to let Next.js handle it
    throw error;
  }
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware
  // Match all routes except:
  // - API auth routes (/api/auth/*)
  // - Health check (/api/health)
  // - Share pages (/share/*)
  // - Next.js internals (_next/*)
  // - Static assets (favicon.ico, sw.js, manifest.json, icons/*, logos/*, images/*)
  matcher: [
    "/((?!api/auth|api/health|share|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|logos|images).*)",
  ],
};
