import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Serves any JSON file from src/data/ as a data asset.
 *
 * To add a new data file, just drop a .json file into src/data/.
 * It's automatically available at /assets/data/{filename}.json (via rewrite).
 *
 * Example: src/data/glossary.json → /assets/data/glossary.json
 */

const DATA_DIR = path.join(process.cwd(), "src/data");

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
} as const;

interface CachedDataAsset {
  data: unknown;
  mtimeMs: number;
}

/** In-memory cache that automatically invalidates when a file changes on disk. */
const dataCache = new Map<string, CachedDataAsset>();

function loadDataAsset(id: string): unknown | null {
  const filePath = path.join(DATA_DIR, `${id}.json`);

  // Prevent path traversal (e.g. ../../etc/passwd)
  if (!filePath.startsWith(DATA_DIR + path.sep)) {
    return null;
  }

  try {
    const stats = fs.statSync(filePath);
    const cached = dataCache.get(id);

    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.data;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data: unknown = JSON.parse(raw);
    dataCache.set(id, { data, mtimeMs: stats.mtimeMs });
    return data;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Strip .json extension if present (supports both /api/assets/data/flavor-wheel and /api/assets/data/flavor-wheel.json)
  const idWithoutExtension = id.endsWith(".json") ? id.slice(0, -5) : id;
  const data = loadDataAsset(idWithoutExtension);

  if (!data) {
    return NextResponse.json(
      { error: `Unknown data asset: ${idWithoutExtension}` },
      { status: 404 }
    );
  }

  return NextResponse.json(data, { headers: CACHE_HEADERS });
}
