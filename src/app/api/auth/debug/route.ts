import { NextRequest, NextResponse } from "next/server";
import { config } from "@/shared/config";

/**
 * GET /api/auth/debug
 *
 * Returns non-secret diagnostic information about the Auth.js configuration
 * to help debug OAuth / PKCE cookie issues.
 *
 * NOTE: This endpoint intentionally does NOT require authentication since
 * the whole problem is that auth isn't working. Remove or protect it once
 * the issue is resolved.
 */
export async function GET(request: NextRequest) {
  const useSecureCookies = config.nextAuthUrl.startsWith("https://");
  const requestUrl = new URL(request.url);

  // Inspect cookies sent by the browser in this request
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  const pkceCookies = cookieNames.filter(
    (name) => name.includes("pkce") || name.includes("callback") || name.includes("state")
  );
  const authCookies = cookieNames.filter(
    (name) =>
      name.includes("next-auth") ||
      name.includes("authjs") ||
      name.includes("__Secure") ||
      name.includes("__Host")
  );

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV ?? "(not set)",
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT ?? "(not set)",
        RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN ?? "(not set)",
      },
      authConfig: {
        nextAuthUrl: config.nextAuthUrl,
        useSecureCookies,
        trustHost: config.trustHost,
        secretIsSet: !!config.nextAuthSecret,
        secretLength: config.nextAuthSecret?.length ?? 0,
        googleClientIdIsSet: !!config.googleClientId,
        googleClientSecretIsSet: !!config.googleClientSecret,
        enableDevUser: config.enableDevUser,
      },
      request: {
        url: request.url,
        host: request.headers.get("host"),
        xForwardedHost: request.headers.get("x-forwarded-host"),
        xForwardedProto: request.headers.get("x-forwarded-proto"),
        xForwardedFor: request.headers.get("x-forwarded-for"),
        origin: request.headers.get("origin"),
        referer: request.headers.get("referer"),
        protocol: requestUrl.protocol,
        hostname: requestUrl.hostname,
      },
      cookies: {
        totalCount: cookieNames.length,
        allNames: cookieNames,
        pkceCookies,
        authCookies,
      },
      diagnosis: {
        protocolMismatch:
          useSecureCookies && requestUrl.protocol === "http:"
            ? "⚠️  useSecureCookies is TRUE but this request arrived over HTTP. " +
              "Secure cookies won't be sent over HTTP. Check NEXTAUTH_URL or your reverse proxy."
            : "✅ Protocol consistent",
        hostMismatch:
          request.headers.get("host") !== new URL(config.nextAuthUrl).host
            ? `⚠️  Request Host header (${request.headers.get("host")}) does not match NEXTAUTH_URL host (${new URL(config.nextAuthUrl).host}). This can cause cookie domain issues.`
            : "✅ Host matches NEXTAUTH_URL",
        secretCheck: !config.nextAuthSecret
          ? "❌ NEXTAUTH_SECRET is NOT set — cookies cannot be encrypted/decrypted"
          : config.nextAuthSecret.length < 32
            ? "⚠️  NEXTAUTH_SECRET is short (< 32 chars). Recommended: 32+ chars."
            : "✅ NEXTAUTH_SECRET looks good",
        noPkceCookies:
          pkceCookies.length === 0 && authCookies.length === 0
            ? "⚠️  No PKCE or auth cookies found in this request. " +
              "If cookies were set during sign-in, they may be getting dropped by the browser " +
              "(wrong domain, Secure flag on HTTP, SameSite issues)."
            : `✅ Found ${pkceCookies.length} PKCE cookie(s) and ${authCookies.length} auth cookie(s)`,
      },
    },
    { status: 200 }
  );
}
