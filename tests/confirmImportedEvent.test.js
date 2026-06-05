const test = require("node:test");
const assert = require("node:assert/strict");

const { confirmImportedEvent } = require("../lib/confirmImportedEvent");
const { LEADERBOARD_SEASON } = require("../lib/leaderboardQuery");

function buildPreview(overrides = {}) {
  return {
    event: {
      slug: "spring-showdown",
      name: "Spring Showdown",
      date: "2026-04-12",
      isMajor: false,
      notes: "",
      ...overrides.event,
    },
    participants: [
      {
        playerName: "Alice Smith",
        externalPlayerId: "u1",
        finishPlace: 1,
        matchStatus: "matched",
        matchedPlayerId: "player_1",
        matchedPlayerName: "Alice Smith",
        startingTag: 8,
      },
      {
        playerName: "New Person",
        externalPlayerId: "u2",
        finishPlace: 2,
        matchStatus: "unmatched",
      },
      ...(overrides.participants || []),
    ],
  };
}

function createDeps(overrides = {}) {
  const calls = {
    findExistingEventBySlug: [],
    insertPlayer: [],
    rollbackPlayer: [],
    rollbackConfirmedEvent: [],
    rollbackEventResult: [],
    rollbackEventPoint: [],
    insertConfirmedEvent: [],
    insertEventResult: [],
    insertEventPoint: [],
    scoreEvent: [],
  };

  return {
    calls,
    deps: {
      findExistingEventBySlug: async () => null,
      findExistingEventBySlug: async (slug) => {
        calls.findExistingEventBySlug.push(slug);
        return null;
      },
      insertPlayer: async ({ name }) => {
        calls.insertPlayer.push({ name });
        return { id: `player_new_${calls.insertPlayer.length}`, name };
      },
      rollbackPlayer: async (playerId) => {
        calls.rollbackPlayer.push(playerId);
      },
      insertConfirmedEvent: async (payload) => {
        calls.insertConfirmedEvent.push(payload);
        return { id: "evt_confirmed_0002", ...payload };
      },
      rollbackConfirmedEvent: async (eventId) => {
        calls.rollbackConfirmedEvent.push(eventId);
      },
      insertEventResult: async (payload) => {
        calls.insertEventResult.push(payload);
        return { id: `result_${calls.insertEventResult.length}`, ...payload };
      },
      rollbackEventResult: async (eventResultId) => {
        calls.rollbackEventResult.push(eventResultId);
      },
      insertEventPoint: async (payload) => {
        calls.insertEventPoint.push(payload);
        return { id: `point_${calls.insertEventPoint.length}`, ...payload };
      },
      rollbackEventPoint: async (eventPointId) => {
        calls.rollbackEventPoint.push(eventPointId);
      },
      scoreEventFn: (input) => {
        calls.scoreEvent.push(input);
        return input.participants.map((participant) => ({
          playerId: participant.playerId,
          attendance: 2,
          placement: participant.finishPlace === 1 ? 8 : 6,
          startingTagBonus: participant.startingTag ? 1 : 0,
          tagOneBonus: participant.startingTag === 1 ? 2 : 0,
          beatYourTagBonus: 0,
          subtotal: participant.finishPlace === 1 ? 11 : 8,
          multiplier: input.isMajor ? 2 : 1,
          eventTotal: participant.finishPlace === 1 ? 11 : 8,
        }));
      },
      ...overrides,
    },
  };
}

test("returns field errors for invalid preview event fields", async () => {
  const { deps, calls } = createDeps();

  const result = await confirmImportedEvent({
    preview: buildPreview({
      event: {
        slug: "Bad Slug!",
        name: "",
        date: "2026-02-31",
      },
    }),
    ...deps,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      slug: "Slug format is invalid",
      name: "Name is required",
      date: "Date is invalid",
    },
  });
  assert.deepEqual(calls.findExistingEventBySlug, []);
  assert.deepEqual(calls.scoreEvent, []);
  assert.deepEqual(calls.insertPlayer, []);
  assert.deepEqual(calls.insertConfirmedEvent, []);
  assert.deepEqual(calls.insertEventResult, []);
  assert.deepEqual(calls.insertEventPoint, []);
});

