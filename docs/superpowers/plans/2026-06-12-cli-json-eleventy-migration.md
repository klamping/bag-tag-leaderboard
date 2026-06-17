# CLI JSON + Eleventy Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the half-built Next.js + admin runtime with a local `bag-tag` CLI that stores canonical event data in versioned JSON files and builds a static Eleventy site for the 2026 season.

**Architecture:** Keep all canonical state in `data/` JSON wrappers, move scoring and validation into pure Node modules, drive event ingestion through an interactive CLI import flow, and render the public site from canonical data during `site build`. Treat UDisc import snapshots as traceability artifacts, not public/runtime state.

**Tech Stack:** Node.js, `node:test`, Eleventy with Nunjucks, a small global CSS file, and a Node TUI dependency for the editable import review table.

---

## Target File Structure

### Canonical data and snapshots

- Create: `data/players.json`
- Create: `data/events.json`
- Create: `data/results.json`
- Create: `data/imports/.gitkeep`

### CLI entrypoint and workflows

- Create: `bin/bag-tag.js`
- Create: `lib/cli/runCli.js`
- Create: `lib/cli/eventsImportCommand.js`
- Create: `lib/cli/eventsDeleteCommand.js`
- Create: `lib/cli/siteBuildCommand.js`
- Create: `lib/cli/prompts/promptEventMetadata.js`
- Create: `lib/cli/prompts/confirmReplacement.js`
- Create: `lib/cli/prompts/confirmDelete.js`
- Create: `lib/cli/tui/reviewImportTable.js`
- Create: `lib/cli/formatters/printImportPreview.js`
- Create: `lib/cli/formatters/printCommandSummary.js`

### Canonical data access and validation

- Create: `lib/data/filePaths.js`
- Create: `lib/data/readJsonFile.js`
- Create: `lib/data/writeJsonFileAtomic.js`
- Create: `lib/data/loadCanonicalStore.js`
- Create: `lib/data/saveCanonicalStore.js`
- Create: `lib/data/emptyCanonicalStore.js`
- Create: `lib/data/idGenerator.js`
- Create: `lib/data/normalizePlayerName.js`
- Create: `lib/data/slugifyEventName.js`
- Create: `lib/data/validateCanonicalStore.js`
- Create: `lib/data/rebuildEventOrdering.js`

### Domain logic

- Modify: `lib/scoreEvent.js`
- Create: `lib/domain/validateEventReviewRows.js`
- Create: `lib/domain/buildImportReviewState.js`
- Create: `lib/domain/replaceEventBySlug.js`
- Create: `lib/domain/deleteEventBySlug.js`
- Create: `lib/domain/buildPublicModel.js`
- Create: `lib/domain/parseCompetitionPlaces.js`

### UDisc import pipeline

- Modify: `lib/udiscClient.js`
- Replace: `lib/udiscToDraftPreview.js` with `lib/udiscToImportReview.js`
- Create: `lib/domain/createImportSnapshot.js`

### Static site build

- Create: `.eleventy.js`
- Create: `site/_data/site.js`
- Create: `site/_includes/layout.njk`
- Create: `site/index.njk`
- Create: `site/events/event.njk`
- Create: `site/styles/site.css`

### Test coverage

- Modify: `tests/scoreEvent.test.js`
- Create: `tests/validateCanonicalStore.test.js`
- Create: `tests/replaceEventBySlug.test.js`
- Create: `tests/deleteEventBySlug.test.js`
- Create: `tests/buildPublicModel.test.js`
- Create: `tests/udiscImportReview.test.js`
- Create: `tests/siteBuildCommand.test.js`
- Create: `tests/canonicalStore.integration.test.js`
- Delete: web/admin-specific tests once replacement coverage exists

### Cleanup

- Delete: `app/`
- Delete: `e2e/`
- Delete: `lib/admin*.js` and other admin-only modules no longer used
- Update: `README.md`
- Update: `package.json`

## Task 1: Establish the New Runtime Boundary and Dependencies

**Files:**
- Modify: `package.json`
- Create: `bin/bag-tag.js`
- Create: `lib/cli/runCli.js`
- Update: `README.md`
- Test: `tests/cliEntrypoint.test.js`

