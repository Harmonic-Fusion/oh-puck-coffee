import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const swPath = join(process.cwd(), "public", "sw.js");

export async function GET() {
  try {
    const swContent = readFileSync(swPath, "utf-8");
    return new NextResponse(swContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Service-Worker-Allowed": "/",
      },
    });
  } catch (error) {
    console.error("[SW] Failed to read service worker file:", error);
    return new NextResponse("Service Worker not found", { status: 404 });
  }
}
