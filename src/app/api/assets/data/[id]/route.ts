import { NextResponse } from "next/server";

/**
 * Registry of serveable JSON data assets.
 *
 * To add a new data file:
 *   1. Import the JSON at the top of this file.
 *   2. Add an entry to DATA_REGISTRY mapping the ID to the imported data.
 *   3. The file is now available at /assets/data/{id}.json (via rewrite).
 */
import glossaryData from "@/app/(landing)/blog/glossary/glossary.json";

const DATA_REGISTRY: Record<string, unknown> = {
  glossary: glossaryData,
};

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = DATA_REGISTRY[id];

  if (!data) {
    return NextResponse.json(
      { error: `Unknown data asset: ${id}` },
      { status: 404 }
    );
  }

  return NextResponse.json(data, { headers: CACHE_HEADERS });
}
