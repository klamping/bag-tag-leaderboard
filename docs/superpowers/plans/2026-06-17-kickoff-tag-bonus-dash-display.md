# Kickoff Tag Bonus Dash Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render `-` instead of `0` for kickoff-event tag bonus columns anywhere those public values are displayed, without changing stored or computed numeric scoring values.

**Architecture:** Keep numeric scoring fields unchanged in the public model, then add parallel display fields for the three tag-based bonus columns. Event-page and homepage templates switch to those display fields, while totals and other numeric values continue using the existing numeric properties.

**Tech Stack:** Node.js, Eleventy, Nunjucks, node:test, node:assert

---

## File Map

- Modify: `lib/domain/buildPublicModel.js`
  - Add a small helper that converts kickoff tag-bonus zeros into `"-"` display values.
  - Attach `startingTagBonusDisplay`, `tagOneBonusDisplay`, and `beatYourTagBonusDisplay` to event-page scoreboard rows.
  - Reuse those display fields when building homepage `eventBreakdown` rows.
- Modify: `site/events/event.njk`
  - Render the three new display fields in the event scoreboard table.
- Modify: `site/index.njk`
  - Render the three new display fields in the homepage player breakdown table.
- Modify: `tests/siteBuildCommand.test.js`
  - Add focused assertions for public-model display fields and rendered kickoff HTML.

### Task 1: Add kickoff display fields in the public model

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing test**

Add two assertions to `tests/siteBuildCommand.test.js` inside the existing bootstrap sanitizing coverage so the model must expose display fields while preserving numeric fields.

Insert after the existing `assert.deepEqual(model.eventPages[0].scoreboard, [...])` block near line 652:

```js
  assert.equal(model.eventPages[0].scoreboard[0].startingTagBonus, 0);
  assert.equal(model.eventPages[0].scoreboard[0].startingTagBonusDisplay, "-");
  assert.equal(model.eventPages[0].scoreboard[0].tagOneBonusDisplay, "-");
  assert.equal(model.eventPages[0].scoreboard[0].beatYourTagBonusDisplay, "-");
```

Insert in the homepage bootstrap sanitizing test after the first `eventBreakdown` row is asserted near line 687:

```js
  assert.equal(
    model.homepage.leaderboardRows[0].eventBreakdown[0].startingTagBonusDisplay,
    "-"
  );
  assert.equal(model.homepage.leaderboardRows[0].eventBreakdown[0].tagOneBonusDisplay, "-");
  assert.equal(
    model.homepage.leaderboardRows[0].eventBreakdown[0].beatYourTagBonusDisplay,
    "-"
  );
```

Also add a non-kickoff assertion in `test("buildPublicModel adds homepage event breakdown totals across multiple events", ...)` after the summer event row assertions so non-kickoff rows stay numeric:

```js
  assert.equal(
    model.homepage.leaderboardRows[0].eventBreakdown[1].startingTagBonusDisplay,
    1
  );
  assert.equal(model.homepage.leaderboardRows[0].eventBreakdown[1].tagOneBonusDisplay, 0);
  assert.equal(
    model.homepage.leaderboardRows[0].eventBreakdown[1].beatYourTagBonusDisplay,
    2
  );
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: FAIL with assertions showing `startingTagBonusDisplay`, `tagOneBonusDisplay`, and `beatYourTagBonusDisplay` are `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `lib/domain/buildPublicModel.js`, add a helper near `sanitizeBootstrapScoreboard()` and use it in both event-page scoreboard shaping and homepage event breakdown shaping.

Add this helper after `sanitizeBootstrapScoreboard()`:

```js
function toTagBonusDisplayValue(value, useDashForZero) {
  if (useDashForZero && value === 0) {
    return "-";
  }

  return value;
}

function addTagBonusDisplayFields(row, useDashForZero) {
  return {
    ...row,
    startingTagBonusDisplay: toTagBonusDisplayValue(row.startingTagBonus, useDashForZero),
    tagOneBonusDisplay: toTagBonusDisplayValue(row.tagOneBonus, useDashForZero),
    beatYourTagBonusDisplay: toTagBonusDisplayValue(row.beatYourTagBonus, useDashForZero),
  };
}
```

