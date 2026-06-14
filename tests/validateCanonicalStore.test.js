const test = require("node:test");
const assert = require("node:assert/strict");

const { emptyCanonicalStore } = require("../lib/data/emptyCanonicalStore");
const { validateCanonicalStore } = require("../lib/data/validateCanonicalStore");

function createPlayer(overrides = {}) {
  return {
    id: "player_0001",
    name: "Alice Smith",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

function createEvent(overrides = {}) {
  return {
    id: "event_0001",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-06-15",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: [],
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

function createResult(overrides = {}) {
  return {
    id: "result_0001",
    eventId: "event_0001",
    playerId: "player_0001",
    finishPlace: 1,
    startingTag: 3,
    attendancePoints: 2,
    placementPoints: 8,
    startingTagBonusPoints: 0,
    tagOneBonusPoints: 0,
    beatYourTagBonusPoints: 0,
    eventTotalPoints: 10,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

test("validateCanonicalStore accepts empty wrapper objects", () => {
  const store = emptyCanonicalStore();

  assert.doesNotThrow(() => validateCanonicalStore(store));
});

test("validateCanonicalStore rejects results that reference missing players", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(createEvent({ resultIds: ["result_0001"] }));
  store.results.items.push(createResult({ playerId: "player_9999" }));

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*player_9999/i
  );
});

test("validateCanonicalStore rejects results that reference missing events", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.results.items.push(createResult({ eventId: "event_9999" }));

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*event_9999/i
  );
});

test("validateCanonicalStore rejects wrapper items with missing string ids", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer({ id: undefined }));

  assert.throws(
    () => validateCanonicalStore(store),
    /players.*id.*string/i
  );
});

test("validateCanonicalStore rejects results with non-string playerId", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: ["result_0001"] }));
  store.results.items.push(createResult({ playerId: 42 }));

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*playerId.*string/i
  );
});

test("validateCanonicalStore rejects results with missing eventId", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: ["result_0001"] }));
  store.results.items.push(createResult({ eventId: undefined }));

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*eventId.*string/i
  );
});

test("validateCanonicalStore rejects duplicate player ids", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(
    createPlayer(),
    createPlayer({ name: "Bob Jones" })
  );

  assert.throws(
    () => validateCanonicalStore(store),
    /players.*duplicate.*player_0001/i
  );
});

test("validateCanonicalStore rejects duplicate event ids", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(
    createEvent(),
    createEvent({ slug: "autumn-open", name: "Autumn Open" })
  );

  assert.throws(
    () => validateCanonicalStore(store),
    /events.*duplicate.*event_0001/i
  );
});

test("validateCanonicalStore rejects duplicate event slugs", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(
    createEvent(),
    createEvent({ id: "event_0002", name: "Autumn Open" })
  );

  assert.throws(
    () => validateCanonicalStore(store),
    /events.*duplicate.*slug.*summer-sizzler/i
  );
});

test("validateCanonicalStore rejects duplicate result ids", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: ["result_0001", "result_0001"] }));
  store.results.items.push(
    createResult(),
    createResult()
  );

  assert.throws(
    () => validateCanonicalStore(store),
    /results.*duplicate.*result_0001/i
  );
});

test("validateCanonicalStore rejects malformed player records", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer({ createdAt: "   " }));

  assert.throws(
    () => validateCanonicalStore(store),
    /players.*createdAt.*string/i
  );
});

test("validateCanonicalStore rejects malformed event records", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(createEvent({ isMajor: "nope" }));

  assert.throws(
    () => validateCanonicalStore(store),
    /events.*isMajor.*boolean/i
  );
});

test("validateCanonicalStore rejects malformed result records", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: ["result_0001"] }));
  store.results.items.push(createResult({ startingTag: 0 }));

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*startingTag/i
  );
});

test("validateCanonicalStore rejects event resultIds with non-string entries", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(createEvent({ resultIds: [123] }));

  assert.throws(
    () => validateCanonicalStore(store),
    /events.*resultIds.*string/i
  );
});

test("validateCanonicalStore rejects event resultIds that reference missing results", () => {
  const store = emptyCanonicalStore();

  store.events.items.push(createEvent({ resultIds: ["result_9999"] }));

  assert.throws(
    () => validateCanonicalStore(store),
    /event_0001.*result_9999/i
  );
});

test("validateCanonicalStore rejects event resultIds that point at a result from a different event", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(
    createEvent({ resultIds: ["result_0001"] }),
    createEvent({
      id: "event_0002",
      slug: "autumn-open",
      name: "Autumn Open",
      resultIds: [],
    })
  );
  store.results.items.push(createResult({ eventId: "event_0002" }));

  assert.throws(
    () => validateCanonicalStore(store),
    /event_0001.*result_0001.*event_0002/i
  );
});

test("validateCanonicalStore rejects results missing from their event resultIds", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: [] }));
  store.results.items.push(createResult());

  assert.throws(
    () => validateCanonicalStore(store),
    /result_0001.*event_0001.*resultIds/i
  );
});

test("validateCanonicalStore rejects duplicate entries within an event resultIds array", () => {
  const store = emptyCanonicalStore();

  store.players.items.push(createPlayer());
  store.events.items.push(createEvent({ resultIds: ["result_0001", "result_0001"] }));
  store.results.items.push(createResult());

  assert.throws(
    () => validateCanonicalStore(store),
    /event_0001.*duplicate.*result_0001/i
  );
});
