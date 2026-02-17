import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AppRoutes } from "./app/routes";
import { auth } from "./auth";
import { config as appConfig } from "./shared/config";
import { createLogger } from "./lib/logger";

// Initialize logger early
import "./lib/logger-init";

const middlewareLogger = createLogger("auth", "debug", "middleware");

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

export default async function middleware(request: NextRequest) {
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

    // Non-protected routes pass through without any auth check.
    // This includes landing pages, auth pages, API routes, share pages.
    if (!isProtectedRoute(pathname)) {
      return NextResponse.next();
    }

    // ── Protected route: check session ───────────────────────────────
    const session = await auth();

    if (!session?.user) {
      // Not authenticated → redirect to login with callbackUrl
      const url = new URL(AppRoutes.login.path, request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // Authenticated → allow through
    return NextResponse.next();
  } catch (error) {
    if (appConfig.enableDebugging) {
      middlewareLogger.error("Error in auth middleware:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause:
          error instanceof Error && error.cause
            ? String(error.cause)
            : undefined,
        url: request.url,
        method: request.method,
      });
    }
    throw error;
  }
}

export const config = {
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
