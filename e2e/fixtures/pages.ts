/**
 * Authenticated page fixtures: alicePage, bobPage, carolPage.
 * Each creates the user in the test DB, mints a JWT cookie, and returns a Page with that session.
 */

import type { Browser, Page } from "@playwright/test";
import { config } from "dotenv";
import type postgres from "postgres";
import { createTestUser, mintSessionCookie, ALICE, BOB, CAROL } from "../helpers/test-users";
import { testDbFixture } from "./db";

config({ path: ".env.test" });

type AuthenticatedPageFixtures = {
  alicePage: Page;
  bobPage: Page;
  carolPage: Page;
};

async function createAuthenticatedPage(
  sql: postgres.Sql,
  userDef: typeof ALICE,
  browser: Browser,
  baseURL: string | undefined,
): Promise<Page> {
  const user = await createTestUser(sql, userDef);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("[e2e] NEXTAUTH_SECRET not set. Use .env.test.");
  const cookie = await mintSessionCookie(user, secret);
  const context = await browser.newContext({ baseURL: baseURL ?? undefined });
  const domain = baseURL ? new URL(baseURL).hostname : "localhost";
  await context.addCookies([
    { name: cookie.name, value: cookie.value, domain, path: "/" },
  ]);
  const page = await context.newPage();
  return page;
}

/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture `use()` is not a React hook */
export const testWithPages = testDbFixture.extend<AuthenticatedPageFixtures>({
  alicePage: async ({ sql, browser, baseURL }, use) => {
    const page = await createAuthenticatedPage(sql, ALICE, browser, baseURL);
    await use(page);
    await page.context().close();
  },

  bobPage: async ({ sql, browser, baseURL }, use) => {
    const page = await createAuthenticatedPage(sql, BOB, browser, baseURL);
    await use(page);
    await page.context().close();
  },

  carolPage: async ({ sql, browser, baseURL }, use) => {
    const page = await createAuthenticatedPage(sql, CAROL, browser, baseURL);
    await use(page);
    await page.context().close();
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect } from "@playwright/test";
