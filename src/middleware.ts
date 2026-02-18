import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AppRoutes } from "./app/routes";

// ─────────────────────────────────────────────────────────────────────
// IMPORTANT: This middleware runs in the Edge Runtime.
// Do NOT import `auth` from "./auth" here — that pulls in DrizzleAdapter
// + the postgres client, which require Node.js TCP sockets unavailable
// in Edge.  Instead we check for the Auth.js session cookie directly.
// Actual session validation happens in API routes / server components
// via `getSession()` from "@/auth".
// ─────────────────────────────────────────────────────────────────────

// Auth.js v5 session cookie names
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

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

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(SECURE_SESSION_COOKIE)
  );
}

export default function middleware(request: NextRequest) {
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

  // ── Protected route: check for session cookie ────────────────────
  // This only checks cookie presence — NOT validity. Expired or
  // tampered sessions will fail when getSession() runs in the actual
  // route handler, which will then redirect to login.
  if (!hasSessionCookie(request)) {
    const url = new URL(AppRoutes.login.path, request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Session cookie present → allow through
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
    "/((?!api/auth|api/health|share|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons|logos|images).*)",
  ],
};