test("returns participant row field errors for invalid imported rows", async () => {
  const { deps, calls } = createDeps();

  const result = await confirmImportedEvent({
    preview: {
      event: buildPreview().event,
      participants: [
        {
          playerName: "",
          finishPlace: 0,
          matchStatus: "matched",
          matchedPlayerId: "",
          startingTag: 0,
        },
        {
          playerName: "Ambiguous Person",
          finishPlace: 2,
          matchStatus: "ambiguous",
        },
      ],
    },
    ...deps,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      participants_0_playerName: "Player name is required",
      participants_0_finishPlace: "Finish place must be an integer greater than or equal to 1",
      participants_0_matchedPlayerId: "Matched player is required",
      participants_0_startingTag: "Starting tag must be an integer greater than or equal to 1",
      participants_1_matchStatus:
        "Imported player could not be uniquely matched to a returning player",
    },
  });
  assert.deepEqual(calls.findExistingEventBySlug, []);
  assert.deepEqual(calls.scoreEvent, []);
  assert.deepEqual(calls.insertPlayer, []);
  assert.deepEqual(calls.insertConfirmedEvent, []);
  assert.deepEqual(calls.insertEventResult, []);
  assert.deepEqual(calls.insertEventPoint, []);
});

test("rejects unsupported match status values with a field error", async () => {
  const { deps, calls } = createDeps();

  const result = await confirmImportedEvent({
    preview: {
      event: buildPreview().event,
      participants: [
        {
          playerName: "Mystery Person",
          finishPlace: 1,
          matchStatus: "unknown",
        },
      ],
    },
    ...deps,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      participants_0_matchStatus: "Match status is invalid",
    },
  });
  assert.deepEqual(calls.findExistingEventBySlug, []);
  assert.deepEqual(calls.scoreEvent, []);
  assert.deepEqual(calls.insertPlayer, []);
  assert.deepEqual(calls.insertConfirmedEvent, []);
  assert.deepEqual(calls.insertEventResult, []);
  assert.deepEqual(calls.insertEventPoint, []);
});

test("returns row errors when matched participants reuse the same starting tag", async () => {
  const { deps, calls } = createDeps();

  const result = await confirmImportedEvent({
    preview: {
      event: buildPreview().event,
      participants: [
        {
          playerName: "Alice Smith",
          finishPlace: 1,
          matchStatus: "matched",
          matchedPlayerId: "player_1",
          startingTag: 8,
        },
        {
          playerName: "Bob Jones",
          finishPlace: 2,
          matchStatus: "matched",
          matchedPlayerId: "player_2",
          startingTag: 8,
        },
      ],
    },
    ...deps,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      participants_0_startingTag: "Starting tags must be unique",
      participants_1_startingTag: "Starting tags must be unique",
    },
  });
  assert.deepEqual(calls.findExistingEventBySlug, []);
  assert.deepEqual(calls.scoreEvent, []);
  assert.deepEqual(calls.insertPlayer, []);
  assert.deepEqual(calls.insertConfirmedEvent, []);
  assert.deepEqual(calls.insertEventResult, []);
  assert.deepEqual(calls.insertEventPoint, []);
});

test("creates players, scores the event, and persists the confirmed import", async () => {
  const { deps, calls } = createDeps();

  const result = await confirmImportedEvent({
    preview: buildPreview({
      event: {
        isMajor: true,
        notes: "  Bring towels  ",
      },
      participants: [
        {
          playerName: "Bob Jones",
          externalPlayerId: "u3",
          finishPlace: 3,
          matchStatus: "matched",
          matchedPlayerId: "player_2",
          matchedPlayerName: "Bob Jones",
          startingTag: 1,
        },
      ],
    }),
    ...deps,
  });

  assert.deepEqual(calls.insertPlayer, [{ name: "New Person" }]);
  assert.deepEqual(calls.scoreEvent, [
    {
      isMajor: true,
      participants: [
        { playerId: "player_1", finishPlace: 1, startingTag: 8 },
        { playerId: "new_player_1", finishPlace: 2 },
        { playerId: "player_2", finishPlace: 3, startingTag: 1 },
      ],
    },
  ]);
  assert.deepEqual(calls.insertConfirmedEvent, [
    {
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      isMajor: true,
      notes: "Bring towels",
      status: "confirmed",
      season: LEADERBOARD_SEASON,
    },
  ]);
  assert.deepEqual(calls.insertEventResult, [
    {
      eventId: "evt_confirmed_0002",
      playerId: "player_1",
      finishPlace: 1,
      startingTag: 8,
    },
    {
      eventId: "evt_confirmed_0002",
      playerId: "player_new_1",
      finishPlace: 2,
      startingTag: undefined,
    },
    {
      eventId: "evt_confirmed_0002",
      playerId: "player_2",
      finishPlace: 3,
      startingTag: 1,
    },
  ]);
  assert.deepEqual(calls.insertEventPoint, [
    {
      eventId: "evt_confirmed_0002",
      eventResultId: "result_1",
      playerId: "player_1",
      attendance: 2,
      placement: 8,
      startingTagBonus: 1,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      subtotal: 11,
      multiplier: 2,
      eventTotal: 11,
    },
    {
      eventId: "evt_confirmed_0002",
      eventResultId: "result_2",
      playerId: "player_new_1",
      attendance: 2,
      placement: 6,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      subtotal: 8,
      multiplier: 2,
      eventTotal: 8,
    },
    {
      eventId: "evt_confirmed_0002",
      eventResultId: "result_3",
      playerId: "player_2",
      attendance: 2,
      placement: 6,
      startingTagBonus: 1,
      tagOneBonus: 2,
      beatYourTagBonus: 0,
      subtotal: 8,
      multiplier: 2,
      eventTotal: 8,
    },
  ]);
  assert.deepEqual(result, {
    ok: true,
    event: {
      id: "evt_confirmed_0002",
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      isMajor: true,
      notes: "Bring towels",
      status: "confirmed",
      season: LEADERBOARD_SEASON,
    },
    participants: [
      {
        playerName: "Alice Smith",
        externalPlayerId: "u1",
        finishPlace: 1,
        matchStatus: "matched",
        matchedPlayerId: "player_1",
        matchedPlayerName: "Alice Smith",
        startingTag: 8,
        playerId: "player_1",
      },
      {
        playerName: "New Person",
        externalPlayerId: "u2",
        finishPlace: 2,
        matchStatus: "unmatched",
        playerId: "player_new_1",
      },
      {
        playerName: "Bob Jones",
        externalPlayerId: "u3",
        finishPlace: 3,
        matchStatus: "matched",
        matchedPlayerId: "player_2",
        matchedPlayerName: "Bob Jones",
        startingTag: 1,
        playerId: "player_2",
      },
    ],
  });
});