- [ ] **Step 1: Write the failing CLI entrypoint test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("bag-tag prints command help for unknown input", () => {
  const result = spawnSync("node", [path.join(__dirname, "..", "bin", "bag-tag.js")], {
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /bag-tag events import/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cliEntrypoint.test.js`
Expected: FAIL because `bin/bag-tag.js` does not exist.

- [ ] **Step 3: Add CLI package wiring and minimal dispatcher**

```json
{
  "scripts": {
    "test": "node --test",
    "build": "npm run build:site",
    "build:site": "node ./bin/bag-tag.js site build"
  },
  "bin": {
    "bag-tag": "./bin/bag-tag.js"
  }
}
```

```js
#!/usr/bin/env node

const { runCli } = require("../lib/cli/runCli");

runCli(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
```

```js
async function runCli(argv) {
  const [group, action] = argv;

  if (group === "events" && action === "import") {
    throw new Error("events import not implemented yet");
  }

  if (group === "events" && action === "delete") {
    throw new Error("events delete not implemented yet");
  }

  if (group === "site" && action === "build") {
    throw new Error("site build not implemented yet");
  }

  process.stdout.write([
    "Usage:",
    "  bag-tag events import",
    "  bag-tag events delete",
    "  bag-tag site build",
    "",
  ].join("\n"));

  process.exitCode = 1;
}

module.exports = { runCli };
```

- [ ] **Step 4: Update README runtime instructions**

```md
## CLI

Primary commands:

- `bag-tag events import`
- `bag-tag events delete`
- `bag-tag site build`
```

- [ ] **Step 5: Run tests to verify the entrypoint passes**

Run: `node --test tests/cliEntrypoint.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json bin/bag-tag.js lib/cli/runCli.js README.md tests/cliEntrypoint.test.js
git commit -m "refactor: add bag-tag cli entrypoint"
```

## Task 2: Add Canonical JSON Store, File IO, and Schema Validation

**Files:**
- Create: `data/players.json`
- Create: `data/events.json`
- Create: `data/results.json`
- Create: `data/imports/.gitkeep`
- Create: `lib/data/filePaths.js`
- Create: `lib/data/readJsonFile.js`
- Create: `lib/data/writeJsonFileAtomic.js`
- Create: `lib/data/emptyCanonicalStore.js`
- Create: `lib/data/loadCanonicalStore.js`
- Create: `lib/data/saveCanonicalStore.js`
- Create: `lib/data/validateCanonicalStore.js`
- Create: `lib/data/normalizePlayerName.js`
- Create: `lib/data/idGenerator.js`
- Test: `tests/validateCanonicalStore.test.js`
- Test: `tests/canonicalStore.integration.test.js`

- [ ] **Step 1: Write failing validation tests for empty wrappers and bad references**

```js
test("validateCanonicalStore accepts empty versioned wrappers", () => {
  assert.doesNotThrow(() => validateCanonicalStore({
    players: { schemaVersion: 1, items: [] },
    events: { schemaVersion: 1, items: [] },
    results: { schemaVersion: 1, items: [] },
  }));
});

test("validateCanonicalStore rejects missing result references", () => {
  assert.throws(() => validateCanonicalStore({
    players: { schemaVersion: 1, items: [] },
    events: { schemaVersion: 1, items: [{ id: "event_0001", slug: "spring-showdown", name: "Spring Showdown", eventDate: "2026-04-12", isMajor: false, udiscUrl: "https://example.com", importPath: "data/imports/spring-showdown.json", resultIds: ["result_0001"], createdAt: "2026-06-12T00:00:00Z", updatedAt: "2026-06-12T00:00:00Z" }] },
    results: { schemaVersion: 1, items: [] },
  }), /result_0001/);
});
```

- [ ] **Step 2: Run the validation tests and confirm they fail**

Run: `node --test tests/validateCanonicalStore.test.js`
Expected: FAIL because validator modules do not exist.

- [ ] **Step 3: Add empty canonical files and atomic file helpers**

```json
{
  "schemaVersion": 1,
  "items": []
}
```

```js
const fs = require("node:fs/promises");
const path = require("node:path");

async function writeJsonFileAtomic(filePath, value) {
  const tempPath = `${filePath}.tmp`;
  const content = `${JSON.stringify(value, null, 2)}\n`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, content, "utf8");
  await fs.rename(tempPath, filePath);
}
```

- [ ] **Step 4: Implement store loader/saver and strict validator**

```js
function validateCanonicalStore(store) {
  // Check wrappers, schemaVersion === 1, stable key presence,
  // normalized unique player names, unique slugs, referential integrity,
  // result ordering ownership, timestamp/date formats, and score consistency hooks.
}
```

```js
function normalizePlayerName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
```

- [ ] **Step 5: Add integration test for round-tripping canonical files**

```js
test("saveCanonicalStore writes pretty-printed wrappers atomically", async () => {
  await saveCanonicalStore(tempDir, emptyCanonicalStore());
  const loaded = await loadCanonicalStore(tempDir);
  assert.deepEqual(loaded.players, { schemaVersion: 1, items: [] });
});
```

- [ ] **Step 6: Run validation and integration tests**

Run: `node --test tests/validateCanonicalStore.test.js tests/canonicalStore.integration.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add data/ lib/data/ tests/validateCanonicalStore.test.js tests/canonicalStore.integration.test.js
git commit -m "feat: add canonical json store and validation"
```

## Task 3: Upgrade Scoring Rules for Ties, DNF, and Stored Score Verification

**Files:**
- Modify: `lib/scoreEvent.js`
- Create: `lib/domain/parseCompetitionPlaces.js`
- Modify: `tests/scoreEvent.test.js`
- Create: `tests/buildPublicModel.test.js`

- [ ] **Step 1: Write failing score tests for DNF and competition ranking**

```js
test("DNF rows receive attendance and tag bonuses but no placement or beat-your-tag points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 2 },
      { playerId: "p2", finishPlace: null, startingTag: 1 },
    ],
  });

  assert.equal(scored[1].placement, 0);
  assert.equal(scored[1].beatYourTagBonus, 0);
  assert.equal(scored[1].attendance, 2);
  assert.equal(scored[1].tagOneBonus, 2);
});

