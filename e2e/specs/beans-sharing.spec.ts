/**
 * E2E tests for beans sharing: general access, share dialog, public page.
 * Uses fixtures: alicePage (creator), bobPage (receiver), carolPage (visitor), sql (test DB).
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { test, expect } from "../fixtures";
import { ALICE } from "../helpers/test-users";

test.describe("Beans sharing", () => {
  test("Alice creates a bean and share dialog shows default Restricted", async ({
    alicePage,
    sql,
  }) => {
    const [bean] = await sql`
      INSERT INTO beans (name, roast_level, created_by)
      VALUES ('E2E Test Bean', 'medium', ${ALICE.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO user_beans (bean_id, user_id)
      VALUES (${bean.id}, ${ALICE.id})
    `;

    await alicePage.goto(`/beans/${bean.id}`);
    await alicePage.getByRole("button", { name: /share/i }).click();
    await expect(alicePage.getByRole("dialog")).toBeVisible();
    await expect(alicePage.getByRole("combobox")).toHaveValue("restricted");
  });

  test("Anyone with the link: Bob can open share link and see bean", async ({
    alicePage,
    bobPage,
    sql,
  }) => {
    await import("../helpers/test-users");
    const [bean] = await sql`
      INSERT INTO beans (name, roast_level, created_by, general_access, share_slug)
      VALUES ('E2E Link Bean', 'medium', ${ALICE.id}, 'anyone_with_link', 'e2e-link-slug-1')
      RETURNING id
    `;
    await sql`
      INSERT INTO user_beans (bean_id, user_id)
      VALUES (${bean.id}, ${ALICE.id})
    `;

    await bobPage.goto("/share/beans/e2e-link-slug-1");
    await expect(bobPage.getByText("E2E Link Bean")).toBeVisible();
  });

  test("Public bean: guest sees bean metadata and login CTA", async ({
    page,
    alicePage,
    sql,
  }) => {
    const [bean] = await sql`
      INSERT INTO beans (name, roast_level, created_by, general_access, share_slug)
      VALUES ('E2E Public Bean', 'medium', ${ALICE.id}, 'public', 'e2e-public-slug-1')
      RETURNING id
    `;
    await sql`
      INSERT INTO user_beans (bean_id, user_id)
      VALUES (${bean.id}, ${ALICE.id})
    `;

    await page.goto("/share/beans/e2e-public-slug-1");
    await expect(page.getByText("E2E Public Bean")).toBeVisible();
    await expect(page.getByRole("link", { name: /log in|sign in|login/i })).toBeVisible();
  });
});
