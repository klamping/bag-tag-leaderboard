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

test("dedupes duplicate rows for the same event and player", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
    ],
    events: [{ id: "e1", season: LEADERBOARD_SEASON, confirmed: true }],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1" },
      { id: "r1", eventId: "e1", playerId: "p1" },
      { id: "r2", eventId: "e1", playerId: "p2" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 8 },
      { eventResultId: "r2", points: 6 },
    ],
  });

  assert.deepEqual(rows, [
    {
      playerId: "p1",
      playerName: "Ada",
      eventsPlayed: 1,
      seasonPoints: 8,
    },
    {
      playerId: "p2",
      playerName: "Bert",
      eventsPlayed: 1,
      seasonPoints: 6,
    },
  ]);
});

test("duplicate event/player rows pick deterministic winner by smallest result id", () => {
  const sharedInput = {
    players: [{ id: "p1", name: "Ada" }],
    events: [{ id: "e1", season: LEADERBOARD_SEASON, confirmed: true }],
    eventPoints: [
      { eventResultId: "r-a", points: 8 },
      { eventResultId: "r-b", points: 2 },
    ],
  };

  const rowsFromAB = getSeasonLeaderboardRows({
    ...sharedInput,
    eventResults: [
      { id: "r-a", eventId: "e1", playerId: "p1" },
      { id: "r-b", eventId: "e1", playerId: "p1" },
    ],
  });

  const rowsFromBA = getSeasonLeaderboardRows({
    ...sharedInput,
    eventResults: [
      { id: "r-b", eventId: "e1", playerId: "p1" },
      { id: "r-a", eventId: "e1", playerId: "p1" },
    ],
  });

  assert.deepEqual(rowsFromAB, [
    {
      playerId: "p1",
      playerName: "Ada",
      eventsPlayed: 1,
      seasonPoints: 8,
    },
  ]);

  assert.deepEqual(rowsFromBA, rowsFromAB);
});

test("does not falsely dedupe distinct event/player pairs when ids contain colons", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "c", name: "Cara" },
      { id: "b:c", name: "Bea" },
    ],
    events: [
      { id: "a:b", season: LEADERBOARD_SEASON, confirmed: true },
      { id: "a", season: LEADERBOARD_SEASON, confirmed: true },
    ],
    eventResults: [
      { id: "r1", eventId: "a:b", playerId: "c" },
      { id: "r2", eventId: "a", playerId: "b:c" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 8 },
      { eventResultId: "r2", points: 6 },
    ],
  });

  assert.deepEqual(rows, [
    {
      playerId: "c",
      playerName: "Cara",
      eventsPlayed: 1,
      seasonPoints: 8,
    },
    {
      playerId: "b:c",
      playerName: "Bea",
      eventsPlayed: 1,
      seasonPoints: 6,
    },
  ]);
});

test("treats status=confirmed events as confirmed for leaderboard inclusion", () => {
  const rows = getSeasonLeaderboardRows({
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e-status-confirmed",
        season: LEADERBOARD_SEASON,
        status: "confirmed",
      },
      {
        id: "e-status-draft",
        season: LEADERBOARD_SEASON,
        status: "draft",
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e-status-confirmed", playerId: "p1" },
      { id: "r2", eventId: "e-status-draft", playerId: "p1" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 11 },
      { eventResultId: "r2", points: 99 },
    ],
  });

  assert.deepEqual(rows, [
    {
      playerId: "p1",
      playerName: "Ada",
      eventsPlayed: 1,
      seasonPoints: 11,
    },
  ]);
});

test("resolves leaderboard points from points, eventTotal, then event_total_pts", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
      { id: "p3", name: "Cara" },
      { id: "p4", name: "Dion" },
    ],
    events: [{ id: "e1", season: LEADERBOARD_SEASON, confirmed: true }],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1" },
      { id: "r2", eventId: "e1", playerId: "p2" },
      { id: "r3", eventId: "e1", playerId: "p3" },
      { id: "r4", eventId: "e1", playerId: "p4" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 9, eventTotal: 99, event_total_pts: 999 },
      { eventResultId: "r2", eventTotal: 8, event_total_pts: 888 },
      { eventResultId: "r3", event_total_pts: 7 },
      { eventResultId: "r4" },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.playerId, row.seasonPoints]),
    [
      ["p1", 9],
      ["p2", 8],
      ["p3", 7],
      ["p4", 0],
    ]
  );
});

test("coerces numeric strings and ignores non-numeric values for seasonPoints", () => {
  const rows = getSeasonLeaderboardRows({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
      { id: "p3", name: "Cara" },
      { id: "p4", name: "Dion" },
    ],
    events: [
      { id: "e1", season: LEADERBOARD_SEASON, confirmed: true },
      { id: "e2", season: LEADERBOARD_SEASON, confirmed: true },
    ],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1" },
      { id: "r2", eventId: "e2", playerId: "p1" },
      { id: "r3", eventId: "e1", playerId: "p2" },
      { id: "r4", eventId: "e1", playerId: "p3" },
      { id: "r5", eventId: "e1", playerId: "p4" },
    ],
    eventPoints: [
      { eventResultId: "r1", points: "8" },
      { eventResultId: "r2", points: "2" },
      { eventResultId: "r3", eventTotal: "7" },
      { eventResultId: "r4", event_total_pts: "5" },
      { eventResultId: "r5", points: "not-a-number" },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.playerId, row.seasonPoints]),
    [
      ["p1", 10],
      ["p2", 7],
      ["p3", 5],
      ["p4", 0],
    ]
  );
});
