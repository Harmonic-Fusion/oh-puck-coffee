import { readFileSync } from "fs";
import * as z from "zod";

const DEFAULT_FILES = [".env.local", ".env"];

/**
 * Parse one or more `.env` files and return the key-value pairs.
 * Does NOT mutate `process.env`.
 *
 * Files are read in order; the first file to define a key wins
 * (matching the existing precedence where `.env.local` overrides `.env`).
 */
export function readDotEnv(files: string[] = DEFAULT_FILES): Record<string, string> {
  const result: Record<string, string> = {};

  for (const file of files) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        // First file wins — don't overwrite
        if (!(key in result)) result[key] = val;
      }
    } catch {
      // file not found, skip
    }
  }

  return result;
}

/**
 * Load dot-env values into `process.env`.
 * Existing env vars are NOT overwritten (same semantics as the inline pattern).
 *
 * Convenience wrapper around `readDotEnv` for scripts that read
 * `process.env` directly throughout their code.
 */
export function loadDotEnv(files?: string[]): void {
  for (const [key, val] of Object.entries(readDotEnv(files))) {
    if (!process.env[key]) process.env[key] = val;
  }
}

/**
 * Read dot-env files, merge with `process.env`, validate against a Zod schema,
 * and return the typed result.
 *
 * `process.env` values take precedence over dot-env file values (matching the
 * existing behaviour where already-set env vars are not overwritten).
 *
 * Throws on validation failure with a clear error listing missing/invalid keys.
 */
export function readEnv<T extends z.ZodType>(schema: T, files?: string[]): z.infer<T> {
  const dotEnv = readDotEnv(files);
  // Merge: process.env wins over dot-env values
  const merged: Record<string, string | undefined> = { ...dotEnv, ...process.env };

  const result = schema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`[readEnv] Environment validation failed:\n${issues}`);
  }

  return result.data as z.infer<T>;
}

/**
 * Read dot-env files and return `DATABASE_URL`.
 * Throws if the variable is missing or empty.
 */
export function readEnvDatabaseUrl(files?: string[]): string {
  return readEnv(z.object({ DATABASE_URL: z.string().min(1, "DATABASE_URL is required") }), files)
    .DATABASE_URL;
}
