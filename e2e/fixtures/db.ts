/**
 * testDb fixture: provides a postgres client connected to coffee_test.
 * Truncates domain tables after each test.
 */

import { test as base } from "@playwright/test";
import postgres from "postgres";
import { config } from "dotenv";
import { getTestDbUrlFromEnv, truncateTables } from "../helpers/test-db";

config({ path: ".env.test" });

export type TestDbFixtures = {
  sql: postgres.Sql;
};

/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture `use()` is not a React hook */
export const testDbFixture = base.extend<TestDbFixtures>({
  sql: async ({}, use) => {
    const url = getTestDbUrlFromEnv();
    const client = postgres(url, { max: 2 });
    await use(client);
    await truncateTables(url);
    await client.end();
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect } from "@playwright/test";
