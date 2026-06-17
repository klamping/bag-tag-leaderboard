# SQLite Persistence For App Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's in-memory mutable data stores with SQLite-backed persistence so drafts, confirmed events, players, results, and points survive reloads and still support public, admin, and test flows.

**Architecture:** Add a small SQLite database layer with schema bootstrap and repository functions as the new source of truth. Migrate the current store modules and route/query consumers in stages so business logic stays in its existing domain/query modules while reads and writes move onto durable SQLite-backed functions.

**Tech Stack:** Next.js App Router, Node.js, SQLite, Node test runner (`node --test`)

---

## File Structure

- Create: `lib/sqliteDatabase.js`
Purpose: Open the SQLite database file, enable foreign keys, create schema, and expose test-friendly connection/bootstrap helpers.

- Create: `lib/sqliteEventRepository.js`
Purpose: Provide SQLite-backed read/write operations for players, drafts, confirmed events, event results, event points, and reset helpers.

- Modify: `lib/eventsData.js`
Purpose: Stop serving as an in-memory store; either delegate to the SQLite repository or become a compatibility wrapper during migration.

- Modify: `lib/eventDraftStore.js`
Purpose: Stop using module-memory drafts and delegate draft operations to SQLite-backed persistence.

- Modify: `app/api/test/reset/route.js`
Purpose: Reset persisted SQLite-backed state for Playwright/test mode instead of clearing in-memory arrays.

- Modify: `app/events/page.js`
Purpose: Load public event list through SQLite-backed reads.

- Modify: `app/events/[slug]/page.js`
Purpose: Load event scoreboard through SQLite-backed reads.

- Modify: `app/admin/events/page.js`
Purpose: Load admin event index through SQLite-backed reads.

- Modify: `app/admin/events/[slug]/edit/page.js`
Purpose: Resolve admin edit scaffold through SQLite-backed reads.

- Modify: `lib/publicEventsQuery.js`
Purpose: Preserve business query logic but support SQLite-fed data more explicitly if needed.

- Modify: `lib/adminEventsQuery.js`
Purpose: Preserve admin normalization logic but support SQLite-fed data more explicitly if needed.

- Modify: `lib/confirmImportedEvent.js`
Purpose: Continue to own import confirmation logic while using SQLite-backed insert/delete functions.

- Modify: `tests/playwrightResetRoute.test.js`
Purpose: Verify test reset behavior against persisted SQLite state.

- Modify: `tests/confirmImportedEvent.integration.test.js`
Purpose: Verify confirmed imports persist and remain visible through public/leaderboard queries.

- Modify: `tests/eventsData.test.js`
Purpose: Reframe store/repository tests around SQLite-backed behavior.

- Modify: `tests/adminEventsPage.test.js`
Purpose: Ensure admin pages read persisted rows via SQLite-backed store/repository helpers.

- Modify: `tests/adminEventEditPage.test.js`
Purpose: Ensure edit scaffold resolves persisted draft and confirmed events via SQLite-backed reads.

- Modify: `tests/adminEventsQuery.test.js`
Purpose: Keep normalization and sort tests aligned while moving test setup away from module-memory drafts.

- Modify: `tests/homePageRanking.test.js`
Purpose: Ensure leaderboard/public-page tests use SQLite-backed seeded state.

- Modify: `tests/adminNewEventPage.phase6.test.js`
Purpose: Ensure confirmed import flow assertions use persisted state.

## Task 1: Add SQLite Bootstrap And Schema Layer

**Files:**
- Create: `tests/sqliteDatabase.test.js`
- Create: `lib/sqliteDatabase.js`
- Test: `tests/sqliteDatabase.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/sqliteDatabase.test.js` to verify database bootstrap creates the required tables and uses an isolated test database path.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  initializeDatabase,
  queryAll,
  closeDatabase,
} = require("../lib/sqliteDatabase");

