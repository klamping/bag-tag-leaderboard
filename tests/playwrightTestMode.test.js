const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PLAYWRIGHT_TEST_SECRET_HEADER,
  isPlaywrightTestModeEnabled,
  isValidPlaywrightTestRequest,
  resolvePlaywrightFixtureForLeaderboardUrl,
} = require("../lib/e2e/testMode.js");

test("resolvePlaywrightFixtureForLeaderboardUrl returns admin scoreboard fixture when test mode is enabled", () => {
  const fixture = resolvePlaywrightFixtureForLeaderboardUrl({
    leaderboardUrl: "https://udisc.com/events/admin-scoreboard-spring-fling/leaderboard",
    env: {
      PLAYWRIGHT_TEST_MODE: "true",
    },
  });

  assert.deepEqual(fixture, {
    name: "Admin Scoreboard Spring Fling",
    date: "2026-04-18",
    slug: "admin-scoreboard-spring-fling",
    isMajor: false,
    participants: [
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 1 },
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 2 },
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 3 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 4 },
    ],
    playerIdByName: {
      "Alice Example": "p1",
      "Bob Example": "p2",
      "Casey Example": "p3",
      "Dana Example": "p4",
    },
    startingTagByName: {},
  });
});

test("resolvePlaywrightFixtureForLeaderboardUrl returns null when test mode is disabled", () => {
  const fixture = resolvePlaywrightFixtureForLeaderboardUrl({
    leaderboardUrl: "https://udisc.com/events/admin-scoreboard-spring-fling/leaderboard",
    env: {
      PLAYWRIGHT_TEST_MODE: "false",
    },
  });

  assert.equal(fixture, null);
});

test("resolvePlaywrightFixtureForLeaderboardUrl matches valid leaderboard url variants to the same fixture", () => {
  const fixture = resolvePlaywrightFixtureForLeaderboardUrl({
    leaderboardUrl: "https://www.udisc.com/events/admin-scoreboard-spring-fling/leaderboard/?round=final",
    env: {
      PLAYWRIGHT_TEST_MODE: "true",
    },
  });

  assert.deepEqual(fixture, {
    name: "Admin Scoreboard Spring Fling",
    date: "2026-04-18",
    slug: "admin-scoreboard-spring-fling",
    isMajor: false,
    participants: [
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 1 },
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 2 },
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 3 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 4 },
    ],
    playerIdByName: {
      "Alice Example": "p1",
      "Bob Example": "p2",
      "Casey Example": "p3",
      "Dana Example": "p4",
    },
    startingTagByName: {},
  });
});

test("isPlaywrightTestModeEnabled only enables explicit true flag", () => {
  assert.equal(isPlaywrightTestModeEnabled({ env: { PLAYWRIGHT_TEST_MODE: "true" } }), true);
  assert.equal(isPlaywrightTestModeEnabled({ env: { PLAYWRIGHT_TEST_MODE: "1" } }), false);
  assert.equal(isPlaywrightTestModeEnabled({ env: {} }), false);
});

test("isValidPlaywrightTestRequest requires the configured secret header", () => {
  const headers = new Headers({
    [PLAYWRIGHT_TEST_SECRET_HEADER]: "playwright-reset-secret",
  });

  assert.equal(
    isValidPlaywrightTestRequest({
      headers,
      env: {
        PLAYWRIGHT_TEST_MODE: "true",
        PLAYWRIGHT_TEST_SECRET: "playwright-reset-secret",
      },
    }),
    true
  );

  assert.equal(
    isValidPlaywrightTestRequest({
      headers: new Headers(),
      env: {
        PLAYWRIGHT_TEST_MODE: "true",
        PLAYWRIGHT_TEST_SECRET: "playwright-reset-secret",
      },
    }),
    false
  );

  assert.equal(
    isValidPlaywrightTestRequest({
      headers,
      env: {
        PLAYWRIGHT_TEST_MODE: "true",
        PLAYWRIGHT_TEST_SECRET: "different-secret",
      },
    }),
    false
  );
});

test("isValidPlaywrightTestRequest requires Playwright test mode to be enabled", () => {
  const headers = new Headers({
    [PLAYWRIGHT_TEST_SECRET_HEADER]: "playwright-reset-secret",
  });

  assert.equal(
    isValidPlaywrightTestRequest({
      headers,
      env: {
        PLAYWRIGHT_TEST_MODE: "false",
        PLAYWRIGHT_TEST_SECRET: "playwright-reset-secret",
      },
    }),
    false
  );
});
