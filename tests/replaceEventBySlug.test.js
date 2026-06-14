const test = require("node:test");
const assert = require("node:assert/strict");

const { replaceEventBySlug } = require("../lib/domain/replaceEventBySlug");

const NOW = "2026-06-14T12:00:00.000Z";

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
        {
          id: "player_0002",
          name: "Bob Jones",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "player_0003",
          name: "Cara Lane",
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
          importPath: "data/imports/spring-showdown-original.json",
          resultIds: ["result_0001", "result_0002"],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-05T00:00:00.000Z",
        },
        {
          id: "event_0002",
          slug: "zeta-open",
          name: "Zeta Open",
          eventDate: "2026-04-12",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/zeta-open",
          importPath: "data/imports/zeta-open.json",
          resultIds: ["result_0005"],
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
        {
          id: "event_0003",
          slug: "alpha-finale",
          name: "Alpha Finale",
          eventDate: "2026-05-01",
          isMajor: true,
          udiscUrl: "https://udisc.com/events/alpha-finale",
          importPath: "data/imports/alpha-finale.json",
          resultIds: [],
          createdAt: "2026-06-03T00:00:00.000Z",
          updatedAt: "2026-06-03T00:00:00.000Z",
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
          beatYourTagBonusPoints: 1,
          eventTotalPoints: 11,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "result_0002",
          eventId: "event_0001",
          playerId: "player_0002",
          finishPlace: 2,
          startingTag: 1,
          attendancePoints: 2,
          placementPoints: 6,
          startingTagBonusPoints: 1,
          tagOneBonusPoints: 2,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 11,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "result_0004",
          eventId: "event_0001",
          playerId: "player_0003",
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
        },
        {
          id: "result_0005",
          eventId: "event_0002",
          playerId: "player_0003",
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

test("replaceEventBySlug preserves event identity, regenerates results, and rebuilds ordering", () => {
  const store = createStore();

  const nextState = replaceEventBySlug({
    store,
    slug: "spring-showdown",
    eventInput: {
      slug: "spring-showdown",
      name: "Spring Showdown Reloaded",
      eventDate: "2026-06-01",
      isMajor: true,
      udiscUrl: "https://udisc.com/events/spring-showdown-reloaded",
      importPath: "data/imports/spring-showdown-reloaded.json",
    },
    reviewedRows: [
      { playerId: "player_0002", finishPlace: 1, startingTag: 3 },
      { playerId: "player_0001", finishPlace: 2, startingTag: 1 },
    ],
    now: NOW,
  });

  assert.equal(nextState.event.id, "event_0001");
  assert.equal(nextState.event.createdAt, "2026-06-01T00:00:00.000Z");
  assert.equal(nextState.event.updatedAt, NOW);
  assert.deepEqual(nextState.event.resultIds, ["result_0006", "result_0007"]);
  assert.equal(nextState.event.importPath, "data/imports/spring-showdown-reloaded.json");

  assert.deepEqual(
    nextState.store.events.items.map((event) => event.slug),
    ["spring-showdown", "alpha-finale", "zeta-open"]
  );

  assert.deepEqual(
    nextState.store.results.items.map((result) => result.id),
    ["result_0005", "result_0006", "result_0007"]
  );

  assert.equal(
    nextState.store.results.items.filter((result) => result.eventId === "event_0001").length,
    2
  );
  assert.equal(
    nextState.store.results.items.some((result) => result.id === "result_0001"),
    false
  );
  assert.equal(
    nextState.store.results.items.some((result) => result.id === "result_0002"),
    false
  );
  assert.equal(
    nextState.store.results.items.some((result) => result.id === "result_0004"),
    false
  );

  assert.deepEqual(
    nextState.store.results.items.filter((result) => result.eventId === "event_0001"),
    [
      {
        id: "result_0006",
        eventId: "event_0001",
        playerId: "player_0002",
        finishPlace: 1,
        startingTag: 3,
        attendancePoints: 2,
        placementPoints: 8,
        startingTagBonusPoints: 0,
        tagOneBonusPoints: 0,
        beatYourTagBonusPoints: 1,
        eventTotalPoints: 22,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "result_0007",
        eventId: "event_0001",
        playerId: "player_0001",
        finishPlace: 2,
        startingTag: 1,
        attendancePoints: 2,
        placementPoints: 6,
        startingTagBonusPoints: 1,
        tagOneBonusPoints: 2,
        beatYourTagBonusPoints: 0,
        eventTotalPoints: 22,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ]
  );

  assert.deepEqual(nextState.resultIds, ["result_0006", "result_0007"]);
});

test("replaceEventBySlug rejects reviewed rows with a missing startingTag", () => {
  const store = createStore();

  assert.throws(
    () =>
      replaceEventBySlug({
        store,
        slug: "spring-showdown",
        eventInput: {
          slug: "spring-showdown",
          name: "Spring Showdown Reloaded",
          eventDate: "2026-06-01",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown-reloaded",
          importPath: "data/imports/spring-showdown-reloaded.json",
        },
        reviewedRows: [
          { playerId: "player_0002", finishPlace: 1 },
        ],
        now: NOW,
      }),
    /startingTag/i
  );
});

test("replaceEventBySlug rejects reviewed rows with an invalid startingTag", () => {
  const store = createStore();

  assert.throws(
    () =>
      replaceEventBySlug({
        store,
        slug: "spring-showdown",
        eventInput: {
          slug: "spring-showdown",
          name: "Spring Showdown Reloaded",
          eventDate: "2026-06-01",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown-reloaded",
          importPath: "data/imports/spring-showdown-reloaded.json",
        },
        reviewedRows: [
          { playerId: "player_0002", finishPlace: 1, startingTag: 0 },
        ],
        now: NOW,
      }),
    /startingTag/i
  );
});

test("replaceEventBySlug rejects reviewed rows with an unknown playerId", () => {
  const store = createStore();

  assert.throws(
    () =>
      replaceEventBySlug({
        store,
        slug: "spring-showdown",
        eventInput: {
          slug: "spring-showdown",
          name: "Spring Showdown Reloaded",
          eventDate: "2026-06-01",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown-reloaded",
          importPath: "data/imports/spring-showdown-reloaded.json",
        },
        reviewedRows: [
          { playerId: "player_9999", finishPlace: 1, startingTag: 1 },
        ],
        now: NOW,
      }),
    /playerId/i
  );
});