Update `createHomepageBreakdownRow()` to copy display fields:

```js
function createHomepageBreakdownRow(eventPage, scoreboardRow) {
  return {
    eventName: eventPage.name,
    eventSlug: eventPage.slug,
    attendance: scoreboardRow.attendance,
    placement: scoreboardRow.placement,
    startingTagBonus: scoreboardRow.startingTagBonus,
    startingTagBonusDisplay: scoreboardRow.startingTagBonusDisplay,
    tagOneBonus: scoreboardRow.tagOneBonus,
    tagOneBonusDisplay: scoreboardRow.tagOneBonusDisplay,
    beatYourTagBonus: scoreboardRow.beatYourTagBonus,
    beatYourTagBonusDisplay: scoreboardRow.beatYourTagBonusDisplay,
    eventTotal: scoreboardRow.eventTotal,
  };
}
```

Update the `eventPages` mapping so kickoff rows get dash display values and all other rows mirror numeric values:

```js
      scoreboard: toDisplayScoreboard(
        (event.id === bootstrapEventId
          ? sanitizeBootstrapScoreboard(page.scoreboard, event.isMajor)
          : page.scoreboard
        ).map((row) => addTagBonusDisplayFields(row, event.id === bootstrapEventId))
      ),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: PASS, including the new display-field assertions while existing numeric `startingTagBonus`, `tagOneBonus`, and `beatYourTagBonus` assertions remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildPublicModel.js
git commit -m "feat: add kickoff tag bonus display fields"
```

### Task 2: Render kickoff dashes on event and homepage pages

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/events/event.njk`
- Modify: `site/index.njk`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing test**

Add a new rendering test to `tests/siteBuildCommand.test.js` after `test("siteBuildCommand leaves missed homepage event overview cells blank", ...)` that builds the default store and asserts kickoff tag bonus cells display dashes in both generated pages.

```js
test("siteBuildCommand renders kickoff tag bonus zeros as dashes", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-kickoff-tag-bonus-dash-");
  const store = createStore();

  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => store,
  });

  assert.equal(result.exitCode, 0);

  const homepage = await fs.readFile(path.join(tempDirectory, "dist", "index.html"), "utf8");
  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );

  assert.match(homepage, />-<\/td>\s*<td>-<\/td>\s*<td>-<\/td>/i);
  assert.match(eventPage, />-<\/td>\s*<td>-<\/td>\s*<td>-<\/td>\s*<td class="total-column">10<\/td>/i);
  assert.doesNotMatch(eventPage, />0<\/td>\s*<td>0<\/td>\s*<td>0<\/td>\s*<td class="total-column">10<\/td>/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: FAIL because the generated HTML still contains `0` in the three kickoff tag-bonus columns.

- [ ] **Step 3: Write minimal implementation**

In `site/events/event.njk`, switch only the three tag-bonus cells to display fields:

```njk
              <td>{{ row.startingTagBonusDisplay }}</td>
              <td>{{ row.tagOneBonusDisplay }}</td>
              <td>{{ row.beatYourTagBonusDisplay }}</td>
```

In `site/index.njk`, switch only the per-event breakdown tag-bonus cells to display fields and leave totals numeric:

```njk
                              <td>{{ event.startingTagBonusDisplay }}</td>
                              <td>{{ event.tagOneBonusDisplay }}</td>
                              <td>{{ event.beatYourTagBonusDisplay }}</td>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`

Expected: PASS, with kickoff pages rendering `-` while non-kickoff and totals coverage remains green.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js site/events/event.njk site/index.njk
git commit -m "fix: render kickoff tag bonuses as dashes"
```

## Verification

- [ ] Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS

- [ ] Run: `npm test`
Expected: PASS

## Self-Review

- Spec coverage: the plan covers kickoff-only dash rendering on event pages and homepage breakdowns, preserves numeric totals, and keeps non-kickoff zeros numeric.
- Placeholder scan: no `TBD`, `TODO`, or implied implementation steps remain.
- Type consistency: the plan uses `startingTagBonusDisplay`, `tagOneBonusDisplay`, and `beatYourTagBonusDisplay` consistently across model, templates, and tests.
