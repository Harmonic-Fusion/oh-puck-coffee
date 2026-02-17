import { randomBytes } from "crypto";

/**
 * Generate a URL-safe short unique ID.
 * Uses crypto.randomBytes for secure randomness, then encodes to base64url.
 * 8 bytes → 11 characters of base64url (≈ 2^64 possible values).
 */
export function generateShortUid(bytes = 8): string {
  return randomBytes(bytes)
    .toString("base64url")
    .slice(0, bytes + 3); // 8 bytes → 11 chars
}
