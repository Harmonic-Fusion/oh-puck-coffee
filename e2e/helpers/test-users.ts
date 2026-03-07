/**
 * Create test users in the DB and mint Auth.js session cookies for Playwright.
 */

import type { Sql } from "postgres";

import { Entitlements } from "@/shared/entitlements";

export type TestUserRole = "member" | "admin" | "super-admin";

export interface TestUserDef {
  id: string;
  name: string;
  email: string;
  role: TestUserRole;
  entitlements?: string[];
}

export interface TestUser extends TestUserDef {
  id: string;
  name: string;
  email: string;
  role: TestUserRole;
  entitlements: string[];
}

const COOKIE_NAME = "authjs.session-token";

/**
 * Inserts a user and optional user_entitlements rows. Use the same postgres client
 * connected to the test database (e2e).
 */
export async function createTestUser(
  sql: Sql,
  def: TestUserDef,
): Promise<TestUser> {
  await sql`
    INSERT INTO users (id, name, email, role)
    VALUES (${def.id}, ${def.name}, ${def.email}, ${def.role})
    ON CONFLICT (id) DO UPDATE SET name = ${def.name}, email = ${def.email}, role = ${def.role}
  `;

  const entitlements = def.entitlements ?? [];

  for (const key of entitlements) {
    await sql`
      INSERT INTO user_entitlements (user_id, lookup_key)
      VALUES (${def.id}, ${key})
      ON CONFLICT (user_id, lookup_key) DO NOTHING
    `;
  }

  return {
    id: def.id,
    name: def.name,
    email: def.email,
    role: def.role,
    entitlements,
  };
}

/**
 * Mints an Auth.js JWT and returns the cookie name/value for Playwright.
 * Token shape must match what the app's session callback expects (id, role, entitlements, subType).
 */
export async function mintSessionCookie(
  user: TestUser,
  secret: string,
): Promise<{ name: string; value: string }> {
  const { encode } = await import("next-auth/jwt");
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      entitlements: user.entitlements.length > 0 ? user.entitlements : undefined,
      subType: user.entitlements.includes(Entitlements.NO_SHOT_VIEW_LIMIT)
        ? "pro"
        : "free",
    },
    secret,
    salt: COOKIE_NAME,
  });

  return { name: COOKIE_NAME, value: token };
}

/** Predefined Alice: creator, has bean-share. */
export const ALICE: TestUserDef = {
  id: "00000000-0000-4000-a000-000000000001",
  name: "Alice",
  email: "alice@e2e.local",
  role: "member",
  entitlements: [Entitlements.BEAN_SHARE],
};

/** Predefined Bob: receiver, has bean-share. */
export const BOB: TestUserDef = {
  id: "00000000-0000-4000-a000-000000000002",
  name: "Bob",
  email: "bob@e2e.local",
  role: "member",
  entitlements: [Entitlements.BEAN_SHARE],
};

/** Predefined Carol: visitor, no entitlements. */
export const CAROL: TestUserDef = {
  id: "00000000-0000-4000-a000-000000000003",
  name: "Carol",
  email: "carol@e2e.local",
  role: "member",
  entitlements: [],
};
