/**
 * Dev user constants used by both the Edge middleware (JWT minting)
 * and the Node runtime (DB upsert in auth.ts).
 *
 * This module is intentionally free of DB / Node-only imports so it
 * can be safely imported from middleware (Edge Runtime).
 */

/** Deterministic UUID so all FK references are stable across restarts. */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";
export const DEV_USER_EMAIL = "kevin@coffee.local";
export const DEV_USER_NAME = "Kevin";
