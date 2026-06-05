# Phase 6 Confirm Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm a reviewed UDisc import by creating any new players, persisting a confirmed event plus results/points, and making that event visible through the existing leaderboard and public event queries.

**Architecture:** Add one app-owned confirm-import service in `lib/confirmImportedEvent.js` that consumes the Phase 5 reviewed preview payload and performs validation, unmatched-player creation, event/result persistence, and scoring before any writes are committed. Keep `app/admin/events/new/page.js` as a thin server-action/render boundary, and extend the in-memory `lib/eventsData.js` store with small mutation helpers so the default path can persist confirmed data used by existing query modules.

**Tech Stack:** Next.js server actions, Node test runner (`node:test`), strict asserts, existing in-memory data modules, existing `scoreEvent` scoring engine.

---

## File Structure

- Create: `lib/confirmImportedEvent.js` - server-side confirm-import service.
- Create: `tests/confirmImportedEvent.test.js` - focused service tests for validation, unmatched-player creation, and write ordering.
- Create: `tests/adminNewEventPage.phase6.test.js` - page/action tests for confirm UX and redirects.
- Create: `tests/confirmImportedEvent.integration.test.js` - read-side regression coverage using real queries after confirm.
- Modify: `lib/eventsData.js` - add reset + insert helpers for players, confirmed events, event results, and event points.
- Modify: `app/admin/events/new/page.js` - add confirm action, success/error query-param handling, and confirm button rendering.
- Modify: `plans/bag-tag-leaderboard-implementation-progress.md` - mark Phase 6 tasks complete after implementation.

---

### Task 1: Build the confirm-import service contract

**Files:**
- Create: `lib/confirmImportedEvent.js`
- Create: `tests/confirmImportedEvent.test.js`

- [ ] **Step 1: Write failing service tests for the approved import rules**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { confirmImportedEvent } = require("../lib/confirmImportedEvent.js");

test("confirmImportedEvent confirms matched and unmatched rows in one import", async () => {
  const insertedPlayers = [];
  const insertedEvents = [];
  const insertedResults = [];
  const insertedPoints = [];

  const result = await confirmImportedEvent({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown-2", date: "2026-04-19", isMajor: false, notes: "" },
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
      ],
    },
    findExistingEventBySlug: async () => null,
    insertPlayer: async (payload) => {
      insertedPlayers.push(payload);
      return { id: "player_2", ...payload };
    },
    insertConfirmedEvent: async (payload) => {
      insertedEvents.push(payload);
      return { id: "evt_confirmed_2", ...payload };
    },
    insertEventResults: async (payload) => {
      insertedResults.push(...payload);
      return payload.map((row, index) => ({ id: `result_${index + 1}`, ...row }));
    },
    insertEventPoints: async (payload) => {
      insertedPoints.push(...payload);
      return payload;
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(insertedPlayers, [{ name: "New Person" }]);
  assert.equal(insertedEvents[0].status, "confirmed");
  assert.deepEqual(insertedResults.map((row) => row.playerId), ["player_1", "player_2"]);
  assert.equal(insertedPoints.length, 2);
});

test("confirmImportedEvent rejects ambiguous rows and performs no writes", async () => {
  let writes = 0;

  const result = await confirmImportedEvent({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown-2", date: "2026-04-19", isMajor: false, notes: "" },
      participants: [
        { playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1, matchStatus: "ambiguous" },
      ],
    },
    findExistingEventBySlug: async () => null,
    insertPlayer: async () => { writes += 1; },
    insertConfirmedEvent: async () => { writes += 1; },
    insertEventResults: async () => { writes += 1; },
    insertEventPoints: async () => { writes += 1; },
  });

  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.participants_0_matchStatus, "Imported player could not be uniquely matched to a returning player");
  assert.equal(writes, 0);
});
```

- [ ] **Step 2: Run the service tests and verify they fail**

Run: `npm test -- tests/confirmImportedEvent.test.js`
Expected: FAIL because `lib/confirmImportedEvent.js` does not exist yet.

- [ ] **Step 3: Implement the minimal confirm-import service**

```js
const { scoreEvent } = require("./scoreEvent.js");

