/**
 * E2E: /log?beanId=… pre-populates the shot form bean (and survives lastShot overwrite).
 */
import { test, expect } from "../fixtures";
import { ALICE } from "../helpers/test-users";

test.describe("Log page beanId query", () => {
  test("pre-populates bean from beanId after URL is cleared (not last shot bean)", async ({
    alicePage,
    sql,
  }) => {
    const [beanFromUrl] = await sql`
      INSERT INTO beans (name, roast_level, created_by)
      VALUES ('E2E Bean From URL', 'medium', ${ALICE.id})
      RETURNING id
    `;
    const [beanLastShot] = await sql`
      INSERT INTO beans (name, roast_level, created_by)
      VALUES ('E2E Bean From Last Shot', 'medium', ${ALICE.id})
      RETURNING id
    `;
    await sql`
      INSERT INTO beans_share (id, bean_id, user_id, invited_by, status, shot_history_access, reshare_allowed)
      VALUES ('e2e-bs-url', ${beanFromUrl.id}, ${ALICE.id}, null, 'owner', 'restricted', true)
    `;
    await sql`
      INSERT INTO beans_share (id, bean_id, user_id, invited_by, status, shot_history_access, reshare_allowed)
      VALUES ('e2e-bs-last', ${beanLastShot.id}, ${ALICE.id}, null, 'owner', 'restricted', true)
    `;

    await sql`
      INSERT INTO shots (id, user_id, bean_id)
      VALUES ('e2e-last-shot-row', ${ALICE.id}, ${beanLastShot.id})
    `;

    await alicePage.goto(`/log?beanId=${beanFromUrl.id}`);

    await expect(alicePage).toHaveURL(/\/log$/);
    await expect(alicePage.getByText("E2E Bean From URL")).toBeVisible();
    await expect(alicePage.getByText("E2E Bean From Last Shot")).toHaveCount(0);
  });
});