test("initializeDatabase creates required schema tables", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bag-tag-sqlite-"));
  const databasePath = path.join(directory, "test.sqlite");

  t.after(async () => {
    await closeDatabase({ databasePath });
    await fs.rm(directory, { recursive: true, force: true });
  });

  await initializeDatabase({ databasePath });

  const rows = await queryAll({
    databasePath,
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  });

  assert.deepEqual(
    rows.map((row) => row.name),
    ["event_drafts", "event_points", "event_results", "events", "players"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sqliteDatabase.test.js`
Expected: FAIL with module-not-found or missing export errors for `../lib/sqliteDatabase`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/sqliteDatabase.js` with connection/bootstrap helpers and schema creation.

```js
const fs = require("node:fs/promises");
const path = require("node:path");
const sqlite3 = require("node:sqlite3");
const { open } = require("node:sqlite");

const connections = new Map();

function resolveDatabasePath(explicitPath) {
  return explicitPath || process.env.SQLITE_DATABASE_PATH || path.join(process.cwd(), "data", "app.sqlite");
}

async function getDatabase({ databasePath } = {}) {
  const resolvedPath = resolveDatabasePath(databasePath);
  const existing = connections.get(resolvedPath);
  if (existing) {
    return existing;
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  const db = await open({ filename: resolvedPath, driver: sqlite3.Database });
  await db.exec("PRAGMA foreign_keys = ON");
  connections.set(resolvedPath, db);
  return db;
}

async function initializeDatabase({ databasePath } = {}) {
  const db = await getDatabase({ databasePath });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS event_drafts (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, date TEXT NOT NULL, is_major INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft');
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, event_date TEXT NOT NULL, is_major INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', season INTEGER NOT NULL, confirmed INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'confirmed');
    CREATE TABLE IF NOT EXISTS event_results (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, finish_place INTEGER NOT NULL, starting_tag INTEGER);
    CREATE TABLE IF NOT EXISTS event_points (id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, event_result_id TEXT NOT NULL UNIQUE REFERENCES event_results(id) ON DELETE CASCADE, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE, attendance INTEGER NOT NULL DEFAULT 0, placement INTEGER NOT NULL DEFAULT 0, starting_tag_bonus INTEGER NOT NULL DEFAULT 0, tag_one_bonus INTEGER NOT NULL DEFAULT 0, beat_your_tag_bonus INTEGER NOT NULL DEFAULT 0, event_total INTEGER, points INTEGER);
  `);
}

async function queryAll({ databasePath, sql, params = [] }) {
  const db = await getDatabase({ databasePath });
  return db.all(sql, params);
}

async function closeDatabase({ databasePath } = {}) {
  const resolvedPath = resolveDatabasePath(databasePath);
  const db = connections.get(resolvedPath);
  if (!db) {
    return;
  }

  connections.delete(resolvedPath);
  await db.close();
}

module.exports = {
  closeDatabase,
  getDatabase,
  initializeDatabase,
  queryAll,
  resolveDatabasePath,
};
```

- [ ] **Step 4: Install required SQLite package(s)**

Run: `npm install sqlite sqlite3`
Expected: dependencies installed and `package.json` / lockfile updated.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/sqliteDatabase.test.js`
Expected: PASS with `1` test passing.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/sqliteDatabase.js tests/sqliteDatabase.test.js
git commit -m "feat: add sqlite bootstrap layer"
```

## Task 2: Add SQLite Repository For Mutable App Data

**Files:**
- Create: `tests/sqliteEventRepository.test.js`
- Create: `lib/sqliteEventRepository.js`
- Test: `tests/sqliteEventRepository.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/sqliteEventRepository.test.js` to cover the first slice of repository behavior: draft persistence, confirmed event persistence, and reset behavior.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { initializeDatabase, closeDatabase } = require("../lib/sqliteDatabase");
const {
  insertEventDraft,
  listEventDrafts,
  findDraftEventBySlug,
  insertConfirmedEvent,
  findConfirmedEventBySlug,
  resetPersistedData,
  loadAllPersistedData,
} = require("../lib/sqliteEventRepository");

test("sqlite repository persists drafts and confirmed events across reads", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bag-tag-repo-"));
  const databasePath = path.join(directory, "test.sqlite");

  t.after(async () => {
    await closeDatabase({ databasePath });
    await fs.rm(directory, { recursive: true, force: true });
  });

  await initializeDatabase({ databasePath });

  const draft = await insertEventDraft({
    databasePath,
    payload: { slug: "draft-night", name: "Draft Night", date: "2026-05-01", isMajor: false, notes: "", status: "draft" },
  });

  const event = await insertConfirmedEvent({
    databasePath,
    payload: { slug: "spring-showdown", name: "Spring Showdown", eventDate: "2026-04-12", isMajor: false, notes: "", season: 2026 },
  });

  assert.equal((await findDraftEventBySlug({ databasePath, slug: "draft-night" })).id, draft.id);
  assert.equal((await findConfirmedEventBySlug({ databasePath, slug: "spring-showdown" })).id, event.id);
  assert.equal((await listEventDrafts({ databasePath })).length, 1);

  const snapshot = await loadAllPersistedData({ databasePath });
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.eventDrafts.length, 1);
});

test("resetPersistedData clears drafts confirmed events players results and points", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bag-tag-reset-"));
  const databasePath = path.join(directory, "test.sqlite");

  t.after(async () => {
    await closeDatabase({ databasePath });
    await fs.rm(directory, { recursive: true, force: true });
  });

  await initializeDatabase({ databasePath });
  await insertEventDraft({ databasePath, payload: { slug: "draft-night", name: "Draft Night", date: "2026-05-01", isMajor: false, notes: "", status: "draft" } });
  await insertConfirmedEvent({ databasePath, payload: { slug: "spring-showdown", name: "Spring Showdown", eventDate: "2026-04-12", isMajor: false, notes: "", season: 2026 } });

  await resetPersistedData({ databasePath });

  assert.deepEqual(await loadAllPersistedData({ databasePath }), {
    players: [],
    events: [],
    eventDrafts: [],
    eventResults: [],
    eventPoints: [],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sqliteEventRepository.test.js`
Expected: FAIL with module-not-found or missing export errors for `../lib/sqliteEventRepository`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/sqliteEventRepository.js` with repository helpers for event drafts, confirmed events, and full-state resets/snapshots.

```js
const { getDatabase, initializeDatabase } = require("./sqliteDatabase");

async function withDatabase({ databasePath }, run) {
  await initializeDatabase({ databasePath });
  const db = await getDatabase({ databasePath });
  return run(db);
}

async function insertEventDraft({ databasePath, payload }) {
  return withDatabase({ databasePath }, async (db) => {
    const nextRow = await db.get("SELECT COUNT(*) AS count FROM event_drafts");
    const id = `evt_draft_${String(nextRow.count + 1).padStart(4, "0")}`;
    await db.run(
      "INSERT INTO event_drafts (id, slug, name, date, is_major, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, payload.slug, payload.name, payload.date, payload.isMajor ? 1 : 0, payload.notes || "", payload.status || "draft"]
    );
    return { id, ...payload, status: payload.status || "draft" };
  });
}

async function listEventDrafts({ databasePath } = {}) {
  return withDatabase({ databasePath }, (db) =>
    db.all("SELECT id, slug, name, date, is_major, notes, status FROM event_drafts ORDER BY id")
      .then((rows) => rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, date: row.date, isMajor: row.is_major === 1, notes: row.notes, status: row.status })))
  );
}