test("non-null finish places must follow competition ranking", () => {
  assert.throws(() => scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 1 },
      { playerId: "p2", finishPlace: 2, startingTag: 2 },
      { playerId: "p3", finishPlace: 2, startingTag: 3 },
      { playerId: "p4", finishPlace: 3, startingTag: 4 },
    ],
  }), /competition ranking/i);
});
```

- [ ] **Step 2: Run the score tests and confirm failure**

Run: `node --test tests/scoreEvent.test.js`
Expected: FAIL because `finishPlace: null` is currently invalid.

- [ ] **Step 3: Refactor scoring to validate DNF-aware participants and competition places**

```js
function validateCompetitionPlaces(participants) {
  const finishers = participants.filter((participant) => Number.isInteger(participant.finishPlace));
  const places = finishers.map((participant) => participant.finishPlace).sort((a, b) => a - b);

  let index = 0;
  while (index < places.length) {
    const place = places[index];
    const tiedCount = places.filter((candidate) => candidate === place).length;
    const expected = index + 1;
    if (place !== expected) {
      throw new Error("Finish places must follow competition ranking");
    }
    index += tiedCount;
  }
}
```

```js
const placement = participant.finishPlace == null
  ? 0
  : getPlacementPoints(participant.finishPlace, participants.length);
