/**
 * Dev user constants used by both the Edge middleware (JWT minting)
 * and the Node runtime (DB upsert in auth.ts).
 *
 * This module is intentionally free of DB / Node-only imports so it
 * can be safely imported from middleware (Edge Runtime).
 */

/** Fixed id in nanoid format (u_ prefix) so all FK references are stable across restarts. */
export const DEV_USER_ID = "u_dev0000000000000000000";
export const DEV_USER_EMAIL = "kevin@coffee.local";
export const DEV_USER_NAME = "Kevin";
