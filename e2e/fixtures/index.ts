/**
 * E2E fixtures: testDb (sql) + alicePage, bobPage, carolPage.
 * Import { test, expect } from '../fixtures' in specs.
 */

import { testWithPages } from "./pages";

export const test = testWithPages;
export { expect } from "@playwright/test";
