const { expect } = require("@playwright/test");
const { getAdminScoreboardSeasonFixture } = require("../../lib/e2e/adminScoreboardSeason.js");

const PLAYWRIGHT_ADMIN_SECRET = "playwright-admin-secret";
const PLAYWRIGHT_RESET_SECRET = "playwright-reset-secret";
const PLAYWRIGHT_RESET_SECRET_HEADER = "x-playwright-test-secret";

function getFixtureLeaderboardUrl(slug) {
  return `https://udisc.com/events/${slug}/leaderboard`;
}

function getEventScoreboardCell({ page, rowId, cell }) {
  return page.getByTestId(`event-scoreboard-${cell}-${rowId}`);
}

function getLeaderboardCell({ page, rowId, cell }) {
  return page.getByTestId(`leaderboard-${cell}-${rowId}`);
}

async function resetApplicationState({ request }) {
  const response = await request.post("/api/test/reset", {
    headers: {
      [PLAYWRIGHT_RESET_SECRET_HEADER]: PLAYWRIGHT_RESET_SECRET,
    },
  });

  expect(response.ok()).toBe(true);
}

async function loginAsAdmin({ page }) {
  await page.goto("/admin/login");
  await page.getByLabel("Shared secret").fill(PLAYWRIGHT_ADMIN_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/events\/new$/);
}

async function fillMatchedPlayerStartingTags({ page, fixture }) {
  for (const [index, participant] of fixture.participants.entries()) {
    const startingTag = fixture.startingTagByName?.[participant.playerName];
    if (!Number.isInteger(startingTag)) {
      continue;
    }

    await page.getByTestId(`participant-review-starting-tag-${index}`).fill(String(startingTag));
  }
}

async function importFixtureEvent({ page, leaderboardUrl }) {
  const fixture = getAdminScoreboardSeasonFixture(leaderboardUrl);
  if (!fixture) {
    throw new Error(`Missing admin scoreboard fixture for ${leaderboardUrl}`);
  }

  await page.getByLabel("UDisc Leaderboard URL").fill(leaderboardUrl);
  await page.getByRole("button", { name: "Fetch UDisc Preview" }).click();
  await expect(page.getByRole("heading", { name: "Preview Event" })).toBeVisible();
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible();

  await fillMatchedPlayerStartingTags({ page, fixture });
  await page.getByRole("button", { name: "Review Imported Players" }).click();
  await expect(page.getByTestId("confirm-import-form")).toBeVisible();

  await page.getByRole("button", { name: "Confirm Import" }).click();
  await expect(page.getByText(`Imported event confirmed. ${fixture.slug}`, { exact: true })).toBeVisible();
}

async function expectEventScoreboardRow({ page, rowId, playerName, ...expectedCells }) {
  const row = page.getByTestId(`event-scoreboard-row-${rowId}`);

  await expect(row).toBeVisible();
  await expect(getEventScoreboardCell({ page, rowId, cell: "player" })).toHaveText(playerName);
  await expect(getEventScoreboardCell({ page, rowId, cell: "starting-tag" })).toHaveText(String(expectedCells.startingTag));
  await expect(getEventScoreboardCell({ page, rowId, cell: "attendance" })).toHaveText(String(expectedCells.attendance));
  await expect(getEventScoreboardCell({ page, rowId, cell: "event-result" })).toHaveText(String(expectedCells.eventResult));
  await expect(getEventScoreboardCell({ page, rowId, cell: "placement" })).toHaveText(String(expectedCells.placement));
  await expect(getEventScoreboardCell({ page, rowId, cell: "starting-tag-bonus" })).toHaveText(String(expectedCells.startingTagBonus));
  await expect(getEventScoreboardCell({ page, rowId, cell: "tag-one-bonus" })).toHaveText(String(expectedCells.tagOneBonus));
  await expect(getEventScoreboardCell({ page, rowId, cell: "beat-your-tag-bonus" })).toHaveText(String(expectedCells.beatYourTagBonus));
  await expect(getEventScoreboardCell({ page, rowId, cell: "total" })).toHaveText(String(expectedCells.eventTotal));
}

async function expectLeaderboardRow({ page, rowId, playerName, rank, eventsPlayed, seasonPoints }) {
  const row = page.getByTestId(`leaderboard-row-${rowId}`);

  await expect(row).toBeVisible();
  await expect(getLeaderboardCell({ page, rowId, cell: "rank" })).toHaveText(String(rank));
  await expect(getLeaderboardCell({ page, rowId, cell: "player" })).toHaveText(playerName);
  await expect(getLeaderboardCell({ page, rowId, cell: "events-played" })).toHaveText(String(eventsPlayed));
  await expect(getLeaderboardCell({ page, rowId, cell: "season-points" })).toHaveText(String(seasonPoints));
}

module.exports = {
  expectEventScoreboardRow,
  expectLeaderboardRow,
  fillMatchedPlayerStartingTags,
  getFixtureLeaderboardUrl,
  importFixtureEvent,
  loginAsAdmin,
  resetApplicationState,
};
