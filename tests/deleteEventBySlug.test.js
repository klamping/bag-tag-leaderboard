const test = require("node:test");
const assert = require("node:assert/strict");

const { deleteEventBySlug } = require("../lib/domain/deleteEventBySlug");

function createStore() {
  return {
    players: {
      schemaVersion: 1,
      items: [
        {
          id: "player_0001",
          name: "Alice Smith",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
    events: {
      schemaVersion: 1,
      items: [
        {
          id: "event_0001",
          slug: "spring-showdown",
          name: "Spring Showdown",
          eventDate: "2026-04-12",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown",
          importPath: "data/imports/spring-showdown.json",
          resultIds: ["result_0001", "result_0002"],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "event_0002",
          slug: "summer-sizzler",
          name: "Summer Sizzler",
          eventDate: "2026-06-10",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/summer-sizzler",
          importPath: "data/imports/summer-sizzler.json",
          resultIds: ["result_0003"],
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    },
    results: {
      schemaVersion: 1,
      items: [
        {
          id: "result_0001",
          eventId: "event_0001",
          playerId: "player_0001",
          finishPlace: 1,
          startingTag: 2,
          attendancePoints: 2,
          placementPoints: 8,
          startingTagBonusPoints: 0,
          tagOneBonusPoints: 0,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 10,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "result_0002",
          eventId: "event_0001",
          playerId: "player_0001",
          finishPlace: null,
          startingTag: 1,
          attendancePoints: 2,
          placementPoints: 0,
          startingTagBonusPoints: 0,
          tagOneBonusPoints: 2,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 4,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "result_0003",
          eventId: "event_0002",
          playerId: "player_0001",
          finishPlace: 1,
          startingTag: 3,
          attendancePoints: 2,
          placementPoints: 8,
          startingTagBonusPoints: 0,
          tagOneBonusPoints: 0,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 10,
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
    },
  };
}

test("deleteEventBySlug removes event, linked results, and snapshot path", () => {
  const store = createStore();

  const nextState = deleteEventBySlug({
    store,
    slug: "spring-showdown",
  });

  assert.deepEqual(
    nextState.store.events.items.map((event) => event.slug),
    ["summer-sizzler"]
  );
  assert.deepEqual(
    nextState.store.results.items.map((result) => result.id),
    ["result_0003"]
  );
  assert.deepEqual(nextState.deletedSnapshotPaths, ["data/imports/spring-showdown.json"]);
});

test("deleteEventBySlug removes stale linked results even when event resultIds are incomplete", () => {
  const store = createStore();

  store.results.items.push({
    id: "result_0004",
    eventId: "event_0001",
    playerId: "player_0001",
    finishPlace: 3,
    startingTag: 4,
    attendancePoints: 2,
    placementPoints: 5,
    startingTagBonusPoints: 0,
    tagOneBonusPoints: 0,
    beatYourTagBonusPoints: 0,
    eventTotalPoints: 7,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  const nextState = deleteEventBySlug({
    store,
    slug: "spring-showdown",
  });

  assert.deepEqual(
    nextState.store.results.items.map((result) => result.id),
    ["result_0003"]
  );
});
