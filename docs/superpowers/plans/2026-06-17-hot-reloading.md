# Hot Reloading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `npm run dev` workflow that starts a preview server for the public site while preserving the existing canonical-store validation and `publicModel` pipeline.

**Architecture:** Keep `npm run build` and `bag-tag site build` unchanged. Add a new `bag-tag site dev` command that loads canonical data, validates it, builds `publicModel`, creates an Eleventy instance in `serve` mode with that global data injected, then starts Eleventy watch and serve programmatically so only the `site/` tree is watched by default.

**Tech Stack:** Node.js, npm scripts, built-in `node:test`, CommonJS modules, Eleventy 3

---

## File Map

- Modify: `tests/packageScripts.test.js`
  Responsible for pinning the exposed npm script value.
- Modify: `tests/cliEntrypoint.test.js`
  Responsible for asserting `runCli()` delegates `site dev` correctly.
- Modify: `package.json`
  Responsible for exposing the new local dev entrypoint.
- Modify: `lib/cli/runCli.js`
  Responsible for routing `bag-tag site dev` to the correct command module.
- Create: `lib/cli/siteDevCommand.js`
  Responsible for loading canonical data, validating it, building `publicModel`, creating Eleventy in serve mode, and starting watch + serve.
- Modify: `README.md`
  Responsible for documenting the local preview workflow.

If extracting a tiny shared helper makes the build/dev commands materially simpler, keep it focused on Eleventy setup and avoid unrelated refactoring.

### Task 1: Correct the Exposed Dev Script Contract

**Files:**
- Modify: `tests/packageScripts.test.js`
- Modify: `package.json`
- Test: `tests/packageScripts.test.js`

- [ ] **Step 1: Update the failing script test**

Adjust the existing package script test in `tests/packageScripts.test.js` so it asserts the final correct entrypoint:

```js
test("package scripts target the CLI, static build, and site dev directly", () => {
  assert.equal(packageJson.scripts.build, "npm run build:site");
  assert.equal(packageJson.scripts["build:site"], "node ./bin/bag-tag.js site build");
  assert.equal(packageJson.scripts.dev, "node ./bin/bag-tag.js site dev");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal("build:next" in packageJson.scripts, false);
  assert.equal("test:e2e" in packageJson.scripts, false);
  assert.equal("test:e2e:headed" in packageJson.scripts, false);
  assert.equal("test:e2e:ui" in packageJson.scripts, false);
});
```

- [ ] **Step 2: Run the focused script test and confirm it fails first**

Run: `node --test tests/packageScripts.test.js`

Expected: FAIL because `packageJson.scripts.dev` still points at the wrong command.

- [ ] **Step 3: Update `package.json` to match the contract**

Change the `dev` script to:

```json
"dev": "node ./bin/bag-tag.js site dev"
```

Keep `build`, `build:site`, and `test` unchanged.

- [ ] **Step 4: Re-run the focused script test**

Run: `node --test tests/packageScripts.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the script contract change**

```bash
git add package.json tests/packageScripts.test.js
git commit -m "fix: route dev script through site cli"
```

### Task 2: Add the `site dev` CLI Path and Startup Coverage

**Files:**
- Modify: `tests/cliEntrypoint.test.js`
- Modify: `lib/cli/runCli.js`
- Create: `lib/cli/siteDevCommand.js`
- Test: `tests/cliEntrypoint.test.js`

- [ ] **Step 1: Add a failing CLI delegation test**

Extend `tests/cliEntrypoint.test.js` with a new delegation case:

```js
test("runCli delegates site dev to the command module", async () => {
  const calls = [];
  const result = { exitCode: 0 };

  const actual = await runCli(["site", "dev"], {
    siteDevCommand: async (options) => {
      calls.push(options);
      return result;
    },
  });

  assert.equal(actual, result);
  assert.equal(calls.length, 1);
});
```

- [ ] **Step 2: Run the focused CLI test to verify it fails**

Run: `node --test tests/cliEntrypoint.test.js`

Expected: FAIL because `runCli()` does not recognize `site dev` yet.

- [ ] **Step 3: Implement the minimal CLI routing and dev command module**

Update `lib/cli/runCli.js` to import `siteDevCommand`, add `bag-tag site dev` to the usage text, and delegate the new command:

```js
const { siteDevCommand } = require("./siteDevCommand");

