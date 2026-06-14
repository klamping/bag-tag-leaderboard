const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");

const { eventsImportCommand } = require("../lib/cli/eventsImportCommand");

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
          udiscUrl: "https://udisc.com/events/spring-showdown/leaderboard",
          importPath: "data/imports/spring-showdown.json",
          resultIds: ["result_0001"],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
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
      ],
    },
  };
}

function createCommandDeps(overrides = {}) {
  const calls = {
    promptForLeaderboardUrl: 0,
    fetchUdiscEventFromUrl: [],
    promptEventMetadata: [],
    confirmReplacement: [],
    reviewImportTable: [],
    printImportPreview: [],
    confirmSave: [],
    persistImport: [],
  };

  return {
    calls,
    deps: {
      promptForLeaderboardUrl: async () => {
        calls.promptForLeaderboardUrl += 1;
        return "https://udisc.com/events/spring-showdown/leaderboard";
      },
      fetchUdiscEventFromUrl: async ({ leaderboardUrl }) => {
        calls.fetchUdiscEventFromUrl.push({ leaderboardUrl });
        return {
          name: "Spring Showdown",
          eventDate: "2026-04-12",
          participants: [
            { playerName: "Alice Smith", finishPlace: 1, didNotFinish: false },
            { playerName: "Bob Jones", finishPlace: 2, didNotFinish: false },
          ],
        };
      },
      loadCanonicalStore: async () => createStore(),
      promptEventMetadata: async ({ event }) => {
        calls.promptEventMetadata.push(event);
        return {
          ...event,
          name: "Spring Showdown Reloaded",
          slug: "spring-showdown",
          eventDate: "2026-06-14",
          isMajor: true,
        };
      },
      confirmReplacement: async (payload) => {
        calls.confirmReplacement.push(payload);
        return true;
      },
      reviewImportTable: async (payload) => {
        calls.reviewImportTable.push(payload);
        return payload.rows.map((row, index) => ({
          ...row,
          finishPlace: index + 1,
          reviewDecision: "keep",
          startingTag: index + 3,
        }));
      },
      printImportPreview: ({ event, rows, existingEvent }) => {
        calls.printImportPreview.push({ event, rows, existingEvent });
        return `Preview ${event.slug} (${rows.length})`;
      },
      confirmSave: async (payload) => {
        calls.confirmSave.push(payload);
        return true;
      },
      persistImport: async (payload) => {
        calls.persistImport.push(payload);
      },
      now: () => "2026-06-14T12:00:00.000Z",
      ...overrides,
    },
  };
}

