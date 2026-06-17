# Player Name Display Decoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve imported player names exactly as stored while decoding HTML entities only in the public site display output.

**Architecture:** Keep the change inside the public-model layer. Add a tiny display-only HTML-entity decoder, apply it to public-facing `playerName` fields in `buildPublicModel()`, and prove the behavior first with failing tests against the public model and generated site output.

**Tech Stack:** Node.js, built-in `node:test`, CommonJS modules, Eleventy

---

## File Map

- Modify: `lib/domain/buildPublicModel.js`
  Responsible for building homepage and event-page data consumed by the public site. This is the display-time boundary where name decoding should happen.
- Modify: `tests/siteBuildCommand.test.js`
  Responsible for public-model assertions and real Eleventy output assertions. This is the best place to add end-to-end display checks.

No new persistence, import, or template files are needed for this change.

### Task 1: Prove Event-Page Name Decoding in the Public Model

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing test**

Add this test near the existing `buildPublicModel` tests in `tests/siteBuildCommand.test.js`:

```js
test("buildPublicModel decodes HTML entities in event-page player names at display time", () => {
  const store = createStore();
  store.players.items[0].name = 'Troy &quot;NoGripp&quot; Hauck';

  const model = buildPublicModel(store);

  assert.equal(store.players.items[0].name, 'Troy &quot;NoGripp&quot; Hauck');
  assert.equal(model.eventPages[0].scoreboard[0].playerName, 'Troy "NoGripp" Hauck');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: FAIL on the new assertion because `model.eventPages[0].scoreboard[0].playerName` is still `Troy &quot;NoGripp&quot; Hauck`.

- [ ] **Step 3: Write minimal implementation**

Update `lib/domain/buildPublicModel.js` to decode display names while keeping the raw store unchanged:

```js
const { getSeasonLeaderboardRows } = require("../leaderboardQuery");
const {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
} = require("../publicEventsQuery");

function decodeHtmlEntities(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeLeaderboardRows(rows) {
  return rows.map((row) => ({
    ...row,
    playerName: decodeHtmlEntities(row.playerName),
  }));
}

function decodeScoreboardRows(rows) {
  return rows.map((row) => ({
    ...row,
    playerName: decodeHtmlEntities(row.playerName),
  }));
}
```

Then apply those helpers inside `buildPublicModel()`:

```js
return {
  siteTitle: "Bag Tag Leaderboard",
  homepage: {
    leaderboardRows: decodeLeaderboardRows(
      getSeasonLeaderboardRows({
        players: store.players.items,
        events,
        eventResults,
        eventPoints,
      })
    ),
    events: listPublicEvents({ events }),
  },
  eventPages: events.map((event) => {
    const page = getPublicEventScoreboardBySlug({
      slug: event.slug,
      players: store.players.items,
      events,
      eventResults,
      eventPoints,
    });

    const scoreboard = decodeScoreboardRows(page.scoreboard);

    return {
      ...page,
      isMajor: event.isMajor,
      udiscUrl: event.udiscUrl,
      scoreboard:
        event.id === bootstrapEventId
          ? sanitizeBootstrapScoreboard(scoreboard, event.isMajor)
          : scoreboard,
    };
  }),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: PASS, including the new `buildPublicModel decodes HTML entities...` test.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/buildPublicModel.js tests/siteBuildCommand.test.js
git commit -m "fix: decode public player names at display time"
```

### Task 2: Prove Homepage and Rendered HTML Use Decoded Names

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing tests**

Extend `tests/siteBuildCommand.test.js` with one public-model assertion and one real-build assertion:

```js
test("buildPublicModel decodes HTML entities in homepage leaderboard names", () => {
  const store = createStore();
  store.players.items[0].name = 'Troy &quot;NoGripp&quot; Hauck';

  const model = buildPublicModel(store);

  assert.equal(model.homepage.leaderboardRows[0].playerName, 'Troy "NoGripp" Hauck');
});
```

Inside `test("siteBuildCommand builds a real Eleventy site into dist with homepage and event pages", async (t) => { ... })`, add this setup before calling `siteBuildCommand`:

```js
store.players.items[0].name = 'Troy &quot;NoGripp&quot; Hauck';
```

Then add these assertions after reading `homepage` and `eventPage`:

```js
assert.match(homepage, /Troy &quot;NoGripp&quot; Hauck/i);
assert.doesNotMatch(homepage, /Troy &amp;quot;NoGripp&amp;quot; Hauck/i);
assert.match(eventPage, /Troy &quot;NoGripp&quot; Hauck/i);
assert.doesNotMatch(eventPage, /Troy &amp;quot;NoGripp&amp;quot; Hauck/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: FAIL because homepage rows and built HTML still contain the double-encoded source form before the implementation is complete.

- [ ] **Step 3: Write minimal implementation**

If Task 1 was implemented exactly, no additional production change should be needed. Keep production code unchanged here.

If the homepage assertion still fails, make sure the homepage leaderboard path is wrapped with `decodeLeaderboardRows(...)` exactly as shown in Task 1 and do not add template-specific decoding.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: PASS, with both the public-model and Eleventy HTML assertions green.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildPublicModel.js
git commit -m "test: cover decoded public player-name rendering"
```

### Task 3: Broader Verification

**Files:**
- Modify: none
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Run the focused public-site test file**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: PASS with no failures.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: PASS across the repository.

- [ ] **Step 3: Build the site once through the CLI path**

Run: `npm run build`

Expected: build succeeds and prints `Built public site for` with the event-page count.

- [ ] **Step 4: Commit verification-complete state if needed**

If Tasks 1 and 2 already produced clean commits and no new file changes were required here, do not create an extra commit.

If verification exposed a minimal follow-up fix, commit it with:

```bash
git add <touched-files>
git commit -m "fix: finish public name decoding verification"
```

## Self-Review

- Spec coverage checked:
  - preserve stored data unchanged: covered by Task 1 assertion against `store.players.items[0].name`
  - decode only in public model/rendered output: covered by Tasks 1 and 2 implementation/testing scope
  - generated HTML displays decoded name: covered by Task 2 HTML assertions
  - no template-specific decoding: reinforced in Tasks 1 and 2 implementation notes
- Placeholder scan checked: no `TODO`, `TBD`, or vague “handle appropriately” steps remain
- Type consistency checked: plan uses the existing `playerName`, `leaderboardRows`, `scoreboard`, and `buildPublicModel()` names consistently
