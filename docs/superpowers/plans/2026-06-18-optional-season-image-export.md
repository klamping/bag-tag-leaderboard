# Optional Season Image Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make season leaderboard PNG export opt-in so normal `site build` runs do not invoke Playwright unless `--export-season-image` is explicitly passed.

**Architecture:** Parse `--export-season-image` at the `runCli()` layer for `site build`, pass a boolean into `siteBuildCommand()`, and gate the existing `captureSeasonLeaderboardImage()` call on that boolean. Keep the export model, export template, and capture helper behavior unchanged so only the build trigger changes.

**Tech Stack:** Node.js built-in test runner, existing CLI command routing, Eleventy site build command, Playwright-backed export helper.

---

## File Map

- Modify: `lib/cli/runCli.js`
  - Parse `site build --export-season-image` and pass `shouldExportSeasonImage` into `siteBuildCommand()`.
- Modify: `lib/cli/siteBuildCommand.js`
  - Skip `captureSeasonLeaderboardImage()` unless `shouldExportSeasonImage` is true.
- Modify: `tests/cliEntrypoint.test.js`
  - Cover routing of the new flag through `runCli()`.
- Modify: `tests/siteBuildCommand.test.js`
  - Update default build expectations to no longer assume PNG export runs.
  - Add explicit opt-in coverage for PNG export behavior.
- Modify: `tests/packageScripts.test.js`
  - Keep script expectations unchanged unless the implementation intentionally adds a new package script for opt-in export.

### Task 1: Parse The Opt-In Flag At The CLI Layer

**Files:**
- Modify: `tests/cliEntrypoint.test.js`
- Modify: `lib/cli/runCli.js`

- [ ] **Step 1: Write the failing CLI routing test**

In `tests/cliEntrypoint.test.js`, add this new test after `test("runCli delegates site build to the command module", async () => { ... })`:

```js
test("runCli passes --export-season-image to the site build command", async () => {
  const calls = [];

  const result = await runCliCommand(["site", "build", "--export-season-image"], {
    sentinel: "build-export-ok",
    siteBuildCommand: async (options) => {
      calls.push(options);
      return { exitCode: 0 };
    },
  });

  assert.deepEqual(result, { exitCode: 0 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].sentinel, "build-export-ok");
  assert.equal(calls[0].shouldExportSeasonImage, true);
});
```

- [ ] **Step 2: Run the focused CLI tests to verify failure**

Run: `node --test tests/cliEntrypoint.test.js --test-name-pattern "site build"`

Expected: FAIL because `runCli()` currently ignores extra `site build` arguments and never sets `shouldExportSeasonImage`.

- [ ] **Step 3: Implement minimal CLI flag parsing**

In `lib/cli/runCli.js`, update the `site build` branch from:

```js
  if (group === "site" && action === "build") {
    return (options.siteBuildCommand || siteBuildCommand)(options);
  }
```

to:

```js
  if (group === "site" && action === "build") {
    const shouldExportSeasonImage = argv.includes("--export-season-image");

    return (options.siteBuildCommand || siteBuildCommand)({
      ...options,
      shouldExportSeasonImage,
    });
  }
```

Do not add support for any other new flags in this task.

- [ ] **Step 4: Run the focused CLI tests to verify pass**

Run: `node --test tests/cliEntrypoint.test.js --test-name-pattern "site build"`

Expected: PASS for both the existing site-build delegation test and the new `--export-season-image` routing test.

- [ ] **Step 5: Commit**

```bash
git add tests/cliEntrypoint.test.js lib/cli/runCli.js
git commit -m "feat: add optional season image export flag"
```

