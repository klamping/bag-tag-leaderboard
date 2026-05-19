const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEMO_FIXTURE_EVENTS,
  scoreDemoSeason,
} = require("../lib/demoLeaderboard");

test("scenario fixtures include initial, between, major, after-major, and normal events", () => {
  assert.equal(DEMO_FIXTURE_EVENTS.length, 5);
  assert.equal(DEMO_FIXTURE_EVENTS[0].label, "initial-no-tags");
  assert.equal(DEMO_FIXTURE_EVENTS[1].label, "post-initial-weekly");
  assert.equal(DEMO_FIXTURE_EVENTS[2].label, "major-doubled");
  assert.equal(DEMO_FIXTURE_EVENTS[3].label, "post-major-weekly");
  assert.equal(DEMO_FIXTURE_EVENTS[4].label, "normal-mixed-participation");
  assert.equal(DEMO_FIXTURE_EVENTS[0].isMajor, false);
  assert.equal(DEMO_FIXTURE_EVENTS[1].isMajor, false);
  assert.equal(DEMO_FIXTURE_EVENTS[2].isMajor, true);
  assert.equal(DEMO_FIXTURE_EVENTS[3].isMajor, false);
  assert.equal(DEMO_FIXTURE_EVENTS[4].isMajor, false);
});

test("regression: per-event outputs map exactly to scored fixture breakdowns", () => {
  const scored = scoreDemoSeason();

  assert.deepEqual(scored.scoredEvents[0].rows.map((row) => row.eventTotal), [10, 8, 7, 6, 3, 3, 2]);
  assert.deepEqual(scored.scoredEvents[1].rows.map((row) => row.eventTotal), [14, 16, 10, 11, 5, 4, 2]);
  assert.deepEqual(scored.scoredEvents[2].rows.map((row) => row.eventTotal), [30, 30, 26, 20, 10, 8, 4]);
  assert.deepEqual(scored.scoredEvents[3].rows.map((row) => row.eventTotal), [18, 13, 11, 9, 5, 4, 2]);
  assert.deepEqual(scored.scoredEvents[4].rows.map((row) => row.eventTotal), [18, 14, 11, 10, 11, 4, 3, 2]);
});

test("regression: season aggregate rows are derived from fixture scoring", () => {
  const scored = scoreDemoSeason();

  assert.deepEqual(scored.leaderboardRows, [
    { playerId: "p2", playerName: "Blair", eventsPlayed: 5, seasonPoints: 83 },
    { playerId: "p1", playerName: "Alex", eventsPlayed: 5, seasonPoints: 81 },
    { playerId: "p3", playerName: "Casey", eventsPlayed: 5, seasonPoints: 72 },
    { playerId: "p4", playerName: "Devon", eventsPlayed: 5, seasonPoints: 56 },
    { playerId: "p5", playerName: "Elliot", eventsPlayed: 5, seasonPoints: 34 },
    { playerId: "p6", playerName: "Frankie", eventsPlayed: 4, seasonPoints: 19 },
    { playerId: "p7", playerName: "Gray", eventsPlayed: 4, seasonPoints: 10 },
    { playerId: "p8", playerName: "Harper", eventsPlayed: 1, seasonPoints: 4 },
    { playerId: "p9", playerName: "Indy", eventsPlayed: 1, seasonPoints: 3 },
    { playerId: "p10", playerName: "Jules", eventsPlayed: 1, seasonPoints: 2 },
  ]);
});
