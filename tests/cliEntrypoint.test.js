const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { runCli: runCliCommand } = require("../lib/cli/runCli.js");
const { siteDevCommand } = require("../lib/cli/siteDevCommand.js");

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

test("runCli delegates site dev to the command module", async () => {
  const calls = [];
  const delegatedResult = { exitCode: 0, mode: "dev" };

  const result = await runCliCommand(["site", "dev"], {
    sentinel: "dev-ok",
    siteDevCommand: async (options) => {
      calls.push(options);
      return delegatedResult;
    },
  });

  assert.deepEqual(result, delegatedResult);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sentinel, "dev-ok");
});

test("siteDevCommand starts Eleventy watch and serve with the public model", async () => {
  const calls = [];
  const fileSystem = {
    async rm(targetPath, options) {
      calls.push({ type: "rm", targetPath, options });
    },
  };
  const io = {
    stdout: "",
    stderr: "",
    writeStdout(value) {
      this.stdout += value;
    },
    writeStderr(value) {
      this.stderr += value;
    },
  };
  const store = { players: [], events: [], results: [] };
  const publicModel = { eventPages: [] };
  class FakeEleventy {
    constructor(inputDirectory, outputDirectory, options) {
      calls.push({ type: "constructor", inputDirectory, outputDirectory, options });
      this.options = options;
    }

    async init() {
      calls.push({ type: "init" });
      const fakeConfig = {
        addGlobalData(name, value) {
          calls.push({ type: "globalData", name, value });
        },
      };
      this.options.config(fakeConfig);
    }

    setIgnoreInitial(value) {
      calls.push({ type: "setIgnoreInitial", value });
    }

    async watch() {
      calls.push({ type: "watch" });
    }

    async serve(port) {
      calls.push({ type: "serve", port });
    }
  }

  const result = await siteDevCommand({
    baseDirectory: "/tmp/base-dir",
    projectDirectory: "/tmp/project-dir",
    port: 4173,
    loadCanonicalStore: async () => {
      calls.push({ type: "loadCanonicalStore" });
      return store;
    },
    validateCanonicalStore: (value) => {
      calls.push({ type: "validateCanonicalStore", value });
    },
    buildPublicModel: (value) => {
      calls.push({ type: "buildPublicModel", value });
      return publicModel;
    },
    fs: fileSystem,
    Eleventy: FakeEleventy,
    io,
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(io.stdout, "Started public site dev server.\n");
  assert.equal(io.stderr, "");
  const constructorCall = calls.find((entry) => entry.type === "constructor");
  assert.equal(typeof constructorCall.options.config, "function");
  assert.deepEqual(calls.slice(0, 10), [
    { type: "loadCanonicalStore" },
    { type: "validateCanonicalStore", value: store },
    { type: "buildPublicModel", value: store },
    {
      type: "rm",
      targetPath: "/tmp/base-dir/dist",
      options: { recursive: true, force: true },
    },
    {
      type: "constructor",
      inputDirectory: "/tmp/project-dir/site",
      outputDirectory: "/tmp/base-dir/dist",
      options: {
        source: "cli",
        configPath: "/tmp/project-dir/.eleventy.js",
        runMode: "serve",
        config: constructorCall.options.config,
      },
    },
    { type: "init" },
    { type: "globalData", name: "publicModel", value: publicModel },
    { type: "setIgnoreInitial", value: false },
    { type: "watch" },
    { type: "serve", port: 4173 },
  ]);
});

test("siteDevCommand stops before Eleventy startup when canonical store validation fails", async () => {
  const calls = [];
  const io = {
    stdout: [],
    stderr: [],
    writeStdout(value) {
      this.stdout.push(value);
    },
    writeStderr(value) {
      this.stderr.push(value);
    },
  };

  const result = await siteDevCommand({
    loadCanonicalStore: async () => {
      calls.push("loadCanonicalStore");
      return { players: [], events: [], results: [] };
    },
    validateCanonicalStore: () => {
      calls.push("validateCanonicalStore");
      throw new Error("invalid canonical store");
    },
    Eleventy: class FakeEleventy {
      constructor() {
        calls.push("Eleventy");
      }
    },
    io,
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.deepEqual(io.stdout, []);
  assert.deepEqual(io.stderr, ["invalid canonical store\n"]);
  assert.deepEqual(calls, ["loadCanonicalStore", "validateCanonicalStore"]);
});
