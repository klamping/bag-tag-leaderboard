# Season Leaderboard Export Layout Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the exported season leaderboard image to a `960x1350` contract, remove the `Season Leaderboard` subheading, and move the `Total` column to the left of `Player`.

**Architecture:** Keep the existing export flow intact: `buildSeasonLeaderboardImageModel()` still shapes the export data, `site/season-leaderboard-image.njk` still renders the export-only HTML page, and `captureSeasonLeaderboardImage()` still captures the page into a PNG. The work is a presentation-focused refinement of the existing export contract rather than a redesign of the export pipeline.

**Tech Stack:** Node.js built-in test runner, Eleventy/Nunjucks templates, existing site CSS, Playwright-backed capture helper.

---

## File Map

- Modify: `lib/domain/buildSeasonLeaderboardImageModel.js`
  - Change the export width contract from `1080` to `960` while keeping the existing data shape otherwise intact.
- Modify: `site/season-leaderboard-image.njk`
  - Remove the subheading and reorder export table columns to `Rank`, `Total`, `Player`, then events.
- Modify: `site/styles/site.css`
  - Update the export frame to `960x1350` and tighten export-specific spacing/column styles for the narrower width.
- Modify: `tests/seasonLeaderboardImageModel.test.js`
  - Update export model expectations for the new width contract.
- Modify: `tests/siteBuildCommand.test.js`
  - Update export page assertions for no subheading, new column order, and new CSS width contract.
- Modify: `tests/captureSeasonLeaderboardImage.test.js`
  - Update capture-helper expectations from `1080x1350` to `960x1350` and keep the compaction/overflow coverage aligned with the new contract.

### Task 1: Update Export Model And Capture Contract

**Files:**
- Modify: `tests/seasonLeaderboardImageModel.test.js`
- Modify: `tests/captureSeasonLeaderboardImage.test.js`
- Modify: `lib/domain/buildSeasonLeaderboardImageModel.js`

- [ ] **Step 1: Write the failing test updates for the new width contract**

In `tests/seasonLeaderboardImageModel.test.js`, update the expected width in `test("buildSeasonLeaderboardImageModel maps the homepage leaderboard into the export view model", ...)`:

```js
    width: 960,
```

In `tests/captureSeasonLeaderboardImage.test.js`, update all `width: 1080` expectations and sample bounds to `width: 960`, including:

```js
        return { x: 0, y: 0, width: 960, height: 1350 };
```

```js
        viewport: { width: 960, height: 1350 },
```

```js
        scrollWidth: 960,
        clientWidth: 960,
```

```js
    width: 960,
    height: 1350,
```

and the overflow-message assertions:

```js
    /exceeds the supported 960x1350 export bounds/i
```

For the compaction test, keep the same behavior but update the first pass dimensions to:

```js
          scrollWidth: 960,
          scrollHeight: 1854,
          clientWidth: 960,
          clientHeight: 1342,
```

and the compacted pass to:

```js
          scrollWidth: 960,
          scrollHeight: 1338,
          clientWidth: 960,
          clientHeight: 1342,
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test tests/seasonLeaderboardImageModel.test.js tests/captureSeasonLeaderboardImage.test.js`

Expected: FAIL because `buildSeasonLeaderboardImageModel()` and the capture helper still use the `1080x1350` contract.

- [ ] **Step 3: Write the minimal implementation changes for the new width contract**

In `lib/domain/buildSeasonLeaderboardImageModel.js`, change the export width only:

```js
    width: 960,
```

No other model fields should change in this task.

In `lib/cli/captureSeasonLeaderboardImage.js`, do not change the logic shape. Only ensure the existing width/height-dependent behavior continues to use the passed-in `width` and `height`, so the updated tests pass under the `960x1350` contract.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `node --test tests/seasonLeaderboardImageModel.test.js tests/captureSeasonLeaderboardImage.test.js`

Expected: PASS for the export model and capture helper test files.

- [ ] **Step 5: Commit**

```bash
git add tests/seasonLeaderboardImageModel.test.js tests/captureSeasonLeaderboardImage.test.js lib/domain/buildSeasonLeaderboardImageModel.js
git commit -m "feat: narrow leaderboard export contract"
```

### Task 2: Update Export Template And Styles

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/season-leaderboard-image.njk`
- Modify: `site/styles/site.css`

- [ ] **Step 1: Write the failing export-page assertions**

In `tests/siteBuildCommand.test.js`, inside `test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => { ... })`, replace the current export-page subheading assertion:

```js
  assert.match(seasonLeaderboardImagePage, />Season Leaderboard</i);
```

with:

```js
  assert.doesNotMatch(
    seasonLeaderboardImagePage,
    /<p[^>]*class="[^"]*season-leaderboard-image-subtitle[^"]*"[^>]*>Season Leaderboard<\/p>/i
  );
```

Then add export table-order assertions immediately after the `Alice Smith` / `Bob Jones` checks:

```js
  assert.match(
    seasonLeaderboardImagePage,
    /<th scope="col">Rank<\/th>\s*<th scope="col">Total<\/th>\s*<th scope="col">Player<\/th>/i
  );
```

```js
  assert.match(
    seasonLeaderboardImagePage,
    /<tr>\s*<th scope="row" class="season-leaderboard-image-rank">1<\/th>\s*<td class="season-leaderboard-image-total">[\s\S]*?<\/td>\s*<td class="season-leaderboard-image-player">Alice Smith<\/td>/i
  );
```

Update the CSS width assertion from `1080px` to `960px`:

```js
    /#season-leaderboard-image\s*\{[\s\S]*?width:\s*960px;[\s\S]*?height:\s*1350px;/i
