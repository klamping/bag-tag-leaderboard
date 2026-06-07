const test = require("node:test");
const assert = require("node:assert/strict");

test("playwright admin scoreboard fixture exposes the four-event season used by e2e", async () => {
  const { getAdminScoreboardSeasonFixture } = require("../lib/e2e/adminScoreboardSeason.js");
  const { confirmImportedEvent } = require("../lib/confirmImportedEvent.js");
  const eventsData = require("../lib/eventsData.js");
  const originalData = {
    players: eventsData.getEventsData().players.map((player) => ({ ...player })),
    events: eventsData.getEventsData().events.map((event) => ({ ...event })),
    eventResults: eventsData.getEventsData().eventResults.map((result) => ({ ...result })),
    eventPoints: eventsData.getEventsData().eventPoints.map((point) => ({ ...point })),
  };

  const fixtureUrls = [
    "https://udisc.com/events/admin-scoreboard-spring-fling/leaderboard",
    "https://udisc.com/events/admin-scoreboard-summer-sizzler/leaderboard",
    "https://udisc.com/events/admin-scoreboard-autumn-classic/leaderboard",
    "https://udisc.com/events/admin-scoreboard-finale/leaderboard",
  ];

  const fixtures = fixtureUrls.map((url) => getAdminScoreboardSeasonFixture(url));

  assert.equal(fixtures.length, 4);
  fixtures.forEach((fixture) => {
    assert.ok(fixture);
    assert.equal(Array.isArray(fixture.participants), true);
    assert.equal(fixture.participants.length, 4);
  });

  try {
    eventsData.resetEventsData({
      players: [],
      events: [],
      eventResults: [],
      eventPoints: [],
    });

    for (const fixture of fixtures) {
      const playerIdByName = new Map(
        eventsData.getEventsData().players.map((player) => [player.name, player.id])
      );

      const reviewedParticipants = fixture.participants.map((participant) => {
        const matchedPlayerId = playerIdByName.get(participant.playerName);

        if (!matchedPlayerId) {
          return {
            ...participant,
            matchStatus: "unmatched",
          };
        }

        return {
          ...participant,
          matchStatus: "matched",
          matchedPlayerId,
          matchedPlayerName: participant.playerName,
          startingTag: fixture.startingTagByName[participant.playerName],
        };
      });

      const result = await confirmImportedEvent({
        preview: {
          event: {
            name: fixture.name,
            slug: fixture.slug,
            date: fixture.date,
            isMajor: fixture.isMajor === true,
            notes: "",
          },
          participants: reviewedParticipants,
        },
        findExistingEventBySlug: async (slug) =>
          eventsData.getEventsData().events.find((event) => event.slug === slug) || null,
        insertPlayer: eventsData.insertPlayer,
        rollbackPlayer: eventsData.deletePlayer,
        insertConfirmedEvent: eventsData.insertConfirmedEvent,
        rollbackConfirmedEvent: eventsData.deleteConfirmedEvent,
        insertEventResult: async (payload) => eventsData.insertEventResults([payload]).then((rows) => rows[0]),
        rollbackEventResult: eventsData.deleteEventResult,
        insertEventPoint: async (payload) => eventsData.insertEventPoints([payload]).then((rows) => rows[0]),
        rollbackEventPoint: eventsData.deleteEventPoint,
      });

      assert.equal(result.ok, true);
    }

    const { getPublicEventScoreboardBySlug } = require("../lib/publicEventsQuery.js");
    const { getSeasonLeaderboardRows } = require("../lib/leaderboardQuery.js");
    const persisted = eventsData.getEventsData();
    const finalEvent = getPublicEventScoreboardBySlug({
      slug: "admin-scoreboard-finale",
      ...persisted,
    });
    const leaderboard = getSeasonLeaderboardRows(persisted);

    assert.deepEqual(
      finalEvent.scoreboard.map((row) => ({
        playerName: row.playerName,
        startingTag: row.startingTag,
        total: row.eventTotal,
      })),
      [
        { playerName: "Alice Example", startingTag: 3, total: 12 },
        { playerName: "Casey Example", startingTag: 1, total: 12 },
        { playerName: "Bob Example", startingTag: 4, total: 9 },
        { playerName: "Dana Example", startingTag: 2, total: 8 },
      ]
    );
    assert.deepEqual(
      leaderboard.map((row) => ({
        playerName: row.playerName,
        eventsPlayed: row.eventsPlayed,
        seasonPoints: row.seasonPoints,
      })),
      [
        { playerName: "Casey Example", eventsPlayed: 4, seasonPoints: 42 },
        { playerName: "Alice Example", eventsPlayed: 4, seasonPoints: 41 },
        { playerName: "Bob Example", eventsPlayed: 4, seasonPoints: 41 },
        { playerName: "Dana Example", eventsPlayed: 4, seasonPoints: 32 },
      ]
    );
  } finally {
    eventsData.resetEventsData(originalData);
  }

  assert.deepEqual(eventsData.getEventsData(), originalData);
});
