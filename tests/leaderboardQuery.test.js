const test = require("node:test");
const assert = require("node:assert/strict");

const {
  LEADERBOARD_SEASON,
  getSeasonLeaderboardRows,
} = require("../lib/leaderboardQuery");

test("scopes leaderboard to season 2026 only", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
    ],
    events: [
      { id: "e-2026", season: 2026, confirmed: true },
      { id: "e-2025", season: 2025, confirmed: true },
    ],
    eventResults: [
      { id: "r1", eventId: "e-2026", playerId: "p1" },
      { id: "r2", eventId: "e-2025", playerId: "p1" },
      { id: "r3", eventId: "e-2025", playerId: "p2" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 8 },
      { eventResultId: "r2", points: 99 },
      { eventResultId: "r3", points: 42 },
    ],
  });

  assert.deepEqual(rows, [
    {
      playerId: "p1",
      playerName: "Ada",
      eventsPlayed: 1,
      seasonPoints: 8,
    },
  ]);
});

test("includes only confirmed events in season 2026 totals", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
    ],
    events: [
      { id: "e-confirmed", season: LEADERBOARD_SEASON, confirmed: true },
      { id: "e-unconfirmed", season: LEADERBOARD_SEASON, confirmed: false },
    ],
    eventResults: [
      { id: "r1", eventId: "e-confirmed", playerId: "p1" },
      { id: "r2", eventId: "e-unconfirmed", playerId: "p1" },
      { id: "r3", eventId: "e-confirmed", playerId: "p2" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 10 },
      { eventResultId: "r2", points: 50 },
      { eventResultId: "r3", points: 6 },
    ],
  });

  assert.deepEqual(rows, [
    {
      playerId: "p1",
      playerName: "Ada",
      eventsPlayed: 1,
      seasonPoints: 10,
    },
    {
      playerId: "p2",
      playerName: "Bert",
      eventsPlayed: 1,
      seasonPoints: 6,
    },
  ]);
});

test("returns deterministic ordering for tied points", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
      { id: "p3", name: "Cara" },
    ],
    events: [{ id: "e1", season: LEADERBOARD_SEASON, confirmed: true }],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p2" },
      { id: "r2", eventId: "e1", playerId: "p1" },
      { id: "r3", eventId: "e1", playerId: "p3" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 8 },
      { eventResultId: "r2", points: 8 },
      { eventResultId: "r3", points: 4 },
    ],
  });

  assert.deepEqual(rows.map((row) => row.playerId), ["p1", "p2", "p3"]);
});
