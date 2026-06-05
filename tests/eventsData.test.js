const test = require("node:test");
const assert = require("node:assert/strict");

const { isConfirmedEvent } = require("../lib/isConfirmedEvent");
const {
  getEventsData,
  resetEventsData,
  insertPlayer,
  insertConfirmedEvent,
  insertEventResults,
  insertEventPoints,
  deletePlayer,
  deleteConfirmedEvent,
  deleteEventResult,
  deleteEventPoint,
} = require("../lib/eventsData");
const { listPublicEvents } = require("../lib/publicEventsQuery");
const { LEADERBOARD_SEASON, getSeasonLeaderboardRows } = require("../lib/leaderboardQuery");

test("insertConfirmedEvent ignores conflicting confirmation fields from caller payload", async (t) => {
  t.after(() => resetEventsData());

  resetEventsData({
    players: [{ id: "player_0001", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });

  const event = await insertConfirmedEvent({
    slug: "conflict-event",
    name: "Conflict Event",
    eventDate: "2026-07-01",
    season: LEADERBOARD_SEASON,
    confirmed: false,
    status: "draft",
  });

  await insertEventResults([{ id: "caller-result-id", eventId: event.id, playerId: "player_0001" }]);
  await insertEventPoints([{ eventResultId: "result_0001", points: 9 }]);

  assert.equal(isConfirmedEvent(event), true);
  assert.deepEqual(listPublicEvents(getEventsData()), [
    {
      slug: "conflict-event",
      name: "Conflict Event",
      eventDate: "2026-07-01",
    },
  ]);
  assert.deepEqual(getSeasonLeaderboardRows(getEventsData()), [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonPoints: 9,
    },
  ]);
});

test("delete helpers remove inserted rows by id", async (t) => {
  t.after(() => resetEventsData());

  resetEventsData({
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });

  const player = await insertPlayer({ name: "Rollback Player" });
  const event = await insertConfirmedEvent({
    slug: "rollback-event",
    name: "Rollback Event",
    eventDate: "2026-07-02",
    season: LEADERBOARD_SEASON,
  });
  const [result] = await insertEventResults([{ eventId: event.id, playerId: player.id, finishPlace: 1 }]);
  const [point] = await insertEventPoints([{ eventId: event.id, eventResultId: result.id, playerId: player.id, eventTotal: 9 }]);

  await deleteEventPoint(point.id);
  await deleteEventResult(result.id);
  await deleteConfirmedEvent(event.id);
  await deletePlayer(player.id);

  assert.deepEqual(getEventsData(), {
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
});