test("returns slug field error when the confirmed event slug already exists", async () => {
  const { deps, calls } = createDeps({
    findExistingEventBySlug: async () => ({ id: "evt_existing" }),
  });

  const result = await confirmImportedEvent({
    preview: buildPreview(),
    ...deps,
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      slug: "Slug is already in use",
    },
  });
  assert.equal(calls.insertPlayer.length, 0);
  assert.equal(calls.insertConfirmedEvent.length, 0);
  assert.equal(calls.insertEventResult.length, 0);
  assert.equal(calls.insertEventPoint.length, 0);
});

test("does not write event results or points when scoring fails", async () => {
  const { deps, calls } = createDeps({
    scoreEventFn: () => {
      throw new Error("scoring exploded");
    },
  });

  await assert.rejects(
    () =>
      confirmImportedEvent({
        preview: buildPreview(),
        ...deps,
      }),
    /scoring exploded/
  );

  assert.equal(calls.insertPlayer.length, 0);
  assert.equal(calls.insertConfirmedEvent.length, 0);
  assert.equal(calls.insertEventResult.length, 0);
  assert.equal(calls.insertEventPoint.length, 0);
});

test("rolls back created records when a later write fails", async () => {
  const { deps, calls } = createDeps({
    insertEventPoint: async (payload) => {
      calls.insertEventPoint.push(payload);
      if (calls.insertEventPoint.length === 1) {
        return { id: "point_1", ...payload };
      }

      throw new Error("point insert failed");
    },
  });

  await assert.rejects(
    () =>
      confirmImportedEvent({
        preview: buildPreview(),
        ...deps,
      }),
    /point insert failed/
  );

  assert.deepEqual(calls.rollbackEventPoint, ["point_1"]);
  assert.deepEqual(calls.rollbackEventResult, ["result_2", "result_1"]);
  assert.deepEqual(calls.rollbackConfirmedEvent, ["evt_confirmed_0002"]);
  assert.deepEqual(calls.rollbackPlayer, ["player_new_1"]);
});

test("continues rollback attempts when an earlier rollback fails", async () => {
  const { deps, calls } = createDeps({
    insertEventPoint: async (payload) => {
      calls.insertEventPoint.push(payload);
      if (calls.insertEventPoint.length === 1) {
        return { id: "point_1", ...payload };
      }

      throw new Error("point insert failed");
    },
    rollbackEventPoint: async (eventPointId) => {
      calls.rollbackEventPoint.push(eventPointId);
      throw new Error("point rollback failed");
    },
  });

  await assert.rejects(
    () =>
      confirmImportedEvent({
        preview: buildPreview(),
        ...deps,
      }),
    /point insert failed/
  );

  assert.deepEqual(calls.rollbackEventPoint, ["point_1"]);
  assert.deepEqual(calls.rollbackEventResult, ["result_2", "result_1"]);
  assert.deepEqual(calls.rollbackConfirmedEvent, ["evt_confirmed_0002"]);
  assert.deepEqual(calls.rollbackPlayer, ["player_new_1"]);
});