async function findDraftEventBySlug({ databasePath, slug }) {
  return withDatabase({ databasePath }, async (db) => {
    const row = await db.get("SELECT id, slug, name, date, is_major, notes, status FROM event_drafts WHERE slug = ?", [slug]);
    return row ? { id: row.id, slug: row.slug, name: row.name, date: row.date, isMajor: row.is_major === 1, notes: row.notes, status: row.status } : null;
  });
}

async function insertConfirmedEvent({ databasePath, payload }) {
  return withDatabase({ databasePath }, async (db) => {
    const nextRow = await db.get("SELECT COUNT(*) AS count FROM events");
    const id = `evt_confirmed_${String(nextRow.count + 1).padStart(4, "0")}`;
    await db.run(
      "INSERT INTO events (id, slug, name, event_date, is_major, notes, season, confirmed, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'confirmed')",
      [id, payload.slug, payload.name, payload.eventDate, payload.isMajor ? 1 : 0, payload.notes || "", payload.season]
    );
    return { id, ...payload, confirmed: true, status: "confirmed" };
  });
}

async function findConfirmedEventBySlug({ databasePath, slug }) {
  return withDatabase({ databasePath }, async (db) => {
    const row = await db.get("SELECT id, slug, name, event_date, is_major, notes, season, confirmed, status FROM events WHERE slug = ?", [slug]);
    return row ? { id: row.id, slug: row.slug, name: row.name, eventDate: row.event_date, isMajor: row.is_major === 1, notes: row.notes, season: row.season, confirmed: row.confirmed === 1, status: row.status } : null;
  });
}