// usage text includes:
//   bag-tag site dev

if (group === "site" && action === "dev") {
  return (options.siteDevCommand || siteDevCommand)(options);
}
```

Create `lib/cli/siteDevCommand.js` with the same startup pipeline as `siteBuildCommand`, but in serve/watch mode:

```js
const { loadCanonicalStore } = require("../data/loadCanonicalStore");
const { validateCanonicalStore } = require("../data/validateCanonicalStore");
const { buildPublicModel } = require("../domain/buildPublicModel");
const path = require("node:path");
const { Eleventy } = require("@11ty/eleventy");

function defaultIo() {
  return {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

async function siteDevCommand(options = {}) {
  const io = options.io || defaultIo();
  const baseDirectory = options.baseDirectory || process.cwd();
  const projectDirectory = options.projectDirectory || baseDirectory;
  const readStore = options.loadCanonicalStore || loadCanonicalStore;
  const validateStore = options.validateCanonicalStore || validateCanonicalStore;
  const createPublicModel = options.buildPublicModel || buildPublicModel;
  const EleventyClass = options.Eleventy || Eleventy;

  try {
    const store = await readStore({ baseDirectory, ...options });
    validateStore(store);
    const publicModel = createPublicModel(store);
    const outputDirectory = options.outputDirectory || path.join(baseDirectory, "dist");
    const inputDirectory = path.join(projectDirectory, "site");
    const configPath = path.join(projectDirectory, ".eleventy.js");
    const eleventy = new EleventyClass(inputDirectory, outputDirectory, {
      source: "cli",
      configPath,
      runMode: "serve",
      config: (eleventyConfig) => {
        eleventyConfig.addGlobalData("publicModel", publicModel);
      },
    });

    await eleventy.init();
    eleventy.setIgnoreInitial(false);
    await eleventy.watch();
    await eleventy.serve(options.port);

    io.writeStdout("Started public site dev server.\n");
    return { exitCode: 0 };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return { exitCode: 1 };
  }
}

module.exports = {
  siteDevCommand,
};
```

- [ ] **Step 4: Re-run the focused CLI test**

Run: `node --test tests/cliEntrypoint.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the CLI routing**

```bash
git add lib/cli/runCli.js lib/cli/siteDevCommand.js tests/cliEntrypoint.test.js
git commit -m "feat: add site dev command"
```

### Task 3: Prove the Dev Command Startup Pipeline Without a Long-Running Server Test

**Files:**
- Modify: `tests/cliEntrypoint.test.js`
- Modify: `lib/cli/siteDevCommand.js`
- Test: `tests/cliEntrypoint.test.js`

- [ ] **Step 1: Add a failing startup test for `siteDevCommand()`**

Add a direct unit test in `tests/cliEntrypoint.test.js` that injects fakes for store loading, validation, public-model creation, and Eleventy:

```js
test("siteDevCommand validates the canonical store and starts Eleventy with injected publicModel", async () => {
  const calls = [];

  class FakeEleventy {
    constructor(input, output, options) {
      calls.push({ type: "constructor", input, output, options });
    }

    async init() {
      calls.push({ type: "init" });
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

  const store = { players: { items: [] }, events: { items: [] }, results: { items: [] } };
  const publicModel = { homepage: { leaderboardRows: [], events: [] }, eventPages: [] };
  const stdout = [];

  const result = await siteDevCommand({
    baseDirectory: "/tmp/project",
    projectDirectory: "/tmp/project",
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
    Eleventy: FakeEleventy,
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: () => {
        throw new Error("writeStderr should not be called");
      },
    },
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls[0].type, "loadCanonicalStore");
  assert.equal(calls[1].type, "validateCanonicalStore");
  assert.equal(calls[2].type, "buildPublicModel");
  assert.equal(calls[3].type, "constructor");
  assert.equal(calls[4].type, "init");
  assert.deepEqual(calls[5], { type: "setIgnoreInitial", value: false });
  assert.equal(calls[6].type, "watch");
  assert.deepEqual(calls[7], { type: "serve", port: undefined });

  const configCallback = calls[3].options.config;
  const globalDataCalls = [];
  configCallback({
    addGlobalData: (name, value) => {
      globalDataCalls.push({ name, value });
    },
  });

  assert.deepEqual(globalDataCalls, [{ name: "publicModel", value: publicModel }]);
  assert.deepEqual(stdout, ["Started public site dev server.\n"]);
});
```

- [ ] **Step 2: Add a failing error-path test**

Also add this test to pin startup validation behavior:

```js
test("siteDevCommand returns non-zero when canonical validation fails", async () => {
  const stderr = [];

  const result = await siteDevCommand({
    loadCanonicalStore: async () => ({ players: { items: [] }, events: { items: [] }, results: { items: [] } }),
    validateCanonicalStore: () => {
      throw new Error("invalid canonical store");
    },
    io: {
      writeStdout: () => {
        throw new Error("writeStdout should not be called");
      },
      writeStderr: (value) => stderr.push(value),
    },
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.deepEqual(stderr, ["invalid canonical store\n"]);
});
```

- [ ] **Step 3: Run the focused CLI test file to verify failures**

Run: `node --test tests/cliEntrypoint.test.js`

Expected: FAIL until `siteDevCommand.js` matches the required startup sequence.

- [ ] **Step 4: Implement the minimal production adjustments required by the tests**

If Step 1's implementation from Task 2 was copied exactly, keep `siteDevCommand.js` minimal and only fix any mismatch surfaced by the tests. Do not add custom watcher logic, data-file watching, or extra CLI options.

- [ ] **Step 5: Re-run the focused CLI tests**

Run: `node --test tests/cliEntrypoint.test.js`

Expected: PASS.

- [ ] **Step 6: Run the full automated suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Commit the startup coverage**

```bash
git add lib/cli/siteDevCommand.js tests/cliEntrypoint.test.js
git commit -m "test: cover site dev startup pipeline"
```

### Task 4: Document and Manually Verify the Dev Workflow

**Files:**
- Modify: `README.md`
- Test: none

- [ ] **Step 1: Update the package script list**

In `README.md`, change the `## Package Scripts` block to:

```text
npm run build
npm run build:site
npm run dev
npm test
```

- [ ] **Step 2: Add a development preview section**

Immediately after `## Package Scripts`, add:

```md
## Development Preview

Run the local public-site preview server with automatic rebuilds for `site/` changes:

`npm run dev`

This command loads the canonical store, validates it, builds the public site data model, serves the generated site locally, and rebuilds when files under `site/` change.
```

- [ ] **Step 3: Manually verify the dev workflow**

Run: `npm run dev`

Expected terminal behavior:

- canonical store validation succeeds
- Eleventy starts successfully
- the preview server announces a local URL
- the initial build writes to `dist/`

While `npm run dev` is running, make a small temporary edit to `site/index.njk` or `site/styles/site.css`, save it, and confirm Eleventy reports a rebuild. Revert the temporary edit before continuing so no verification-only source change remains.

- [ ] **Step 4: Commit the docs update**

```bash
git add README.md
git commit -m "docs: add local preview workflow"
```

### Task 5: Final Verification Snapshot

**Files:**
- Modify: none
- Test: `tests/packageScripts.test.js`, `tests/cliEntrypoint.test.js`

- [ ] **Step 1: Re-run the full automated suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Capture the final worktree state**

Run: `git status --short`

Expected: only the intended hot-reloading files are modified or the worktree is clean if all commits are complete.

- [ ] **Step 3: Final commit if manual verification required a real code follow-up**

If the manual run of `npm run dev` surfaced a real source issue that required code changes beyond the commits above, commit that follow-up with:

```bash
git add package.json lib/cli/runCli.js lib/cli/siteDevCommand.js tests/packageScripts.test.js tests/cliEntrypoint.test.js README.md
git commit -m "fix: finalize hot reloading workflow"
```

If no follow-up edits were needed, skip this step.
