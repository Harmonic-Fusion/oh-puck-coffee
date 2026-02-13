import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import { config as appConfig } from "./shared/config";
import { createLogger } from "./lib/logger";

// Initialize logger early
import "./lib/logger-init";

const middlewareLogger = createLogger("auth", "debug", "middleware");

const baseAuth = NextAuth(authConfig).auth;

// Wrap the auth middleware with error handling
export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  try {
    // Type assertion needed because NextAuth types don't fully match Next.js middleware types
    // but the runtime behavior is correct
    return await (baseAuth as unknown as (
      request: NextRequest,
      event: NextFetchEvent
    ) => Promise<Response | undefined>)(request, event);
  } catch (error) {
    // Enhanced error logging for JWT/session errors in middleware
    if (appConfig.enableDebugging) {
      middlewareLogger.error("Error in auth middleware:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        cause: error instanceof Error && error.cause ? String(error.cause) : undefined,
        // Log request details
        url: request.url,
        method: request.method,
        headers: appConfig.enableDebugging ? Object.fromEntries(request.headers.entries()) : undefined,
      });
    }
    // Re-throw to let Next.js handle it
    throw error;
  }
}

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  // Exclude: API auth routes, health check, Next.js internals, static assets, service worker, manifest, and login page
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|login|sw.js|manifest.json|icons).*)",
  ],
};
