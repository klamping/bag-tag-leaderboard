const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { runCli: runCliCommand } = require("../lib/cli/runCli.js");

const repoRoot = path.join(__dirname, "..");
const cliPath = path.join(repoRoot, "bin", "bag-tag.js");

function runBinCli(args) {
  return spawnSync("node", [cliPath, ...args], {
    encoding: "utf8",
  });
}

test("bag-tag bin entrypoint is executable", () => {
  fs.accessSync(cliPath, fs.constants.X_OK);
});

test("bag-tag prints command help to stderr with no args", () => {
  const result = runBinCli([]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /bag-tag events import/i);
  assert.match(result.stderr, /bag-tag events delete/i);
  assert.match(result.stderr, /bag-tag site build/i);
});

test("bag-tag prints command help to stderr for invalid usage", () => {
  const result = runBinCli(["wat", "now"]);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /bag-tag events import/i);
  assert.match(result.stderr, /bag-tag events delete/i);
  assert.match(result.stderr, /bag-tag site build/i);
});

test("runCli delegates events import to the command module", async () => {
  const calls = [];

  const result = await runCliCommand(["events", "import"], {
    sentinel: "ok",
    eventsImportCommand: async (options) => {
      calls.push(options);
      return { exitCode: 0 };
    },
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sentinel, "ok");
});

test("runCli delegates events delete to the command module", async () => {
  const calls = [];

  const result = await runCliCommand(["events", "delete"], {
    sentinel: "delete-ok",
    eventsDeleteCommand: async (options) => {
      calls.push(options);
      return { exitCode: 0 };
    },
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sentinel, "delete-ok");
});

test("runCli delegates site build to the command module", async () => {
  const calls = [];

  const result = await runCliCommand(["site", "build"], {
    sentinel: "build-ok",
    siteBuildCommand: async (options) => {
      calls.push(options);
      return { exitCode: 0 };
    },
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sentinel, "build-ok");
});