function validateReviewedPreview(preview) {
  const fieldErrors = {};
  const event = preview?.event || {};
  const participants = Array.isArray(preview?.participants) ? preview.participants : [];

  if (!String(event.name || "").trim()) fieldErrors.name = "Event name is required";
  if (!String(event.slug || "").trim()) fieldErrors.slug = "Event slug is required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(event.date || ""))) {
    fieldErrors.date = "Event date is required";
  }

  const matchedTagIndexes = new Map();

  participants.forEach((participant, index) => {
    if (!String(participant?.playerName || "").trim()) {
      fieldErrors[`participants_${index}_playerName`] = "Participant name is required";
    }

    if (!Number.isInteger(participant?.finishPlace) || participant.finishPlace < 1) {
      fieldErrors[`participants_${index}_finishPlace`] = "Participant place is required";
    }

    if (participant?.matchStatus === "ambiguous") {
      fieldErrors[`participants_${index}_matchStatus`] =
        "Imported player could not be uniquely matched to a returning player";
      return;
    }

    if (participant?.matchStatus === "matched") {
      if (!String(participant?.matchedPlayerId || "").trim()) {
        fieldErrors[`participants_${index}_matchedPlayerId`] = "Matched player id is required";
      }

      if (!Number.isInteger(participant?.startingTag) || participant.startingTag < 1) {
        fieldErrors[`participants_${index}_startingTag`] = "Starting tag must be at least 1";
      } else {
        const indexes = matchedTagIndexes.get(participant.startingTag) || [];
        indexes.push(index);
        matchedTagIndexes.set(participant.startingTag, indexes);
      }
    }
  });

  for (const indexes of matchedTagIndexes.values()) {
    if (indexes.length < 2) continue;
    indexes.forEach((index) => {
      fieldErrors[`participants_${index}_startingTag`] = "Starting tags must be unique";
    });
  }

  return fieldErrors;
}

