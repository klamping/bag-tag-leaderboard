const test = require("node:test");
const assert = require("node:assert/strict");

const { confirmImportedEvent } = require("../lib/confirmImportedEvent");
const {
  getEventsData,
  resetEventsData,
  findConfirmedEventBySlug,
  insertPlayer,
  insertConfirmedEvent,
  insertEventResults,
  insertEventPoints,
} = require("../lib/eventsData");
const {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
} = require("../lib/publicEventsQuery");
const { getSeasonLeaderboardRows } = require("../lib/leaderboardQuery");

test("confirmImportedEvent persists a confirmed import into public events and leaderboard queries", async (t) => {
  t.after(() => resetEventsData());
  resetEventsData({
    players: [{ id: "player_0001", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });

  const preview = {
    event: {
      slug: "summer-sizzler",
      name: "Summer Sizzler",
      date: "2026-06-15",
      isMajor: false,
      notes: "Weeknight flex start",
    },
    participants: [
      {
        playerName: "Alice Smith",
        externalPlayerId: "u1",
        finishPlace: 1,
        matchStatus: "matched",
        matchedPlayerId: "player_0001",
        matchedPlayerName: "Alice Smith",
        startingTag: 2,
      },
      {
        playerName: "Bob Jones",
        externalPlayerId: "u2",
        finishPlace: 2,
        matchStatus: "unmatched",
      },
    ],
  };

  const result = await confirmImportedEvent({
    preview,
    findExistingEventBySlug: findConfirmedEventBySlug,
    insertPlayer,
    insertConfirmedEvent,
    insertEventResult: async (payload) => insertEventResults([payload]).then((rows) => rows[0]),
    insertEventPoint: async (payload) => insertEventPoints([payload]).then((rows) => rows[0]),
  });

  assert.equal(result.ok, true);

  const eventsData = getEventsData();

  assert.deepEqual(listPublicEvents(eventsData), [
    {
      slug: "summer-sizzler",
      name: "Summer Sizzler",
      eventDate: "2026-06-15",
    },
  ]);

  assert.deepEqual(getPublicEventScoreboardBySlug({
    slug: "summer-sizzler",
    ...eventsData,
  }), {
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-06-15",
    scoreboard: [
      {
        playerId: "player_0001",
        playerName: "Alice Smith",
        startingTag: 2,
        eventResult: 1,
        attendance: 2,
        placement: 8,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 10,
      },
      {
        playerId: "player_0002",
        playerName: "Bob Jones",
        startingTag: undefined,
        eventResult: 2,
        attendance: 2,
        placement: 6,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 8,
      },
    ],
  });

  assert.deepEqual(getSeasonLeaderboardRows(eventsData), [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonPoints: 10,
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      eventsPlayed: 1,
      seasonPoints: 8,
    },
  ]);
});