```

- [ ] **Step 2: Run the focused build test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: FAIL because the current template still renders the subheading, current table order is `Rank | Player | Total`, and the CSS width is still `1080px`.

- [ ] **Step 3: Write the minimal template changes**

In `site/season-leaderboard-image.njk`, remove the subtitle line entirely:

```njk
      <p class="season-leaderboard-image-subtitle">{{ exportModel.subtitle }}</p>
```

Then reorder the header cells and row cells from:

```njk
          <th scope="col">Rank</th>
          <th scope="col">Player</th>
          <th scope="col">Total</th>
```

to:

```njk
          <th scope="col">Rank</th>
          <th scope="col">Total</th>
          <th scope="col">Player</th>
```

And reorder each row from:

```njk
            <th scope="row" class="season-leaderboard-image-rank">{{ row.rank }}</th>
            <td class="season-leaderboard-image-player">{{ row.playerName }}</td>
            <td class="season-leaderboard-image-total">
```

to:

```njk
            <th scope="row" class="season-leaderboard-image-rank">{{ row.rank }}</th>
            <td class="season-leaderboard-image-total">
              <span class="leaderboard-points-value">{{ row.seasonPoints }}</span>
              <span class="leaderboard-points-label">pts</span>
            </td>
            <td class="season-leaderboard-image-player">{{ row.playerName }}</td>
```

- [ ] **Step 4: Write the minimal CSS changes for the narrower frame**

In `site/styles/site.css`, update the export width and tighten the export styles:

```css
#season-leaderboard-image {
  width: 960px;
  height: 1350px;
  margin: 0 auto;
  padding: 2.75rem 2.5rem 2.5rem;
  border-width: 4px;
  border-radius: 2rem;
  box-shadow: var(--shadow-poster);
}
```

Remove the now-unused subtitle block entirely:

```css
.season-leaderboard-image-subtitle {
  margin: 0;
  color: var(--color-orange);
  font-family: "Arial Black", Impact, Haettenschweiler, "Arial Narrow Bold", Arial, sans-serif;
  font-size: 1.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

Then tighten table sizing and update column targeting for the new order:

```css
.season-leaderboard-image-table {
  min-width: 0;
  font-size: 1.05rem;
}

.season-leaderboard-image-table th,
.season-leaderboard-image-table td {
  padding: 0.8rem 0.55rem;
  text-align: center;
}

.season-leaderboard-image-table th:nth-child(3),
.season-leaderboard-image-table td:nth-child(3) {
  text-align: left;
}

.season-leaderboard-image-rank {
  width: 4.25rem;
  font-size: 1.35rem;
}

.season-leaderboard-image-player {
  font-size: 1.2rem;
  font-weight: 700;
}

.season-leaderboard-image-total {
  min-width: 6rem;
}
```

- [ ] **Step 5: Run the focused build test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: PASS with the new export-page structure and CSS width assertions.

- [ ] **Step 6: Commit**

```bash
git add tests/siteBuildCommand.test.js site/season-leaderboard-image.njk site/styles/site.css
git commit -m "feat: tighten leaderboard export layout"
```

### Task 3: Verify Full Export Flow Under The New Contract

**Files:**
- Modify: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing PNG integration assertion updates**

In `tests/siteBuildCommand.test.js`, inside `test("siteBuildCommand writes a season leaderboard PNG into dist", async (t) => { ... })`, update:

```js
  assert.equal(captureCalls[0].width, 960);
  assert.equal(captureCalls[0].height, 1350);
```

No other assertions in that test should change.

- [ ] **Step 2: Run the focused PNG integration test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js --test-name-pattern="siteBuildCommand writes a season leaderboard PNG into dist"`

Expected: FAIL because the build path still passes `width: 1080` until the updated export model is flowing through all assertions.

- [ ] **Step 3: Verify the existing implementation already passes once the model change is in place**

Do not add production code in this task unless the focused test still fails after Tasks 1 and 2 are complete. If it does fail, inspect `lib/cli/siteBuildCommand.js` and `lib/domain/buildSeasonLeaderboardImageModel.js` and make only the minimal change needed so `captureSeasonLeaderboardImage` receives `width: 960` from the export model.

- [ ] **Step 4: Run focused export verification**

Run: `node --test tests/seasonLeaderboardImageModel.test.js tests/captureSeasonLeaderboardImage.test.js tests/siteBuildCommand.test.js --test-name-pattern="season leaderboard|siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: PASS for the export-related coverage.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`

Expected: PASS for the entire repository test suite.

- [ ] **Step 6: Run a real build**

Run: `npm run build`

Expected: build succeeds and writes `dist/season-leaderboard.png` using the `960x1350` export contract.

- [ ] **Step 7: Commit**

If no production code changed in this task, do not create a commit here. If a minimal production fix was required in Step 3, commit it with:

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildSeasonLeaderboardImageModel.js lib/cli/siteBuildCommand.js
git commit -m "fix: align leaderboard export width verification"
```

## Self-Review

- Spec coverage check:
  - remove subheading: Task 2
  - reorder columns to `Rank | Total | Player | ...`: Task 2
  - reduce export contract to `960x1350`: Tasks 1, 2, and 3
  - keep compaction/overflow behavior intact: Task 1 verification
  - real build verification and PNG existence: Task 3
- Placeholder scan: no `TODO`, `TBD`, or vague follow-up instructions remain.
- Type consistency check: `width`, `height`, `seasonLeaderboardImage`, `season-leaderboard-image`, and export table class names are used consistently throughout the plan.