async function loadAllPersistedData({ databasePath } = {}) {
  return withDatabase({ databasePath }, async (db) => ({
    players: await db.all("SELECT * FROM players ORDER BY id"),
    events: (await db.all("SELECT * FROM events ORDER BY id")).map((row) => ({ ...row, eventDate: row.event_date, isMajor: row.is_major === 1, confirmed: row.confirmed === 1 })),
    eventDrafts: (await db.all("SELECT * FROM event_drafts ORDER BY id")).map((row) => ({ ...row, isMajor: row.is_major === 1 })),
    eventResults: (await db.all("SELECT id, event_id AS eventId, player_id AS playerId, finish_place AS finishPlace, starting_tag AS startingTag FROM event_results ORDER BY id")),
    eventPoints: (await db.all("SELECT id, event_id AS eventId, event_result_id AS eventResultId, player_id AS playerId, attendance, placement, starting_tag_bonus AS startingTagBonus, tag_one_bonus AS tagOneBonus, beat_your_tag_bonus AS beatYourTagBonus, event_total AS eventTotal, points FROM event_points ORDER BY id")),
  }));
}

async function resetPersistedData({ databasePath } = {}) {
  return withDatabase({ databasePath }, async (db) => {
    await db.exec("DELETE FROM event_points; DELETE FROM event_results; DELETE FROM event_drafts; DELETE FROM events; DELETE FROM players;");
  });
}

module.exports = {
  findConfirmedEventBySlug,
  findDraftEventBySlug,
  insertConfirmedEvent,
  insertEventDraft,
  listEventDrafts,
  loadAllPersistedData,
  resetPersistedData,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/sqliteEventRepository.test.js`
Expected: PASS with `2` tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/sqliteEventRepository.js tests/sqliteEventRepository.test.js
git commit -m "feat: add sqlite event repository"
```

## Task 3: Migrate Store Modules And Reset Route To SQLite

**Files:**
- Modify: `tests/eventsData.test.js`
- Modify: `tests/playwrightResetRoute.test.js`
- Modify: `lib/eventsData.js`
- Modify: `lib/eventDraftStore.js`
- Modify: `app/api/test/reset/route.js`
- Test: `tests/eventsData.test.js`
- Test: `tests/playwrightResetRoute.test.js`

- [ ] **Step 1: Write the failing tests**

Update the existing tests so they assert SQLite-backed behavior and empty runtime defaults.

In `tests/eventsData.test.js`, replace assumptions about the default seeded `spring-showdown` with explicit reset/setup and SQLite-backed snapshot assertions:

```js
assert.deepEqual(await getEventsData(), {
  players: [],
  events: [],
  eventResults: [],
  eventPoints: [],
});
```

In `tests/playwrightResetRoute.test.js`, keep the same behavioral expectations but await async SQLite-backed reset helpers.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/eventsData.test.js tests/playwrightResetRoute.test.js`
Expected: FAIL because the current store modules are still synchronous in-memory implementations with a seeded default event.

- [ ] **Step 3: Write minimal implementation**

Rework `lib/eventsData.js` and `lib/eventDraftStore.js` into SQLite-backed wrappers over the repository, and update the reset API route to await persistent clearing.

Representative implementation shape for `lib/eventsData.js`:

```js
const repository = require("./sqliteEventRepository");

async function getEventsData(options = {}) {
  const snapshot = await repository.loadAllPersistedData(options);
  return {
    players: snapshot.players,
    events: snapshot.events.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      eventDate: row.eventDate,
      isMajor: row.isMajor,
      notes: row.notes,
      season: row.season,
      confirmed: row.confirmed,
      status: row.status,
    })),
    eventResults: snapshot.eventResults,
    eventPoints: snapshot.eventPoints,
  };
}

