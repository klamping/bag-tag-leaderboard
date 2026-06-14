const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");

const { emptyCanonicalStore } = require("../lib/data/emptyCanonicalStore");
const { loadCanonicalStore } = require("../lib/data/loadCanonicalStore");
const { saveCanonicalStore } = require("../lib/data/saveCanonicalStore");
const { writeJsonFileAtomic } = require("../lib/data/writeJsonFileAtomic");

const execFileAsync = promisify(execFile);

function createPopulatedStore() {
  return {
    players: {
      schemaVersion: 1,
      items: [
        {
          id: "player_0001",
          name: "Alice Smith",
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
      ],
    },
    events: {
      schemaVersion: 1,
      items: [
        {
          id: "event_0001",
          slug: "summer-sizzler",
          name: "Summer Sizzler",
          eventDate: "2026-06-15",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/summer-sizzler",
          importPath: "data/imports/summer-sizzler.json",
          resultIds: ["result_0001"],
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
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
          startingTag: 3,
          attendancePoints: 2,
          placementPoints: 8,
          startingTagBonusPoints: 0,
          tagOneBonusPoints: 0,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 10,
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
      ],
    },
  };
}

async function makeTempRepo() {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "canonical-store-"));
  await fs.mkdir(path.join(tempDirectory, "data", "imports"), { recursive: true });
  return tempDirectory;
}

async function listTempFiles(tempDirectory) {
  const entries = await fs.readdir(path.join(tempDirectory, "data"));
  return entries.filter((entry) => entry.endsWith(".tmp"));
}

test("writeJsonFileAtomic writes pretty printed json with a trailing newline", async () => {
  const tempDirectory = await makeTempRepo();
  const filePath = path.join(tempDirectory, "data", "players.json");

  await writeJsonFileAtomic(filePath, { schemaVersion: 1, items: [] });

  const contents = await fs.readFile(filePath, "utf8");
  assert.equal(contents, '{\n  "schemaVersion": 1,\n  "items": []\n}\n');
});

test("saveCanonicalStore and loadCanonicalStore round-trip an empty store from a provided base directory", async () => {
  const tempDirectory = await makeTempRepo();
  const expectedStore = emptyCanonicalStore();

  await saveCanonicalStore(expectedStore, { baseDirectory: tempDirectory });

  assert.equal(
    await fs.readFile(path.join(tempDirectory, "data", "players.json"), "utf8"),
    '{\n  "schemaVersion": 1,\n  "items": []\n}\n'
  );
  assert.equal(
    await fs.readFile(path.join(tempDirectory, "data", "events.json"), "utf8"),
    '{\n  "schemaVersion": 1,\n  "items": []\n}\n'
  );
  assert.equal(
    await fs.readFile(path.join(tempDirectory, "data", "results.json"), "utf8"),
    '{\n  "schemaVersion": 1,\n  "items": []\n}\n'
  );

  const loadedStore = await loadCanonicalStore({ baseDirectory: tempDirectory });
  assert.deepEqual(loadedStore, expectedStore);
});

test("loadCanonicalStore and saveCanonicalStore default to the current working directory", async () => {
  const tempDirectory = await makeTempRepo();
  const saveCanonicalStorePath = path.join(__dirname, "..", "lib", "data", "saveCanonicalStore.js");
  const loadCanonicalStorePath = path.join(__dirname, "..", "lib", "data", "loadCanonicalStore.js");
  const script = [
    `const assert = require(${JSON.stringify("node:assert/strict")});`,
    `const { emptyCanonicalStore } = require(${JSON.stringify(path.join(__dirname, "..", "lib", "data", "emptyCanonicalStore.js"))});`,
    `const { saveCanonicalStore } = require(${JSON.stringify(saveCanonicalStorePath)});`,
    `const { loadCanonicalStore } = require(${JSON.stringify(loadCanonicalStorePath)});`,
    `async function main() {`,
    `  await saveCanonicalStore(emptyCanonicalStore());`,
    `  const loadedStore = await loadCanonicalStore();`,
    `  assert.deepEqual(loadedStore, emptyCanonicalStore());`,
    `}`,
    `main().catch((error) => {`,
    `  process.stderr.write(String(error && error.stack ? error.stack : error));`,
    `  process.exit(1);`,
    `});`,
  ].join("\n");

  await execFileAsync(process.execPath, ["-e", script], { cwd: tempDirectory });

  assert.equal(
    await fs.readFile(path.join(tempDirectory, "data", "players.json"), "utf8"),
    '{\n  "schemaVersion": 1,\n  "items": []\n}\n'
  );
});