async function confirmImportedEvent({
  preview,
  findExistingEventBySlug,
  insertPlayer,
  insertConfirmedEvent,
  insertEventResults,
  insertEventPoints,
  scoreEventFn = scoreEvent,
}) {
  const fieldErrors = validateReviewedPreview(preview);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  if (await findExistingEventBySlug(preview.event.slug)) {
    return { ok: false, fieldErrors: { slug: "Slug is already in use" } };
  }

  const resolvedParticipants = [];
  for (const participant of preview.participants) {
    if (participant.matchStatus === "matched") {
      resolvedParticipants.push({
        playerId: participant.matchedPlayerId,
        playerName: participant.matchedPlayerName || participant.playerName,
        finishPlace: participant.finishPlace,
        startingTag: participant.startingTag,
      });
      continue;
    }

    const createdPlayer = await insertPlayer({ name: participant.playerName });
    resolvedParticipants.push({
      playerId: createdPlayer.id,
      playerName: createdPlayer.name,
      finishPlace: participant.finishPlace,
    });
  }

  const scoredRows = scoreEventFn({
    isMajor: Boolean(preview.event.isMajor),
    participants: resolvedParticipants.map(({ playerId, finishPlace, startingTag }) => ({ playerId, finishPlace, startingTag })),
  });

  const insertedEvent = await insertConfirmedEvent({
    slug: preview.event.slug,
    name: preview.event.name,
    eventDate: preview.event.date,
    isMajor: Boolean(preview.event.isMajor),
    notes: String(preview.event.notes || ""),
    status: "confirmed",
    season: 2026,
  });

  const insertedResults = await insertEventResults(
    resolvedParticipants.map((participant) => ({
      eventId: insertedEvent.id,
      playerId: participant.playerId,
      startingTag: participant.startingTag,
      finishPlace: participant.finishPlace,
    }))
  );

  await insertEventPoints(
    insertedResults.map((resultRow) => ({
      eventResultId: resultRow.id,
      ...scoredRows.find((row) => row.playerId === resultRow.playerId),
    }))
  );

  return { ok: true, event: insertedEvent, participants: resolvedParticipants };
}
```

Implementation details:
- Keep all validation in this module so the admin action does not re-encode business rules.
- Perform slug-collision checks before any writes.
- Build the scored payload before the event/result/point writes start.
- Treat unmatched rows as new players and do not invent `startingTag` values for them.
- Return `fieldErrors` instead of throwing for expected validation failures.

- [ ] **Step 4: Extend service tests for duplicate slug and no-partial-write scoring failures**

```js
test("confirmImportedEvent rejects duplicate slugs before writes", async () => {
  const result = await confirmImportedEvent({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-19", isMajor: false, notes: "" },
      participants: [],
    },
    findExistingEventBySlug: async () => ({ id: "evt_existing" }),
    insertPlayer: async () => assert.fail("should not write players"),
    insertConfirmedEvent: async () => assert.fail("should not write event"),
    insertEventResults: async () => assert.fail("should not write results"),
    insertEventPoints: async () => assert.fail("should not write points"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.slug, "Slug is already in use");
});

test("confirmImportedEvent does not persist event rows if scoring fails", async () => {
  let eventWrites = 0;
  const result = await confirmImportedEvent({
    preview: {
      event: { name: "Broken Event", slug: "broken-event", date: "2026-04-19", isMajor: false, notes: "" },
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
      ],
    },
    findExistingEventBySlug: async () => null,
    insertPlayer: async () => assert.fail("should not create player"),
    insertConfirmedEvent: async () => { eventWrites += 1; },
    insertEventResults: async () => { eventWrites += 1; },
    insertEventPoints: async () => { eventWrites += 1; },
    scoreEventFn: () => {
      throw new Error("score failed");
    },
  }).catch((error) => ({ ok: false, error }));

  assert.equal(result.ok, false);
  assert.equal(eventWrites, 0);
});
```

- [ ] **Step 5: Run targeted tests and verify pass**

Run: `npm test -- tests/confirmImportedEvent.test.js`
Expected: PASS for matched/unmatched import, ambiguous-row rejection, duplicate slug rejection, and no-partial-write failure coverage.

- [ ] **Step 6: Commit**

```bash
git add lib/confirmImportedEvent.js tests/confirmImportedEvent.test.js
git commit -m "feat: add confirm import service for reviewed previews"
```

---

### Task 2: Add default confirmed-data persistence helpers

**Files:**
- Modify: `lib/eventsData.js`
- Create: `tests/confirmImportedEvent.integration.test.js`

- [ ] **Step 1: Write failing integration tests that need mutable confirmed-data storage**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const eventsData = require("../lib/eventsData.js");
const { confirmImportedEvent } = require("../lib/confirmImportedEvent.js");
const { getSeasonLeaderboardRows } = require("../lib/leaderboardQuery.js");
const { listPublicEvents, getPublicEventScoreboardBySlug } = require("../lib/publicEventsQuery.js");

test("confirmed import appears in leaderboard and public event queries", async () => {
  eventsData.resetEventsData({
    players: [{ id: "player_1", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });

  await confirmImportedEvent({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown-2", date: "2026-04-19", isMajor: false, notes: "" },
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
      ],
    },
    findExistingEventBySlug: async (slug) => eventsData.findConfirmedEventBySlug(slug),
    insertPlayer: eventsData.insertPlayer,
    insertConfirmedEvent: eventsData.insertConfirmedEvent,
    insertEventResults: eventsData.insertEventResults,
    insertEventPoints: eventsData.insertEventPoints,
  });

  const snapshot = eventsData.getEventsData();
  assert.equal(listPublicEvents({ events: snapshot.events }).length, 1);
  assert.equal(getPublicEventScoreboardBySlug({ slug: "spring-showdown-2", ...snapshot }).scoreboard.length, 1);
  assert.equal(getSeasonLeaderboardRows(snapshot)[0].playerId, "player_1");
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `npm test -- tests/confirmImportedEvent.integration.test.js`
Expected: FAIL because `lib/eventsData.js` does not expose reset/insert helpers yet.

- [ ] **Step 3: Extend the in-memory events store with small mutation helpers**

```js
const DEFAULT_EVENTS_DATA = {
  players: [],
  events: [
    { id: "evt_confirmed_0001", slug: "spring-showdown", name: "Spring Showdown", eventDate: "2026-04-12", status: "confirmed" },
  ],
  eventResults: [],
  eventPoints: [],
};

let EVENTS_DATA = structuredClone(DEFAULT_EVENTS_DATA);
let nextPlayerNumber = 1;
let nextConfirmedEventNumber = 2;
let nextEventResultNumber = 1;

function resetEventsData(overrides = null) {
  EVENTS_DATA = overrides ? structuredClone(overrides) : structuredClone(DEFAULT_EVENTS_DATA);
  nextPlayerNumber = EVENTS_DATA.players.length + 1;
  nextConfirmedEventNumber = EVENTS_DATA.events.length + 1;
  nextEventResultNumber = EVENTS_DATA.eventResults.length + 1;
}

async function insertPlayer(payload) {
  const player = { id: `player_${nextPlayerNumber++}`, name: String(payload.name || "").trim() };
  EVENTS_DATA.players.push(player);
  return player;
}