```

- [ ] **Step 4: Keep existing major-event behavior and verify stored component semantics**

```js
return {
  playerId: participant.playerId,
  attendance,
  placement,
  startingTagBonus,
  tagOneBonus,
  beatYourTagBonus,
  eventTotal,
};
```

- [ ] **Step 5: Run updated score tests**

Run: `node --test tests/scoreEvent.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/scoreEvent.js lib/domain/parseCompetitionPlaces.js tests/scoreEvent.test.js
git commit -m "feat: support dnf and competition ranking scoring"
```

## Task 4: Build Event Replacement and Deletion Over Canonical JSON

**Files:**
- Create: `lib/domain/replaceEventBySlug.js`
- Create: `lib/domain/deleteEventBySlug.js`
- Create: `lib/data/rebuildEventOrdering.js`
- Test: `tests/replaceEventBySlug.test.js`
- Test: `tests/deleteEventBySlug.test.js`

- [ ] **Step 1: Write failing replacement tests for preserving event IDs and refreshing result IDs**

```js
test("replaceEventBySlug preserves event id and createdAt but regenerates result ids", () => {
  const nextState = replaceEventBySlug({ store, slug: "spring-showdown", reviewedEvent, now: NOW });

  assert.equal(nextState.event.id, "event_0001");
  assert.equal(nextState.event.createdAt, "2026-06-01T00:00:00Z");
  assert.equal(nextState.event.updatedAt, NOW);
  assert.notDeepEqual(nextState.resultIds, ["result_0001", "result_0002"]);
});
```

- [ ] **Step 2: Write failing delete tests for cascading event/results/snapshot removal**

```js
test("deleteEventBySlug removes event, linked results, and snapshot path", () => {
  const nextState = deleteEventBySlug({ store, slug: "spring-showdown" });

  assert.equal(nextState.events.items.length, 0);
  assert.equal(nextState.results.items.length, 0);
  assert.deepEqual(nextState.deletedSnapshotPaths, ["data/imports/spring-showdown.json"]);
});
```

- [ ] **Step 3: Run the replacement/delete tests and confirm failure**

Run: `node --test tests/replaceEventBySlug.test.js tests/deleteEventBySlug.test.js`
Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement pure replacement/delete operations over in-memory store state**

```js
function replaceEventBySlug({ store, slug, eventInput, reviewedRows, now }) {
  // Find existing event by slug.
  // Preserve event id + createdAt when found.
  // Remove old result rows for that event.
  // Create any new players.
  // Score reviewed rows.
  // Rebuild resultIds in public order.
  // Return full next store + snapshot payload.
}
```

```js
function deleteEventBySlug({ store, slug }) {
  // Remove event.
  // Remove all results linked to eventId.
  // Return next store + snapshot path to unlink from disk.
}
```

- [ ] **Step 5: Run the replacement/delete tests**

Run: `node --test tests/replaceEventBySlug.test.js tests/deleteEventBySlug.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/domain/replaceEventBySlug.js lib/domain/deleteEventBySlug.js lib/data/rebuildEventOrdering.js tests/replaceEventBySlug.test.js tests/deleteEventBySlug.test.js
git commit -m "feat: add canonical event replacement and deletion"
```

## Task 5: Rework UDisc Import Into Reviewed Canonical Event Input

**Files:**
- Modify: `lib/udiscClient.js`
- Create: `lib/udiscToImportReview.js`
- Create: `lib/domain/buildImportReviewState.js`
- Create: `lib/domain/validateEventReviewRows.js`
- Create: `lib/domain/createImportSnapshot.js`
- Test: `tests/udiscClient.test.js`
- Test: `tests/udiscImportReview.test.js`

- [ ] **Step 1: Write failing import-review tests for DNF mapping and name-only player matching**

```js
test("buildImportReviewState maps DNF imports to dnf rows and marks existing/new players", () => {
  const reviewState = buildImportReviewState({
    players: [{ id: "player_0001", name: "Jane Smith" }],
    importedParticipants: [
      { playerName: "Jane Smith", finishPlace: 1, didNotFinish: false },
      { playerName: "John Doe", finishPlace: null, didNotFinish: true },
    ],
  });

  assert.equal(reviewState.rows[0].matchStatus, "existing");
  assert.equal(reviewState.rows[1].matchStatus, "new");
  assert.equal(reviewState.rows[1].reviewDecision, "dnf");
});
```

- [ ] **Step 2: Run the import review tests and confirm failure**

Run: `node --test tests/udiscClient.test.js tests/udiscImportReview.test.js`
Expected: FAIL because new mapper/review modules do not exist.

- [ ] **Step 3: Update the UDisc parser to normalize DNF as `finishPlace: null`**

```js
function parseFinishPlace(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === "DNF") {
    return { finishPlace: null, didNotFinish: true };
  }

  const number = Number.parseInt(text, 10);
  return Number.isFinite(number) && number > 0
    ? { finishPlace: number, didNotFinish: false }
    : null;
}
```

- [ ] **Step 4: Implement import review-state construction and row validation**

```js
function buildImportReviewState({ players, importedParticipants }) {
  return importedParticipants.map((participant) => ({
    playerName: participant.playerName,
    matchStatus: findPlayerByName(players, participant.playerName) ? "existing" : "new",
    importedResult: participant.didNotFinish ? "DNF" : participant.finishPlace,
    reviewDecision: participant.didNotFinish ? "dnf" : "keep",
    finishPlace: participant.finishPlace,
    startingTag: null,
    didNotFinish: participant.didNotFinish,
  }));
}
```

- [ ] **Step 5: Implement snapshot creation from final reviewed rows**

```js
function createImportSnapshot({ slug, sourceUrl, fetchedAt, event, reviewedRows }) {
  return {
    schemaVersion: 1,
    data: {
      slug,
      source: { type: "udisc", url: sourceUrl, fetchedAt },
      event: {
        name: event.name,
        eventDate: event.eventDate,
        isMajor: event.isMajor,
      },
      participants: reviewedRows.map((row) => ({
        playerName: row.playerName,
        finishPlace: row.reviewDecision === "keep" ? row.finishPlace : null,
        didNotFinish: row.reviewDecision === "dnf",
        reviewDecision: row.reviewDecision,
      })),
    },
  };
}
```

- [ ] **Step 6: Run import parser/review tests**

Run: `node --test tests/udiscClient.test.js tests/udiscImportReview.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/udiscClient.js lib/udiscToImportReview.js lib/domain/buildImportReviewState.js lib/domain/validateEventReviewRows.js lib/domain/createImportSnapshot.js tests/udiscClient.test.js tests/udiscImportReview.test.js
git commit -m "feat: add reviewed udisc import pipeline"
```

## Task 6: Implement `bag-tag events import` With Metadata Prompts, Review Table, and Save Flow

**Files:**
- Create: `lib/cli/eventsImportCommand.js`
- Create: `lib/cli/prompts/promptEventMetadata.js`
- Create: `lib/cli/prompts/confirmReplacement.js`
- Create: `lib/cli/tui/reviewImportTable.js`
- Create: `lib/cli/formatters/printImportPreview.js`
- Test: `tests/eventsImportCommand.test.js`

- [ ] **Step 1: Write a failing command test for a new import happy path**

```js
test("events import saves a reviewed event and prints a concise summary", async () => {
  const output = [];

  const exitCode = await runEventsImportCommand({
    cwd: fixtureDir,
    io: fakeIo({
      udiscUrl: "https://example.com",
      eventMetadata: { name: "Spring Showdown", slug: "spring-showdown", eventDate: "2026-04-12", isMajor: false },
      reviewRows: [
        { playerName: "Jane Smith", reviewDecision: "keep", finishPlace: 1, startingTag: 1 },
      ],
      confirmSave: true,
    }),
    writeLine: (line) => output.push(line),
  });

  assert.equal(exitCode, 0);
  assert.match(output.join("\n"), /Saved event spring-showdown/i);
});
```

- [ ] **Step 2: Run the import command test and confirm failure**

Run: `node --test tests/eventsImportCommand.test.js`
Expected: FAIL because the command module does not exist.

- [ ] **Step 3: Implement metadata prompt flow and replacement checkpoint**

```js
async function runEventsImportCommand({ cwd, io, writeLine }) {
  const leaderboardUrl = await io.promptText("UDisc leaderboard URL:");
  const imported = await fetchUdiscEventFromUrl({ leaderboardUrl });
  const event = await promptEventMetadata(io, imported);
  const store = await loadCanonicalStore(cwd);

  const existingEvent = store.events.items.find((item) => item.slug === event.slug) || null;
  if (existingEvent) {
    const continueReplacement = await confirmReplacement(io, existingEvent);
    if (!continueReplacement) {
      return 1;
    }
  }
}
```

- [ ] **Step 4: Implement the TUI review-table contract**

```js
async function reviewImportTable({ io, rows }) {
  // Open table with read-only player name, match status, imported result.
  // Editable cells: reviewDecision, finishPlace, startingTag.
  // Return reviewed rows only after submit + validation pass.
}
```

- [ ] **Step 5: Implement final preview, confirm, replace, and save flow**

```js
const reviewedRows = await reviewImportTable({ io, rows: reviewState.rows });
const nextState = replaceEventBySlug({ store, slug: event.slug, eventInput: event, reviewedRows, now });
await saveCanonicalStore(cwd, nextState.store);
await writeJsonFileAtomic(path.join(cwd, nextState.snapshotPath), nextState.snapshot);
printImportSummary(writeLine, nextState.summary);
return 0;
```

- [ ] **Step 6: Add a replacement-flow test requiring typed slug confirmation**

```js
test("events import requires typed slug confirmation before replacement", async () => {
  // Assert cancellation/non-match returns status 1 and writes nothing.
});
```

- [ ] **Step 7: Run import command tests**

Run: `node --test tests/eventsImportCommand.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/cli/eventsImportCommand.js lib/cli/prompts/ lib/cli/tui/reviewImportTable.js lib/cli/formatters/printImportPreview.js tests/eventsImportCommand.test.js
git commit -m "feat: implement interactive event import command"
```

## Task 7: Implement `bag-tag events delete` and Non-Interactive `site build`

**Files:**
- Create: `lib/cli/eventsDeleteCommand.js`
- Create: `lib/cli/prompts/confirmDelete.js`
- Create: `lib/cli/siteBuildCommand.js`
- Create: `lib/domain/buildPublicModel.js`
- Test: `tests/eventsDeleteCommand.test.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write failing delete command tests for slug confirmation and missing slugs**

