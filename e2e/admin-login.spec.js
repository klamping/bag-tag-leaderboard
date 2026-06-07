const { test, expect } = require("@playwright/test");
const { loginAsAdmin, resetApplicationState } = require("./helpers/adminScoreboard.js");

test.beforeEach(async ({ page, request }) => {
  await resetApplicationState({ request });
  await page.context().clearCookies();
});

test("admin login reaches the new event page", async ({ page }) => {
  await loginAsAdmin({ page });

  await expect(page.getByRole("heading", { name: "Create Event Draft" })).toBeVisible();
});