async function insertConfirmedEvent(payload) {
  const event = { id: `evt_confirmed_${String(nextConfirmedEventNumber++).padStart(4, "0")}`, ...payload, status: "confirmed" };
  EVENTS_DATA.events.push(event);
  return event;
}

function findConfirmedEventBySlug(slug) {
  return EVENTS_DATA.events.find((event) => event.slug === slug && event.status === "confirmed") || null;
}

async function insertEventResults(rows) {
  const insertedRows = rows.map((row) => ({
    id: `result_${String(nextEventResultNumber++).padStart(4, "0")}`,
    ...row,
  }));
  EVENTS_DATA.eventResults.push(...insertedRows);
  return insertedRows;
}

async function insertEventPoints(rows) {
  EVENTS_DATA.eventPoints.push(...rows);
  return rows;
}
```

Implementation details:
- Keep helpers intentionally small and in-memory only; this phase does not introduce a general repository abstraction.
- Add `findConfirmedEventBySlug(slug)` for the default confirm path.
- Add `insertEventResults(rows)` and `insertEventPoints(rows)` as batch helpers returning the inserted rows.
- Preserve the existing `getEventsData()` export so read-side code stays unchanged.

- [ ] **Step 4: Run integration tests and verify pass**

Run: `npm test -- tests/confirmImportedEvent.integration.test.js`
Expected: PASS and the confirmed import is visible through `leaderboardQuery` and `publicEventsQuery`.

- [ ] **Step 5: Commit**

```bash
git add lib/eventsData.js tests/confirmImportedEvent.integration.test.js
git commit -m "feat: add in-memory persistence helpers for confirmed imports"
```

---

### Task 3: Wire the admin confirm action and confirm-state UI

**Files:**
- Modify: `app/admin/events/new/page.js`
- Create: `tests/adminNewEventPage.phase6.test.js`

- [ ] **Step 1: Write failing page/action tests for Phase 6 confirm behavior**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("renderUdiscPreviewSection renders a confirm button when preview_valid=1", async () => {
  const { renderUdiscPreviewSection } = await import("../app/admin/events/new/page.js");

  const html = renderToStaticMarkup(
    renderUdiscPreviewSection({
      previewValid: true,
      preview: {
        event: { name: "Spring Showdown", slug: "spring-showdown-2", date: "2026-04-19" },
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
        ],
      },
      reviewAction: async () => {},
      confirmAction: async () => {},
    })
  );

  assert.match(html, /Confirm Import/);
  assert.match(html, /name="previewPayload"/);
});

test("confirmUdiscImportAction redirects to success state after a successful import", async () => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    confirmImportedEventAdapter: async () => ({
      ok: true,
      event: { slug: "spring-showdown-2" },
    }),
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set("previewPayload", JSON.stringify({ event: { slug: "spring-showdown-2" }, participants: [] }));
  await action({}, formData);

  assert.deepEqual(redirects, ["/admin/events/new?confirmed=1&confirmed_slug=spring-showdown-2"]);
});
```

- [ ] **Step 2: Run the page/action tests and verify they fail**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js`
Expected: FAIL because the confirm action and confirm-state rendering do not exist yet.

- [ ] **Step 3: Implement the confirm action and conditional confirm UI**

```js
import confirmImportedEventModule from "../../../../lib/confirmImportedEvent.js";
import eventsDataModule from "../../../../lib/eventsData.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";

const { confirmImportedEvent } = confirmImportedEventModule;
const {
  findConfirmedEventBySlug,
  insertPlayer,
  insertConfirmedEvent,
  insertEventResults,
  insertEventPoints,
} = eventsDataModule;
const { findEventBySlug } = eventDraftStore;