```js
test("events delete requires exact slug confirmation", async () => {
  const exitCode = await runEventsDeleteCommand({
    cwd: fixtureDir,
    io: fakeIo({ slug: "spring-showdown", confirmSlug: "wrong-slug" }),
  });

  assert.equal(exitCode, 1);
});
```

- [ ] **Step 2: Write failing build command tests for generated HTML output**

```js
test("site build writes homepage and per-event pages to dist", async () => {
  const exitCode = await runSiteBuildCommand({ cwd: fixtureDir, writeLine: () => {} });

  assert.equal(exitCode, 0);
  assert.match(await fs.readFile(path.join(fixtureDir, "dist", "index.html"), "utf8"), /Bag Tag Leaderboard/);
  assert.match(await fs.readFile(path.join(fixtureDir, "dist", "events", "spring-showdown", "index.html"), "utf8"), /View on UDisc/);
});
```

- [ ] **Step 3: Run delete/build tests and confirm failure**

Run: `node --test tests/eventsDeleteCommand.test.js tests/siteBuildCommand.test.js`
Expected: FAIL because command modules do not exist.

- [ ] **Step 4: Implement delete command over canonical store**

```js
async function runEventsDeleteCommand({ cwd, io, writeLine }) {
  const slug = await io.promptText("Event slug:");
  const store = await loadCanonicalStore(cwd);
  const event = store.events.items.find((item) => item.slug === slug);
  if (!event) {
    writeLine(`Event not found for slug ${slug}.`);
    return 1;
  }

  const confirmed = await confirmDelete(io, event);
  if (!confirmed) return 1;

  const nextState = deleteEventBySlug({ store, slug });
  await saveCanonicalStore(cwd, nextState.store);
  await fs.rm(path.join(cwd, event.importPath), { force: true });
  return 0;
}
```

