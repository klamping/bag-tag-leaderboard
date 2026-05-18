const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEMO_FIXTURE_EVENTS,
  scoreDemoSeason,
} = require("../lib/demoLeaderboard");

test("scenario fixtures include initial-no-tags, major-doubled, and normal mixed participation", () => {
  assert.equal(DEMO_FIXTURE_EVENTS.length, 3);
  assert.equal(DEMO_FIXTURE_EVENTS[0].label, "initial-no-tags");
  assert.equal(DEMO_FIXTURE_EVENTS[1].label, "major-doubled");
  assert.equal(DEMO_FIXTURE_EVENTS[2].label, "normal-mixed-participation");
  assert.equal(DEMO_FIXTURE_EVENTS[0].isMajor, false);
  assert.equal(DEMO_FIXTURE_EVENTS[1].isMajor, true);
  assert.equal(DEMO_FIXTURE_EVENTS[2].isMajor, false);
});

test("regression: per-event outputs map exactly to scored fixture breakdowns", () => {
  const scored = scoreDemoSeason();

  assert.deepEqual(scored.scoredEvents[0].rows.map((row) => row.eventTotal), [12, 10, 9, 8, 5, 5, 4]);
  assert.deepEqual(scored.scoredEvents[1].rows.map((row) => row.eventTotal), [30, 30, 26, 20, 10, 8, 4]);
  assert.deepEqual(scored.scoredEvents[2].rows.map((row) => row.eventTotal), [17, 15, 13, 10, 11, 4, 3, 2]);
});

test("regression: season aggregate rows are derived from fixture scoring", () => {
  const scored = scoreDemoSeason();

  assert.deepEqual(scored.leaderboardRows, [
    { playerId: "p1", playerName: "Alex", eventsPlayed: 3, seasonPoints: 57 },
    { playerId: "p2", playerName: "Blair", eventsPlayed: 3, seasonPoints: 53 },
    { playerId: "p3", playerName: "Casey", eventsPlayed: 3, seasonPoints: 52 },
    { playerId: "p4", playerName: "Devon", eventsPlayed: 3, seasonPoints: 38 },
    { playerId: "p5", playerName: "Elliot", eventsPlayed: 3, seasonPoints: 26 },
    { playerId: "p6", playerName: "Frankie", eventsPlayed: 2, seasonPoints: 13 },
    { playerId: "p7", playerName: "Gray", eventsPlayed: 2, seasonPoints: 8 },
    { playerId: "p8", playerName: "Harper", eventsPlayed: 1, seasonPoints: 4 },
    { playerId: "p9", playerName: "Indy", eventsPlayed: 1, seasonPoints: 3 },
    { playerId: "p10", playerName: "Jules", eventsPlayed: 1, seasonPoints: 2 },
  ]);
});