export function createConfirmUdiscImportAction({
  requireAdminAccess = requireAdmin,
  confirmImportedEventAdapter = confirmImportedEvent,
  redirectTo = redirect,
} = {}) {
  return async function confirmUdiscImportAction(_previousState, formData) {
    "use server";

    requireAdminAccess();
    const preview = parsePreviewPayload(formData.get("previewPayload"));
    if (!preview) {
      redirectTo("/admin/events/new?confirm_error=Imported+preview+is+invalid.");
      return;
    }

    const result = await confirmImportedEventAdapter({
      preview,
      findExistingEventBySlug: async (slug) => (await findEventBySlug(slug)) || findConfirmedEventBySlug(slug),
      insertPlayer,
      insertConfirmedEvent,
      insertEventResults,
      insertEventPoints,
    });

    if (!result.ok) {
      redirectTo(buildPreviewRedirectUrl({ preview, reviewErrors: result.fieldErrors }));
      return;
    }

    redirectTo(`/admin/events/new?confirmed=1&confirmed_slug=${encodeURIComponent(result.event.slug)}`);
  };
}
```

Implementation details:
- Thread `previewValid` through `renderUdiscPreviewSection` and `AdminNewEventPage` from the existing `preview_valid` query param.
- Keep the existing review form for invalid/incomplete reviewed previews.
- Render a second confirm form with hidden `previewPayload` only when `previewValid === true`.
- Add `confirmed` success messaging and a separate `confirm_error` message slot for malformed payloads.

- [ ] **Step 4: Run targeted page/action tests and verify pass**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js tests/adminNewEventPage.phase5.test.js tests/adminNewEventPage.test.js`
Expected: PASS with confirm button rendering, success redirect, malformed-payload handling, and no regression to existing review/fetch flows.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/new/page.js tests/adminNewEventPage.phase6.test.js
git commit -m "feat: add admin confirm action for reviewed imports"
```

---

### Task 4: Run final regression coverage and update progress tracking

**Files:**
- Modify: `tests/confirmImportedEvent.test.js`
- Modify: `tests/adminNewEventPage.phase6.test.js`
- Modify: `plans/bag-tag-leaderboard-implementation-progress.md`

- [ ] **Step 1: Add the last regression assertions required by the Phase 6 spec**

```js
test("confirmImportedEvent surfaces duplicate starting-tag validation for matched rows", async () => {
  const result = await confirmImportedEvent({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown-2", date: "2026-04-19", isMajor: false, notes: "" },
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
          playerName: "Bob Jones",
          externalPlayerId: "u2",
          finishPlace: 2,
          matchStatus: "matched",
          matchedPlayerId: "player_2",
          matchedPlayerName: "Bob Jones",
          startingTag: 8,
        },
      ],
    },
    findExistingEventBySlug: async () => null,
    insertPlayer: async () => assert.fail("should not create player"),
    insertConfirmedEvent: async () => assert.fail("should not write event"),
    insertEventResults: async () => assert.fail("should not write results"),
    insertEventPoints: async () => assert.fail("should not write points"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.participants_0_startingTag, "Starting tags must be unique");
  assert.equal(result.fieldErrors.participants_1_startingTag, "Starting tags must be unique");
});
```

- [ ] **Step 2: Run the full relevant suite**

Run: `npm test -- tests/confirmImportedEvent.test.js tests/confirmImportedEvent.integration.test.js tests/adminNewEventPage.test.js tests/adminNewEventPage.phase5.test.js tests/adminNewEventPage.phase6.test.js tests/leaderboardQuery.test.js tests/publicEventsQuery.test.js tests/scoreEvent.test.js`
Expected: PASS with no confirm-import regressions in read-side queries or scoring.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS and Next.js compiles the updated admin route successfully.

- [ ] **Step 4: Update implementation progress tracking**

```md
## Phase 6: Confirm Import

### Task 6.1 - Define confirm-import service contract
- Status: `[x] Completed`

### Task 6.2 - Validate reviewed preview and block invalid imports
- Status: `[x] Completed`

### Task 6.3 - Create new player records for unmatched imports
- Status: `[x] Completed`

### Task 6.4 - Persist confirmed event and event results
- Status: `[x] Completed`

### Task 6.5 - Score confirmed import and persist event points
- Status: `[x] Completed`

### Task 6.6 - Wire admin confirm action and success/error UX
- Status: `[x] Completed`

### Task 6.7 - Add confirm-import verification coverage
- Status: `[x] Completed`
```

- [ ] **Step 5: Commit**

```bash
git add plans/bag-tag-leaderboard-implementation-progress.md tests/confirmImportedEvent.test.js tests/adminNewEventPage.phase6.test.js
git commit -m "test: cover confirmed import persistence and admin flow"
```

---

## Spec Coverage Checklist

- Re-validate reviewed preview server-side before writes: Task 1.
- Create new player records for unmatched rows during confirm: Task 1 + Task 2.
- Block malformed payloads, ambiguous rows, duplicate matched tags, and duplicate slugs: Task 1 + Task 3.
- Persist confirmed event, results, and scored event points: Task 1 + Task 2.
- Expose successful imports through leaderboard and public event queries: Task 2.
- Add admin confirm button, redirects, and success/error UX: Task 3.
- Run focused tests plus full build verification and update progress tracking: Task 4.