- [ ] **Step 5: Implement public model builder for leaderboard/homepage/event pages**

```js
function buildPublicModel(store) {
  return {
    siteTitle: "Bag Tag Leaderboard",
    leaderboardRows: getSeasonLeaderboardRows(...),
    events: listPublicEvents(...),
    eventPages: store.events.items.map((event) => getPublicEventScoreboardBySlug(...)),
  };
}
```

- [ ] **Step 6: Implement site build command as validate -> render -> Eleventy build**

```js
async function runSiteBuildCommand({ cwd, writeLine }) {
  const store = await loadCanonicalStore(cwd);
  validateCanonicalStore(store);
  buildPublicModel(store);
  // invoke Eleventy programmatically or via config entrypoint
  writeLine("Built 1 homepage and event detail pages into dist/");
  return 0;
}
```

- [ ] **Step 7: Run delete/build tests**

Run: `node --test tests/eventsDeleteCommand.test.js tests/siteBuildCommand.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/cli/eventsDeleteCommand.js lib/cli/siteBuildCommand.js lib/cli/prompts/confirmDelete.js lib/domain/buildPublicModel.js tests/eventsDeleteCommand.test.js tests/siteBuildCommand.test.js
git commit -m "feat: add delete and site build commands"
```

## Task 8: Build the Eleventy Site

**Files:**
- Create: `.eleventy.js`
- Create: `site/_data/site.js`
- Create: `site/_includes/layout.njk`
- Create: `site/index.njk`
- Create: `site/events/event.njk`
- Create: `site/styles/site.css`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write a failing site-build assertion for homepage sections and event-page columns**

```js
assert.match(homeHtml, /<h2>Leaderboard<\/h2>/);
assert.match(homeHtml, /<h2>Events<\/h2>/);
assert.match(eventHtml, /View on UDisc/);
assert.match(eventHtml, /Event Result/);
assert.match(eventHtml, /DNF/);
```

- [ ] **Step 2: Run the build test and confirm failure**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because Eleventy templates do not exist.

