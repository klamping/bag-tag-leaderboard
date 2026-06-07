const { test, expect } = require("@playwright/test");
const {
  expectEventScoreboardRow,
  expectLeaderboardRow,
  getFixtureLeaderboardUrl,
  importFixtureEvent,
  loginAsAdmin,
  resetApplicationState,
} = require("./helpers/adminScoreboard.js");

const SEASON_FIXTURE_SLUGS = [
  "admin-scoreboard-spring-fling",
  "admin-scoreboard-summer-sizzler",
  "admin-scoreboard-autumn-classic",
  "admin-scoreboard-finale",
];

test.beforeEach(async ({ page, request }) => {
  await resetApplicationState({ request });
  await page.context().clearCookies();
});

test("admin can import the four-event season and publish the public scoreboards", async ({ page }) => {
  await loginAsAdmin({ page });

  for (const slug of SEASON_FIXTURE_SLUGS) {
    await importFixtureEvent({
      page,
      leaderboardUrl: getFixtureLeaderboardUrl(slug),
    });
  }

  await page.goto("/events/admin-scoreboard-finale");
  await expect(page.getByRole("heading", { name: "Admin Scoreboard Finale" })).toBeVisible();
  await expectEventScoreboardRow({
    page,
    rowId: "player_0001",
    playerName: "Alice Example",
    startingTag: 3,
    attendance: 2,
    eventResult: 1,
    placement: 8,
    startingTagBonus: 1,
    tagOneBonus: 0,
    beatYourTagBonus: 1,
    eventTotal: 12,
  });
  await expectEventScoreboardRow({
    page,
    rowId: "player_0003",
    playerName: "Casey Example",
    startingTag: 1,
    attendance: 2,
    eventResult: 3,
    placement: 5,
    startingTagBonus: 3,
    tagOneBonus: 2,
    beatYourTagBonus: 0,
    eventTotal: 12,
  });
  await expectEventScoreboardRow({
    page,
    rowId: "player_0002",
    playerName: "Bob Example",
    startingTag: 4,
    attendance: 2,
    eventResult: 2,
    placement: 6,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 1,
    eventTotal: 9,
  });
  await expectEventScoreboardRow({
    page,
    rowId: "player_0004",
    playerName: "Dana Example",
    startingTag: 2,
    attendance: 2,
    eventResult: 4,
    placement: 4,
    startingTagBonus: 2,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: 8,
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bag Tag Leaderboard" })).toBeVisible();
  await expectLeaderboardRow({
    page,
    rowId: "player_0003",
    playerName: "Casey Example",
    rank: 1,
    eventsPlayed: 4,
    seasonPoints: 42,
  });
  await expectLeaderboardRow({
    page,
    rowId: "player_0001",
    playerName: "Alice Example",
    rank: 2,
    eventsPlayed: 4,
    seasonPoints: 41,
  });
  await expectLeaderboardRow({
    page,
    rowId: "player_0002",
    playerName: "Bob Example",
    rank: 2,
    eventsPlayed: 4,
    seasonPoints: 41,
  });
  await expectLeaderboardRow({
    page,
    rowId: "player_0004",
    playerName: "Dana Example",
    rank: 4,
    eventsPlayed: 4,
    seasonPoints: 32,
  });
});