async function resetEventsData(overrides = null, options = {}) {
  await repository.resetPersistedData(options);
  if (!overrides) {
    return getEventsData(options);
  }

  for (const player of overrides.players || []) {
    await repository.insertPlayer({ ...options, payload: player });
  }

  for (const event of overrides.events || []) {
    await repository.insertConfirmedEvent({ ...options, payload: event });
  }

  for (const result of overrides.eventResults || []) {
    await repository.insertEventResult({ ...options, payload: result });
  }

  for (const point of overrides.eventPoints || []) {
    await repository.insertEventPoint({ ...options, payload: point });
  }

  return getEventsData(options);
}
```

Update `app/api/test/reset/route.js`:

```js
await resetEventsData({
  players: [],
  events: [],
  eventResults: [],
  eventPoints: [],
});
await resetEventDraftStore();
```

Remove the implicit runtime `spring-showdown` seed entirely.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/eventsData.test.js tests/playwrightResetRoute.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/eventsData.js lib/eventDraftStore.js app/api/test/reset/route.js tests/eventsData.test.js tests/playwrightResetRoute.test.js
git commit -m "feat: back stores with sqlite persistence"
```

## Task 4: Migrate Public And Admin Reads To SQLite-Backed Data

**Files:**
- Modify: `tests/adminEventsPage.test.js`
- Modify: `tests/adminEventEditPage.test.js`
- Modify: `tests/homePageRanking.test.js`
- Modify: `app/events/page.js`
- Modify: `app/events/[slug]/page.js`
- Modify: `app/admin/events/page.js`
- Modify: `app/admin/events/[slug]/edit/page.js`
- Test: `tests/adminEventsPage.test.js`
- Test: `tests/adminEventEditPage.test.js`
- Test: `tests/homePageRanking.test.js`

- [ ] **Step 1: Write the failing tests**

Update route tests to use async SQLite-backed store setup instead of synchronous in-memory resets.

For example, in `tests/adminEventsPage.test.js`:

```js
await eventsData.resetEventsData({
  events: [
    {
      id: "evt_confirmed_0007",
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      status: "confirmed",
      season: 2026,
    },
  ],
  players: [],
  eventResults: [],
  eventPoints: [],
});

await eventDraftStore.resetEventDraftStore();
await eventDraftStore.insertEventDraft({
  slug: "draft-night",
  name: "Draft Night",
  date: "2026-05-01",
  status: "draft",
});
```

Update page loaders in tests to await async data access if needed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/adminEventsPage.test.js tests/adminEventEditPage.test.js tests/homePageRanking.test.js`
Expected: FAIL because page loaders and/or store setup still assume synchronous in-memory reads.

- [ ] **Step 3: Write minimal implementation**

Update routes to await SQLite-backed store reads.

Representative changes:

```js
async function loadPublicEvents() {
  const { events } = await getEventsData();
  return listPublicEvents({ events });
}

async function loadEventScoreboard({ slug }) {
  const { players, events, eventResults, eventPoints } = await getEventsData();
  return getPublicEventScoreboardBySlug({ slug, players, events, eventResults, eventPoints });
}
```

And for admin pages:

```js
const { events } = await getEventsData();
const drafts = await listEventDrafts();
```

Keep the query/business logic modules focused on normalization and sorting; only the data-loading boundary should become async.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/adminEventsPage.test.js tests/adminEventEditPage.test.js tests/homePageRanking.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/events/page.js app/events/[slug]/page.js app/admin/events/page.js app/admin/events/[slug]/edit/page.js tests/adminEventsPage.test.js tests/adminEventEditPage.test.js tests/homePageRanking.test.js
git commit -m "feat: load public and admin views from sqlite"
```

## Task 5: Migrate Confirmed Import And Persistence Regression Path

**Files:**
- Modify: `tests/confirmImportedEvent.integration.test.js`
- Modify: `tests/adminNewEventPage.phase6.test.js`
- Modify: `lib/sqliteEventRepository.js`
- Modify: `lib/eventsData.js`
- Test: `tests/confirmImportedEvent.integration.test.js`
- Test: `tests/adminNewEventPage.phase6.test.js`

- [ ] **Step 1: Write the failing tests**

Update integration coverage to verify confirmed imports survive a fresh SQLite-backed reload.

In `tests/confirmImportedEvent.integration.test.js`, add an explicit reload assertion:

```js
const firstSnapshot = await getEventsData();
assert.equal(getPublicEventScoreboardBySlug({ slug: "summer-sizzler", ...firstSnapshot }).scoreboard.length, 2);

const reloadedSnapshot = await getEventsData();
assert.equal(getPublicEventScoreboardBySlug({ slug: "summer-sizzler", ...reloadedSnapshot }).scoreboard.length, 2);
```

