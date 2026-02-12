import { handlers } from "@/auth";
import { config } from "@/shared/config";
import { NextRequest, NextResponse } from "next/server";

// Wrap handlers to catch JWT errors and provide better error handling
async function handleAuthRequest(
  handler: (req: Request) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    return await handler(req);
  } catch (error) {
    // Handle JWT session errors gracefully
    if (
      error instanceof Error &&
      (error.message.includes("JWTSessionError") ||
        error.message.includes("Invalid Compact JWE") ||
        String(error.cause || "").includes("Invalid Compact JWE"))
    ) {
      if (config.enableDebugging) {
        console.error("[auth:debug] JWT session error caught, clearing cookies:", {
          error: error.message,
          cause: error.cause,
          url: req.url,
        });
      }

      // Clear auth cookies by setting them to expire
      const response = NextResponse.redirect(new URL("/login", req.url));
      const cookieNames = [
        "__Secure-authjs.session-token",
        "authjs.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.session-token",
        "__Host-authjs.session-token",
      ];

      cookieNames.forEach((name) => {
        response.cookies.set(name, "", {
          expires: new Date(0),
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      });

      return response;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return handleAuthRequest(handlers.GET, req);
}

export async function POST(req: NextRequest) {
  return handleAuthRequest(handlers.POST, req);
}
