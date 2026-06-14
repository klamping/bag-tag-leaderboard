const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { eventsDeleteCommand, removeImportSnapshot } = require("../lib/cli/eventsDeleteCommand");

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
    promptForSlug: 0,
    confirmDelete: [],
    saveCanonicalStore: [],
    removeImportSnapshot: [],
  };

  return {
    calls,
    deps: {
      promptForSlug: async () => {
        calls.promptForSlug += 1;
        return "spring-showdown";
      },
      loadCanonicalStore: async () => createStore(),
      confirmDelete: async (payload) => {
        calls.confirmDelete.push(payload);
        return true;
      },
      saveCanonicalStore: async (store, options) => {
        calls.saveCanonicalStore.push({ store, options });
      },
      removeImportSnapshot: async (importPath) => {
        calls.removeImportSnapshot.push(importPath);
      },
      ...overrides,
    },
  };
}

async function createTempDirectory(t, prefix = "events-delete-") {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  return tempDirectory;
}

test("removeImportSnapshot deletes only files inside data/imports", async (t) => {
  const baseDirectory = await createTempDirectory(t, "events-delete-imports-");
  const importPath = path.join(baseDirectory, "data", "imports", "spring-showdown.json");

  await fs.mkdir(path.dirname(importPath), { recursive: true });
  await fs.writeFile(importPath, "snapshot", "utf8");

  await removeImportSnapshot("data/imports/spring-showdown.json", { baseDirectory });

  await assert.rejects(fs.access(importPath));
});

test("removeImportSnapshot rejects paths that escape data/imports", async (t) => {
  const baseDirectory = await createTempDirectory(t, "events-delete-escape-");
  const outsidePath = path.join(baseDirectory, "outside.json");

  await fs.writeFile(outsidePath, "keep me", "utf8");

  await assert.rejects(
    removeImportSnapshot("../outside.json", { baseDirectory }),
    /data\/imports/i
  );

  assert.equal(await fs.readFile(outsidePath, "utf8"), "keep me");
});

test("eventsDeleteCommand deletes the canonical event after exact slug confirmation", async () => {
  const stdout = [];
  const { calls, deps } = createCommandDeps();

  const result = await eventsDeleteCommand({
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: () => {},
    },
    ...deps,
  });

  assert.deepEqual(result, {
    exitCode: 0,
    slug: "spring-showdown",
    deletedResults: 1,
    deletedSnapshotPaths: ["data/imports/spring-showdown.json"],
  });
  assert.equal(calls.promptForSlug, 1);
  assert.equal(calls.confirmDelete.length, 1);
  assert.deepEqual(calls.confirmDelete[0].event, {
    id: "event_0001",
    slug: "spring-showdown",
    name: "Spring Showdown",
    eventDate: "2026-04-12",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/spring-showdown",
    importPath: "data/imports/spring-showdown.json",
    resultIds: ["result_0001"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  assert.equal(calls.saveCanonicalStore.length, 1);
  assert.deepEqual(calls.saveCanonicalStore[0].store.events.items, []);
  assert.deepEqual(calls.saveCanonicalStore[0].store.results.items, []);
  assert.deepEqual(calls.removeImportSnapshot, ["data/imports/spring-showdown.json"]);
  assert.match(stdout.join(""), /Deleting event spring-showdown/i);
  assert.match(stdout.join(""), /Deleted event spring-showdown/i);
});

test("eventsDeleteCommand returns non-zero when the slug does not exist", async () => {
  const stderr = [];
  const { calls, deps } = createCommandDeps({
    promptForSlug: async () => "missing-event",
  });

  const result = await eventsDeleteCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    ...deps,
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.equal(calls.confirmDelete.length, 0);
  assert.equal(calls.saveCanonicalStore.length, 0);
  assert.equal(calls.removeImportSnapshot.length, 0);
  assert.match(stderr.join(""), /Event not found for slug missing-event/i);
});

test("eventsDeleteCommand returns non-zero when deletion confirmation is cancelled", async () => {
  const stderr = [];
  const { calls, deps } = createCommandDeps({
    confirmDelete: async (payload) => {
      calls.confirmDelete.push(payload);
      return false;
    },
  });

  const result = await eventsDeleteCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    ...deps,
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.equal(calls.confirmDelete.length, 1);
  assert.equal(calls.saveCanonicalStore.length, 0);
  assert.equal(calls.removeImportSnapshot.length, 0);
  assert.match(stderr.join(""), /Deletion cancelled/i);
});

test("eventsDeleteCommand returns non-zero when saving the updated store fails", async () => {
  const stderr = [];
  const { calls, deps } = createCommandDeps({
    saveCanonicalStore: async () => {
      throw new Error("disk full");
    },
  });

  const result = await eventsDeleteCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    ...deps,
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.equal(calls.confirmDelete.length, 1);
  assert.equal(calls.removeImportSnapshot.length, 0);
  assert.match(stderr.join(""), /disk full/i);
});

test("eventsDeleteCommand returns non-zero when the stored snapshot path escapes data/imports", async () => {
  const stderr = [];
  const { calls, deps } = createCommandDeps({
    loadCanonicalStore: async () => ({
      ...createStore(),
      events: {
        schemaVersion: 1,
        items: [
          {
            ...createStore().events.items[0],
            importPath: "../outside.json",
          },
        ],
      },
    }),
    removeImportSnapshot: removeImportSnapshot,
    baseDirectory: "/tmp/bag-tag-delete-test",
  });

  const result = await eventsDeleteCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    ...deps,
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.equal(calls.confirmDelete.length, 1);
  assert.equal(calls.saveCanonicalStore.length, 0);
  assert.match(stderr.join(""), /data\/imports/i);
});
