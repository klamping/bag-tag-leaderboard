# Homepage Leaderboard Column Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the homepage leaderboard so the `Season Standing` column is `5em` wide and the `Season Total` header and body cells are centered through an explicit class.

**Architecture:** Keep the current homepage leaderboard structure in `site/index.njk` and make the smallest possible change by adding one semantic class for the `Season Total` column. Update `site/styles/site.css` to use that class for centering and to widen the existing `.season-standing` column width from `4em` to `5em`. Keep the verification localized to `tests/siteBuildCommand.test.js`.

**Tech Stack:** Nunjucks templates, plain CSS, Node test suite

---

## File Map

- Modify: `site/index.njk`
  Responsibility: homepage leaderboard table markup.
- Modify: `site/styles/site.css`
  Responsibility: homepage leaderboard layout and alignment rules.
- Modify: `tests/siteBuildCommand.test.js`
  Responsibility: generated homepage HTML and stylesheet assertions.

### Task 1: Add explicit Season Total markup hooks

**Files:**
- Modify: `site/index.njk:20-35`
- Test: `tests/siteBuildCommand.test.js:1201-1217`

- [ ] **Step 1: Write the failing test**

Update the homepage markup assertions so they require the new `leaderboard-season-total` class on both the header cell and the data cell.

```js
  assert.match(homepage, /<th scope="col"[^>]*class="[^"]*leaderboard-season-total[^"]*"[^>]*>Season<br\s*\/?>Total<\/th>/i);
  assert.match(homepage, /<td\b[^>]*class="[^"]*leaderboard-total-cell[^"]*leaderboard-season-total[^"]*"/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/siteBuildCommand.test.js`

Expected: FAIL because the current homepage HTML does not include `leaderboard-season-total`.

- [ ] **Step 3: Write minimal implementation**

Update the `Season Total` header and points cell in `site/index.njk`.

```njk
            <th scope="col" class="leaderboard-season-total">Season<br />Total</th>
```

```njk
              <td class="leaderboard-total-cell leaderboard-season-total">
                <span class="leaderboard-points-value">{{ row.seasonPoints }}</span>
                <span class="leaderboard-points-label">pts</span>
              </td>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/siteBuildCommand.test.js`

Expected: the new markup assertions pass, with any later CSS assertions still free to fail until Task 2 is complete.

- [ ] **Step 5: Commit**

```bash
git add site/index.njk tests/siteBuildCommand.test.js
git commit -m "feat: add explicit season total leaderboard column hook"
```

### Task 2: Update leaderboard CSS alignment and width

**Files:**
- Modify: `site/styles/site.css:208-235`
- Test: `tests/siteBuildCommand.test.js:1318-1329`

- [ ] **Step 1: Write the failing test**

Replace the existing positional alignment expectation with explicit class-based assertions for the `Season Total` column and add a width assertion for `.season-standing` at `5em`.

```js
  assert.match(
    stylesheet,
    /\.leaderboard-season-total\s*\{[\s\S]*?text-align:\s*center;/i
  );
  assert.match(stylesheet, /\.season-standing\s*\{[\s\S]*?width:\s*5em;/i);
```

If you want stronger coverage for both header and body cells, require the grouped selector instead of a bare class block:

```js
  assert.match(
    stylesheet,
    /\.leaderboard-table\s*>\s*thead\s+th\.leaderboard-season-total,\s*\.leaderboard-table\s*>\s*tbody\s*>\s*tr\s*>\s*td\.leaderboard-season-total\s*\{[\s\S]*?text-align:\s*center;/i
  );
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/siteBuildCommand.test.js`

Expected: FAIL because `.season-standing` is still `4em` and the stylesheet does not yet center `.leaderboard-season-total`.

- [ ] **Step 3: Write minimal implementation**

Update the leaderboard CSS in `site/styles/site.css`.

Keep the existing non-second-column centering rule intact, remove the second-column left-alignment override, add an explicit `leaderboard-season-total` centering rule, and widen `.season-standing`.

```css
.leaderboard-table > thead th:not(:nth-child(2)),
.leaderboard-table > tbody > tr > :is(th, td):not(:nth-child(2)) {
  text-align: center;
}

.leaderboard-table > thead th.leaderboard-season-total,
.leaderboard-table > tbody > tr > td.leaderboard-season-total {
  text-align: center;
}

.season-standing {
  width: 5em;
}
```

If the old left-alignment block is still present, remove this block entirely:

```css
.leaderboard-table > thead th:nth-child(2),
.leaderboard-table > tbody > tr > :is(th, td):nth-child(2) {
  text-align: left;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/siteBuildCommand.test.js`

Expected: PASS for the stylesheet assertions added in this task.

- [ ] **Step 5: Commit**

```bash
git add site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "fix: align homepage leaderboard total column"
```

### Task 3: Run focused verification

**Files:**
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Run the focused test file**

Run: `npm test -- tests/siteBuildCommand.test.js`

Expected: PASS with no failing homepage markup or stylesheet assertions.

- [ ] **Step 2: Run a broader verification command if the repo uses it for site generation**

Run the project’s standard test command from `package.json` if it is lightweight enough to use during this change.

```bash
npm test
```

Expected: PASS. If this repo’s full test suite is intentionally heavier than needed for a CSS/template tweak, record that the focused test file passed and stop there.

- [ ] **Step 3: Commit**

```bash
git add site/index.njk site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "fix: tighten homepage leaderboard column layout"
```