Update `tests/adminNewEventPage.phase6.test.js` so persisted assertions await SQLite-backed snapshots.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/confirmImportedEvent.integration.test.js tests/adminNewEventPage.phase6.test.js`
Expected: FAIL because some insert/delete helpers or snapshot reads still assume in-memory behavior.

- [ ] **Step 3: Write minimal implementation**

Fill out the remaining SQLite repository helpers needed by the confirmed import path:

- `insertPlayer`
- `deletePlayer`
- `insertEventResult`
- `deleteEventResult`
- `insertEventPoint`
- `deleteEventPoint`

Representative implementation shape:

```js
async function insertEventResult({ databasePath, payload }) {
  return withDatabase({ databasePath }, async (db) => {
    const nextRow = await db.get("SELECT COUNT(*) AS count FROM event_results");
    const id = `result_${String(nextRow.count + 1).padStart(4, "0")}`;
    await db.run(
      "INSERT INTO event_results (id, event_id, player_id, finish_place, starting_tag) VALUES (?, ?, ?, ?, ?)",
      [id, payload.eventId, payload.playerId, payload.finishPlace, payload.startingTag ?? null]
    );
    return { id, ...payload };
  });
}
```

Make `lib/eventsData.js` wrapper methods delegate to these repository helpers so `confirmImportedEvent` can keep its current dependency contract.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/confirmImportedEvent.integration.test.js tests/adminNewEventPage.phase6.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sqliteEventRepository.js lib/eventsData.js tests/confirmImportedEvent.integration.test.js tests/adminNewEventPage.phase6.test.js
git commit -m "feat: persist confirmed imports in sqlite"
```

## Task 6: Run Full Persistence Regression Suite

**Files:**
- Modify only if a missing regression assertion is discovered:
  - `tests/sqliteDatabase.test.js`
  - `tests/sqliteEventRepository.test.js`
  - `tests/playwrightResetRoute.test.js`
  - `tests/confirmImportedEvent.integration.test.js`
  - `tests/adminEventsPage.test.js`
  - `tests/adminEventEditPage.test.js`
  - `tests/homePageRanking.test.js`

- [ ] **Step 1: Add any missing failing regression assertion only if needed**

If a key persistence assertion is still missing, add it first via TDD before the final suite run. Prefer the exact bug-fix path: persisted import remains visible after fresh reload.

- [ ] **Step 2: Run the focused persistence verification suite**

Run: `npm test -- tests/sqliteDatabase.test.js tests/sqliteEventRepository.test.js tests/eventsData.test.js tests/playwrightResetRoute.test.js tests/confirmImportedEvent.integration.test.js tests/adminEventsPage.test.js tests/adminEventEditPage.test.js tests/homePageRanking.test.js tests/adminNewEventPage.phase6.test.js`
Expected: PASS.

- [ ] **Step 3: Run the full project test suite**

Run: `npm test`
Expected: PASS with no regressions.

- [ ] **Step 4: Commit only if files changed in this task**

If Task 6 required additional assertions or fixes:

```bash
git add tests/sqliteDatabase.test.js tests/sqliteEventRepository.test.js tests/playwrightResetRoute.test.js tests/confirmImportedEvent.integration.test.js tests/adminEventsPage.test.js tests/adminEventEditPage.test.js tests/homePageRanking.test.js tests/adminNewEventPage.phase6.test.js
git commit -m "test: complete sqlite persistence coverage"
```

If no files changed, do not create an empty commit.

## Spec Coverage Check

- SQLite-backed persistence for drafts, confirmed events, players, results, and points: covered in Tasks 1-5.
- Removal of implicit seeded `spring-showdown` runtime state: covered in Task 3.
- Public event and admin pages read durable SQLite-backed state: covered in Task 4.
- Confirmed imports survive reload and still show on `/events/[slug]`: covered in Task 5.
- Test and Playwright reset flows operate on persisted state: covered in Task 3 and Task 6.
- Database initialization fails loudly and becomes the only runtime source of truth: established in Task 1 and enforced through the migration tasks.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation placeholders remain.
- Every task contains exact file paths, explicit test commands, and concrete implementation snippets.
- Helper names are consistent across tasks: `initializeDatabase`, `sqliteEventRepository`, `resetPersistedData`, `loadAllPersistedData`, `getEventsData`, `listEventDrafts`.