test("eventsImportCommand replaces an existing slug after checkpoint review and returns a success summary", async () => {
  const stdout = [];
  const { calls, deps } = createCommandDeps();

  const result = await eventsImportCommand({
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.deepEqual(calls.fetchUdiscEventFromUrl, [
    { leaderboardUrl: "https://udisc.com/events/spring-showdown/leaderboard" },
  ]);
  assert.deepEqual(calls.promptEventMetadata, [
    {
      name: "Spring Showdown",
      slug: "spring-showdown",
      eventDate: "2026-04-12",
      isMajor: false,
    },
  ]);
  assert.equal(calls.confirmReplacement.length, 1);
  assert.equal(calls.reviewImportTable.length, 1);
  assert.deepEqual(calls.reviewImportTable[0].rows, [
    {
      playerName: "Alice Smith",
      matchStatus: "existing",
      playerId: "player_0001",
      importedResult: 1,
      reviewDecision: "keep",
      finishPlace: 1,
      startingTag: null,
      didNotFinish: false,
    },
    {
      playerName: "Bob Jones",
      matchStatus: "new",
      importedResult: 2,
      reviewDecision: "keep",
      finishPlace: 2,
      startingTag: null,
      didNotFinish: false,
    },
  ]);
  assert.equal(calls.printImportPreview.length, 1);
  assert.equal(calls.confirmSave.length, 1);
  assert.equal(stdout.join(""), "Preview spring-showdown (2)\n");
  assert.equal(calls.persistImport.length, 1);

  const [{ store, snapshot, importPath }] = calls.persistImport;
  assert.equal(importPath, "data/imports/spring-showdown.json");
  assert.deepEqual(store.players.items.map((player) => player.name), ["Alice Smith", "Bob Jones"]);
  assert.deepEqual(store.events.items[0], {
    id: "event_0001",
    slug: "spring-showdown",
    name: "Spring Showdown Reloaded",
    eventDate: "2026-06-14",
    isMajor: true,
    udiscUrl: "https://udisc.com/events/spring-showdown/leaderboard",
    importPath: "data/imports/spring-showdown.json",
    resultIds: ["result_0002", "result_0003"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-14T12:00:00.000Z",
  });
  assert.deepEqual(store.results.items, [
    {
      id: "result_0002",
      eventId: "event_0001",
      playerId: "player_0001",
      finishPlace: 1,
      startingTag: 3,
      attendancePoints: 2,
      placementPoints: 8,
      startingTagBonusPoints: 1,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 22,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
    },
    {
      id: "result_0003",
      eventId: "event_0001",
      playerId: "player_0002",
      finishPlace: 2,
      startingTag: 4,
      attendancePoints: 2,
      placementPoints: 6,
      startingTagBonusPoints: 0,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 16,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
    },
  ]);
  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    data: {
      slug: "spring-showdown",
      source: {
        type: "udisc",
        url: "https://udisc.com/events/spring-showdown/leaderboard",
        fetchedAt: "2026-06-14T12:00:00.000Z",
      },
      event: {
        name: "Spring Showdown Reloaded",
        eventDate: "2026-06-14",
        isMajor: true,
      },
      participants: [
        {
          playerName: "Alice Smith",
          finishPlace: 1,
          didNotFinish: false,
          reviewDecision: "keep",
        },
        {
          playerName: "Bob Jones",
          finishPlace: 2,
          didNotFinish: false,
          reviewDecision: "keep",
        },
      ],
    },
  });
  assert.deepEqual(result, {
    exitCode: 0,
    summary: {
      slug: "spring-showdown",
      replaced: true,
      playersCreated: 1,
      rowsSaved: 2,
      importPath: "data/imports/spring-showdown.json",
    },
  });
});

test("eventsImportCommand stops before review when replacement confirmation is declined", async () => {
  const { calls, deps } = createCommandDeps({
    confirmReplacement: async (payload) => {
      calls.confirmReplacement.push(payload);
      return false;
    },
  });

  const result = await eventsImportCommand({
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.deepEqual(result, {
    exitCode: 1,
    error: "Event import cancelled",
  });
  assert.equal(calls.reviewImportTable.length, 0);
  assert.equal(calls.confirmSave.length, 0);
  assert.equal(calls.persistImport.length, 0);
});

test("eventsImportCommand cancels before review when exact replacement slug confirmation does not match", async () => {
  const { calls, deps } = createCommandDeps({
    confirmReplacement: async (payload) => {
      calls.confirmReplacement.push(payload);
      return false;
    },
  });

  const result = await eventsImportCommand({
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.deepEqual(result, {
    exitCode: 1,
    error: "Event import cancelled",
  });
  assert.equal(calls.reviewImportTable.length, 0);
  assert.equal(calls.printImportPreview.length, 0);
  assert.equal(calls.confirmSave.length, 0);
  assert.equal(calls.persistImport.length, 0);
});

test("eventsImportCommand returns non-zero when edited metadata is invalid", async () => {
  const { calls, deps } = createCommandDeps({
    promptEventMetadata: async ({ event }) => {
      calls.promptEventMetadata.push(event);
      return {
        ...event,
        name: "",
        slug: "Bad Slug!",
        eventDate: "2026-02-31",
      };
    },
  });

  const result = await eventsImportCommand({
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.equal(result.exitCode, 1);
  assert.match(result.error, /name is required/i);
  assert.match(result.error, /slug/i);
  assert.match(result.error, /date/i);
  assert.equal(calls.confirmReplacement.length, 0);
  assert.equal(calls.reviewImportTable.length, 0);
  assert.equal(calls.printImportPreview.length, 0);
  assert.equal(calls.confirmSave.length, 0);
  assert.equal(calls.persistImport.length, 0);
});

test("eventsImportCommand returns non-zero when reviewed rows fail validation", async () => {
  const { calls, deps } = createCommandDeps({
    reviewImportTable: async (payload) => {
      calls.reviewImportTable.push(payload);
      return payload.rows.map((row) => ({
        ...row,
        reviewDecision: "keep",
        startingTag: null,
      }));
    },
  });

  const result = await eventsImportCommand({
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.equal(result.exitCode, 1);
  assert.match(result.error, /starting tag/i);
  assert.equal(calls.printImportPreview.length, 0);
  assert.equal(calls.confirmSave.length, 0);
  assert.equal(calls.persistImport.length, 0);
});

test("eventsImportCommand returns non-zero when the final write fails", async () => {
  const { deps } = createCommandDeps({
    persistImport: async () => {
      throw new Error("disk full");
    },
  });

  const result = await eventsImportCommand({
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.deepEqual(result, {
    exitCode: 1,
    error: "disk full",
  });
});

test("eventsImportCommand prompts for the leaderboard url and final save by default", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const outputChunks = [];

  output.on("data", (chunk) => {
    outputChunks.push(String(chunk));
  });

  input.end("https://udisc.com/events/fall-classic/leaderboard\ny\n");

  const { calls, deps } = createCommandDeps({
    loadCanonicalStore: async () => ({
      players: { schemaVersion: 1, items: [] },
      events: { schemaVersion: 1, items: [] },
      results: { schemaVersion: 1, items: [] },
    }),
    fetchUdiscEventFromUrl: async ({ leaderboardUrl }) => {
      calls.fetchUdiscEventFromUrl.push({ leaderboardUrl });
      return {
        name: "Fall Classic",
        eventDate: "2026-09-21",
        participants: [{ playerName: "New Person", finishPlace: 1, didNotFinish: false }],
      };
    },
  });

  delete deps.promptForLeaderboardUrl;
  delete deps.confirmSave;

  const result = await eventsImportCommand({
    ...deps,
    input,
    output,
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
  });

  assert.deepEqual(calls.fetchUdiscEventFromUrl, [
    { leaderboardUrl: "https://udisc.com/events/fall-classic/leaderboard" },
  ]);
  assert.equal(calls.persistImport.length, 1);
  assert.equal(result.exitCode, 0);
  assert.match(outputChunks.join(""), /UDisc leaderboard URL/i);
  assert.match(outputChunks.join(""), /Save import\? \(y\/N\)/i);
});

test("eventsImportCommand uses the default shared interactive prompts across metadata replacement review and save", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const outputChunks = [];

  output.on("data", (chunk) => {
    outputChunks.push(String(chunk));
  });

  input.end([
    "https://udisc.com/events/spring-showdown/leaderboard",
    "",
    "",
    "",
    "",
    "spring-showdown",
    "keep",
    "1",
    "3",
    "keep",
    "2",
    "4",
    "y",
  ].join("\n"));

  const { calls, deps } = createCommandDeps();

  delete deps.promptForLeaderboardUrl;
  delete deps.promptEventMetadata;
  delete deps.confirmReplacement;
  delete deps.reviewImportTable;
  delete deps.confirmSave;

  const result = await eventsImportCommand({
    ...deps,
    input,
    output,
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(calls.persistImport.length, 1);
  assert.match(outputChunks.join(""), /UDisc leaderboard URL/i);
  assert.match(outputChunks.join(""), /Event name \[Spring Showdown\]/i);
  assert.match(outputChunks.join(""), /Event slug \[spring-showdown\]/i);
  assert.match(outputChunks.join(""), /Event date \[2026-04-12\]/i);
  assert.match(outputChunks.join(""), /Major event\? \(y\/N\) \[n\]/i);
  assert.match(outputChunks.join(""), /Replacing existing event/i);
  assert.match(outputChunks.join(""), /Type the event slug to continue/i);
  assert.match(outputChunks.join(""), /Reviewing import for Spring Showdown/i);
  assert.match(outputChunks.join(""), /Decision \[keep\/dnf\/remove\]/i);
  assert.match(outputChunks.join(""), /Finish place \[1\]/i);
  assert.match(outputChunks.join(""), /Starting tag:/i);
  assert.match(outputChunks.join(""), /Save import\? \(y\/N\)/i);
});