### Task 2: Make Site Builds Default To No PNG Export

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/cli/siteBuildCommand.js`

- [ ] **Step 1: Write the failing default-off build test**

In `tests/siteBuildCommand.test.js`, add this new test near the existing PNG export tests:

```js
test("siteBuildCommand does not export the season leaderboard PNG by default", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-no-image-export-");
  const captureCalls = [];

  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => createStore(),
    captureSeasonLeaderboardImage: async (options) => {
      captureCalls.push(options);
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(captureCalls.length, 0);
  await assert.rejects(fs.access(path.join(tempDirectory, "dist", "season-leaderboard.png")), {
    code: "ENOENT",
  });
});
```

Then update the existing test name `siteBuildCommand writes a season leaderboard PNG into dist` to:

```js
test("siteBuildCommand writes a season leaderboard PNG into dist when export is requested", async (t) => {
```

and add `shouldExportSeasonImage: true` to that test’s `siteBuildCommand()` call.

Update the existing test name `siteBuildCommand skips the season leaderboard PNG when no leaderboard rows exist` to:

```js
test("siteBuildCommand skips the season leaderboard PNG when export is requested and no leaderboard rows exist", async (t) => {
```

and add `shouldExportSeasonImage: true` to that test’s `siteBuildCommand()` call.

Update the existing test name `siteBuildCommand returns non-zero when leaderboard image capture fails` to:

```js
test("siteBuildCommand returns non-zero when requested leaderboard image capture fails", async (t) => {
```

and add `shouldExportSeasonImage: true` to that test’s `siteBuildCommand()` call.

- [ ] **Step 2: Run the focused site-build export tests to verify failure**

Run: `node --test tests/siteBuildCommand.test.js --test-name-pattern "season leaderboard PNG|leaderboard image capture"`

Expected: FAIL because `siteBuildCommand()` still exports the image by default even when `shouldExportSeasonImage` is absent.

- [ ] **Step 3: Implement minimal default-off export gating**

In `lib/cli/siteBuildCommand.js`, add the new option near the other derived dependencies:

```js
  const shouldExportSeasonImage = options.shouldExportSeasonImage === true;
```

Then replace the current export block:

```js
    if (seasonLeaderboardImage) {
      await exportSeasonLeaderboardImage({
        exportPagePath: path.join(outputDirectory, "season-leaderboard-image", "index.html"),
        outputPath: path.join(outputDirectory, seasonLeaderboardImage.filename),
        width: seasonLeaderboardImage.width,
        height: seasonLeaderboardImage.height,
      });
    } else {
      io.writeStdout("Skipped season leaderboard image export because no leaderboard rows were available.\n");
    }
```

with:

```js
    if (shouldExportSeasonImage) {
      if (seasonLeaderboardImage) {
        await exportSeasonLeaderboardImage({
          exportPagePath: path.join(outputDirectory, "season-leaderboard-image", "index.html"),
          outputPath: path.join(outputDirectory, seasonLeaderboardImage.filename),
          width: seasonLeaderboardImage.width,
          height: seasonLeaderboardImage.height,
        });
      } else {
        io.writeStdout("Skipped season leaderboard image export because no leaderboard rows were available.\n");
      }
    }
```

Do not add any new stdout message for the default-off case.

- [ ] **Step 4: Run the focused site-build export tests to verify pass**

Run: `node --test tests/siteBuildCommand.test.js --test-name-pattern "season leaderboard PNG|leaderboard image capture"`

Expected: PASS for default-off, explicit opt-in export, no-row skip, and capture-failure tests.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js lib/cli/siteBuildCommand.js
git commit -m "feat: skip season image export by default"
```

### Task 3: Verify End-To-End Default Build And Opt-In Export

**Files:**
- Modify: `tests/packageScripts.test.js` only if a script change becomes necessary

- [ ] **Step 1: Verify package scripts remain unchanged**

Read `tests/packageScripts.test.js` and confirm the current expectation still holds:

```js
  assert.equal(packageJson.scripts["build:site"], "node ./bin/bag-tag.js site build");
```

Do not change `package.json` or `tests/packageScripts.test.js` unless the implementation truly requires a new script. The default expectation is that no script changes are needed.

- [ ] **Step 2: Run focused CLI and site-build verification**

Run: `node --test tests/cliEntrypoint.test.js tests/siteBuildCommand.test.js --test-name-pattern "site build|season leaderboard PNG|leaderboard image capture"`

Expected: PASS for CLI routing plus default-off and explicit-opt-in build behavior.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`

Expected: PASS for the full repository test suite.

- [ ] **Step 4: Run the default build command**

Run: `npm run build`

Expected: PASS without attempting season leaderboard PNG export.

- [ ] **Step 5: Run the explicit opt-in build command**

Run: `node ./bin/bag-tag.js site build --export-season-image`

Expected: PASS and generate `dist/season-leaderboard.png` when local Playwright browser prerequisites are available.

- [ ] **Step 6: Commit**

If Step 1 confirmed no script changes were needed and no new production code was added in this task, do not create a commit here.

If a script or small supporting code adjustment was required, commit with:

```bash
git add package.json tests/packageScripts.test.js lib/cli/runCli.js lib/cli/siteBuildCommand.js tests/cliEntrypoint.test.js tests/siteBuildCommand.test.js
git commit -m "test: verify optional season image export flow"
```

## Self-Review

- Spec coverage check:
  - default build skips PNG export: Task 2
  - `--export-season-image` opt-in path: Tasks 1 and 2
  - regular build avoids Playwright export requirement: Tasks 2 and 3
  - tests cover default-off and opt-in behavior: Tasks 1, 2, and 3
- Placeholder scan: no `TODO`, `TBD`, or vague instructions remain.
- Type consistency check: `shouldExportSeasonImage`, `siteBuildCommand`, and `captureSeasonLeaderboardImage` are named consistently across CLI routing, build orchestration, and tests.