test("saveCanonicalStore leaves canonical files unchanged when a later temp write fails before renames", async () => {
  const tempDirectory = await makeTempRepo();
  const initialStore = createPopulatedStore();
  const nextStore = createPopulatedStore();

  nextStore.players.items[0].name = "Updated Alice";
  nextStore.players.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.events.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.results.items[0].updatedAt = "2026-06-13T00:00:00.000Z";

  await saveCanonicalStore(initialStore, { baseDirectory: tempDirectory });

  const playersPath = path.join(tempDirectory, "data", "players.json");
  const eventsPath = path.join(tempDirectory, "data", "events.json");
  const resultsPath = path.join(tempDirectory, "data", "results.json");
  const beforePlayers = await fs.readFile(playersPath, "utf8");
  const beforeEvents = await fs.readFile(eventsPath, "utf8");
  const beforeResults = await fs.readFile(resultsPath, "utf8");

  let writeCount = 0;
  const failingFs = {
    ...fs,
    writeFile: async (...args) => {
      writeCount += 1;

      if (writeCount === 2) {
        throw new Error("simulated temp write failure");
      }

      return fs.writeFile(...args);
    },
  };

  await assert.rejects(
    () => saveCanonicalStore(nextStore, { baseDirectory: tempDirectory, fs: failingFs }),
    /simulated temp write failure/i
  );

  assert.equal(await fs.readFile(playersPath, "utf8"), beforePlayers);
  assert.equal(await fs.readFile(eventsPath, "utf8"), beforeEvents);
  assert.equal(await fs.readFile(resultsPath, "utf8"), beforeResults);
  assert.deepEqual(await listTempFiles(tempDirectory), []);
});

test("saveCanonicalStore restores canonical files when a later rename fails", async () => {
  const tempDirectory = await makeTempRepo();
  const initialStore = createPopulatedStore();
  const nextStore = createPopulatedStore();

  nextStore.players.items[0].name = "Updated Alice";
  nextStore.players.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.events.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.results.items[0].updatedAt = "2026-06-13T00:00:00.000Z";

  await saveCanonicalStore(initialStore, { baseDirectory: tempDirectory });

  const playersPath = path.join(tempDirectory, "data", "players.json");
  const eventsPath = path.join(tempDirectory, "data", "events.json");
  const resultsPath = path.join(tempDirectory, "data", "results.json");
  const beforePlayers = await fs.readFile(playersPath, "utf8");
  const beforeEvents = await fs.readFile(eventsPath, "utf8");
  const beforeResults = await fs.readFile(resultsPath, "utf8");

  let renameCount = 0;
  const failingFs = {
    ...fs,
    rename: async (...args) => {
      renameCount += 1;

      if (renameCount === 2) {
        throw new Error("simulated rename failure");
      }

      return fs.rename(...args);
    },
  };

  await assert.rejects(
    () => saveCanonicalStore(nextStore, { baseDirectory: tempDirectory, fs: failingFs }),
    /simulated rename failure/i
  );

  assert.equal(await fs.readFile(playersPath, "utf8"), beforePlayers);
  assert.equal(await fs.readFile(eventsPath, "utf8"), beforeEvents);
  assert.equal(await fs.readFile(resultsPath, "utf8"), beforeResults);
  assert.deepEqual(await listTempFiles(tempDirectory), []);
});

test("saveCanonicalStore keeps restoring files after a restore failure and preserves the original rename error", async () => {
  const tempDirectory = await makeTempRepo();
  const initialStore = createPopulatedStore();
  const nextStore = createPopulatedStore();

  nextStore.players.items[0].name = "Updated Alice";
  nextStore.players.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.events.items[0].updatedAt = "2026-06-13T00:00:00.000Z";
  nextStore.results.items[0].updatedAt = "2026-06-13T00:00:00.000Z";

  await saveCanonicalStore(initialStore, { baseDirectory: tempDirectory });

  const playersPath = path.join(tempDirectory, "data", "players.json");
  const eventsPath = path.join(tempDirectory, "data", "events.json");
  const resultsPath = path.join(tempDirectory, "data", "results.json");
  const beforePlayers = await fs.readFile(playersPath, "utf8");
  const beforeEvents = await fs.readFile(eventsPath, "utf8");
  const beforeResults = await fs.readFile(resultsPath, "utf8");

  let renameCount = 0;
  const failingFs = {
    ...fs,
    rename: async (...args) => {
      renameCount += 1;

      if (renameCount === 3) {
        throw new Error("simulated rename failure");
      }

      return fs.rename(...args);
    },
    writeFile: async (filePath, ...args) => {
      if (filePath === playersPath) {
        throw new Error("simulated restore failure");
      }

      return fs.writeFile(filePath, ...args);
    },
  };

  await assert.rejects(
    async () => {
      try {
        await saveCanonicalStore(nextStore, { baseDirectory: tempDirectory, fs: failingFs });
      } catch (error) {
        assert.equal(error.message, "simulated rename failure");
        assert.equal(error.cleanupErrors.length, 1);
        assert.equal(error.cleanupErrors[0].message, "simulated restore failure");
        throw error;
      }
    },
    /simulated rename failure/i
  );

  assert.notEqual(await fs.readFile(playersPath, "utf8"), beforePlayers);
  assert.equal(await fs.readFile(eventsPath, "utf8"), beforeEvents);
  assert.equal(await fs.readFile(resultsPath, "utf8"), beforeResults);
  assert.deepEqual(await listTempFiles(tempDirectory), []);
});