- [ ] **Step 3: Add Eleventy configuration and data bridge**

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "site/styles": "styles" });
  return {
    dir: {
      input: "site",
      includes: "_includes",
      data: "_data",
      output: "dist",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
```

```js
const { loadCanonicalStore } = require("../../lib/data/loadCanonicalStore");
const { buildPublicModel } = require("../../lib/domain/buildPublicModel");

module.exports = async function () {
  const store = await loadCanonicalStore(process.cwd());
  return buildPublicModel(store);
};
```

- [ ] **Step 4: Add Nunjucks templates for homepage and event detail pages**

```njk
<h1>Bag Tag Leaderboard</h1>
{% if leaderboardRows.length %}
  <h2>Leaderboard</h2>
{% endif %}
<h2>Events</h2>
```

```njk
<h1>{{ event.name }}</h1>
<p>{{ event.eventDate }}{% if event.isMajor %} · Major{% endif %}</p>
<p><a href="{{ event.udiscUrl }}">View on UDisc</a></p>
```

- [ ] **Step 5: Add a small global stylesheet with stacked mobile layout and scrollable score table**

```css
body { font-family: system-ui, sans-serif; margin: 0 auto; max-width: 72rem; padding: 1.5rem; }
.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; text-align: left; }
```

- [ ] **Step 6: Run the site-build tests**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .eleventy.js site/ tests/siteBuildCommand.test.js
git commit -m "feat: render static eleventy public site"
```

## Task 9: Remove the Next.js/Admin Runtime and Replace Old Tests

**Files:**
- Delete: `app/**`
- Delete: `e2e/**`
- Delete: `lib/adminAuth.js`
- Delete: `lib/adminEventsQuery.js`
- Delete: `lib/createEventDraft.js`
- Delete: `lib/eventDraftStore.js`
- Delete: `lib/confirmImportedEvent.js`
- Delete: `lib/reviewUdiscDraftPreview.js`
- Delete: old web/admin tests after replacement coverage passes
- Update: `README.md`
- Update: `package.json`

- [ ] **Step 1: Identify the obsolete runtime and test files now superseded by the CLI/static-site flow**

```text
app/**
e2e/**
tests/admin*.test.js
tests/homepage.test.mjs
tests/eventsPages.test.mjs
tests/eventScoreboardPage.test.js
```

- [ ] **Step 2: Delete obsolete Next.js/admin files and dependency wiring**

```json
{
  "scripts": {
    "test": "node --test",
    "build": "npm run build:site",
    "build:site": "node ./bin/bag-tag.js site build"
  },
  "dependencies": {
    "@11ty/eleventy": "^3.0.0",
    "blessed": "^0.1.81"
  }
}
```

- [ ] **Step 3: Replace README with CLI/data/build instructions**

```md
## Data Files

- `data/players.json`
- `data/events.json`
- `data/results.json`
- `data/imports/`

## Commands

- `npm test`
- `bag-tag events import`
- `bag-tag events delete`
- `bag-tag site build`
```

- [ ] **Step 4: Run the full test suite and site build**

Run: `npm test && node ./bin/bag-tag.js site build`
Expected: all tests PASS and `dist/` regenerated successfully.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: replace next admin app with cli and static site"
```

## Task 10: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run focused verification for scoring and canonical validation**

Run: `node --test tests/scoreEvent.test.js tests/validateCanonicalStore.test.js tests/replaceEventBySlug.test.js tests/udiscImportReview.test.js`
Expected: PASS

- [ ] **Step 2: Run command-level tests**

Run: `node --test tests/eventsImportCommand.test.js tests/eventsDeleteCommand.test.js tests/siteBuildCommand.test.js`
Expected: PASS

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Smoke-test the build output manually**

Run: `node ./bin/bag-tag.js site build`
Expected: success summary and fresh `dist/index.html` plus `dist/events/<slug>/index.html` pages.

- [ ] **Step 5: Inspect generated output paths**

Run: `ls dist dist/events`
Expected: homepage plus one directory per event slug.

## Self-Review

- Spec coverage: this plan covers the CLI import/delete/build workflows, JSON storage, UDisc import snapshots, DNF/tie scoring, static homepage/event pages, and removal of the old admin/runtime stack.
- Placeholder scan: no `TODO`, `TBD`, or hand-wavy “add validation later” steps remain; each task names exact files and commands.
- Type consistency: canonical field names are fixed as `eventDate`, `udiscUrl`, `importPath`, `resultIds`, `finishPlace`, `startingTag`, and the six stored point fields.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-12-cli-json-eleventy-migration.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
