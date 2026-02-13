import { handlers } from "@/auth";
import { config } from "@/shared/config";
import { NextRequest, NextResponse } from "next/server";

// Wrap handlers to catch JWT errors and provide better error handling
async function handleAuthRequest(
  handler: (req: Request | NextRequest) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    // NextRequest extends Request, so we can pass it directly
    return await handler(req);
  } catch (error) {
    // Check if this is a JWT/JWE encryption error
    const isJWTError =
      error instanceof Error &&
      (error.name === "JWTSessionError" ||
        error.message.includes("JWTSessionError") ||
        error.message.includes("Invalid Compact JWE") ||
        error.message.includes("JWE") ||
        String(error.cause || "").includes("Invalid Compact JWE") ||
        String(error.cause || "").includes("JWE"));

    if (isJWTError) {
      if (config.enableDebugging) {
        console.error("[auth:debug] JWT session error caught, clearing cookies:", {
          error: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : undefined,
          cause: error instanceof Error ? error.cause : undefined,
          url: req.url,
          pathname: new URL(req.url).pathname,
          hasSecret: !!config.nextAuthSecret,
          secretLength: config.nextAuthSecret?.length ?? 0,
        });
      }

      // Determine redirect URL - if this is an OAuth callback, redirect to login
      // Otherwise, redirect to the login page
      const url = new URL(req.url);
      const isCallback = url.pathname.includes("/callback/");
      const redirectUrl = isCallback
        ? new URL("/login", req.url)
        : new URL("/login", req.url);

      // Clear all auth-related cookies by setting them to expire
      const response = NextResponse.redirect(redirectUrl);
      const cookieNames = [
        // Session tokens
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.session-token",
        "__Host-authjs.session-token",
        // PKCE code verifier
        "__Secure-authjs.pkce.code_verifier",
        "authjs.pkce.code_verifier",
        "__Secure-next-auth.pkce.code_verifier",
        "next-auth.pkce.code_verifier",
        // CSRF tokens
        "__Secure-authjs.csrf-token",
        "authjs.csrf-token",
        "__Secure-next-auth.csrf-token",
        "next-auth.csrf-token",
      ];

      const useSecure = config.nextAuthUrl.startsWith("https://");
      cookieNames.forEach((name) => {
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          sameSite: "lax",
          secure: useSecure,
          httpOnly: true,
        });
      });

      return response;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return handleAuthRequest(handlers.GET as (req: Request | NextRequest) => Promise<Response>, req);
}

export async function POST(req: NextRequest) {
  return handleAuthRequest(handlers.POST as (req: Request | NextRequest) => Promise<Response>, req);
}
