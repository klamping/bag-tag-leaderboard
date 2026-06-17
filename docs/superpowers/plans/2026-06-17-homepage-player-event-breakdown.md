# Homepage Player Event Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add expandable homepage player rows that reveal a per-event scoring table with linked event names and a final totals row.

**Architecture:** Keep scoring assembly, bootstrap-event sanitizing, and totals calculation in `lib/domain/buildPublicModel.js`, where the public site model is already prepared for templates. Then update `site/index.njk` to render each leaderboard row as a native disclosure and extend `site/styles/site.css` with minimal styles for the expandable summary and horizontally scrollable detail table.

**Tech Stack:** Node.js, CommonJS, Nunjucks, Eleventy, `node:test`, `node:assert/strict`, CSS

---

## File Map

- Modify: `lib/domain/buildPublicModel.js`
  - Add homepage-only helpers that build each player's `eventBreakdown` rows and `totals` object from the already-public event scoreboard data.
  - Reuse the existing bootstrap-event sanitizing and display-name decoding behavior.
- Modify: `tests/siteBuildCommand.test.js`
  - Extend the existing `buildPublicModel` expectation with homepage `eventBreakdown` and `totals` data.
  - Add focused coverage for multi-event totals and bootstrap-event sanitizing on the homepage breakdown.
  - Extend homepage build assertions to lock the new disclosure/table markup and event links.
- Modify: `site/index.njk`
  - Replace the plain leaderboard row markup with a native disclosure using `<details>` and `<summary>` so the whole summary row is clickable.
  - Render the per-player event table and totals row from the new public-model fields.
- Modify: `site/styles/site.css`
  - Add disclosure, summary, and homepage breakdown table styles.
  - Reuse the existing `.table-scroll` pattern for mobile overflow.

### Task 1: Add homepage event-breakdown data to the public model

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing homepage public-model expectations**

In `tests/siteBuildCommand.test.js`, update the first `buildPublicModel returns homepage and event page models from the canonical store` assertion so each homepage row includes `eventBreakdown` and `totals`.

Replace the existing `model.homepage.leaderboardRows` expectation with:

```js
  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonPoints: 10,
      eventBreakdown: [
        {
          eventName: "Spring Showdown",
          eventSlug: "spring-showdown",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          eventTotal: 10,
        },
      ],
      totals: {
        attendance: 2,
        placement: 8,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 10,
      },
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      eventsPlayed: 1,
      seasonPoints: 5,
      eventBreakdown: [
        {
          eventName: "Spring Showdown",
          eventSlug: "spring-showdown",
          attendance: 2,
          placement: 0,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          eventTotal: 2,
        },
      ],
      totals: {
        attendance: 2,
        placement: 0,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 2,
      },
    },
  ]);
```

Then add this new test below `buildPublicModel hides bootstrap-event tags and forces tag-derived display values to zero`:

```js
test("buildPublicModel adds homepage event breakdown totals across multiple events", () => {
  const store = createStore();

  store.events.items.push({
    id: "event_0002",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-05-10",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: ["result_0003", "result_0004"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  store.results.items.push(
    {
      id: "result_0003",
      eventId: "event_0002",
      playerId: "player_0001",
      finishPlace: 2,
      startingTag: 5,
      attendancePoints: 2,
      placementPoints: 5,
      startingTagBonusPoints: 1,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 2,
      eventTotalPoints: 10,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "result_0004",
      eventId: "event_0002",
      playerId: "player_0002",
      finishPlace: 1,
      startingTag: 3,
      attendancePoints: 2,
      placementPoints: 8,
      startingTagBonusPoints: 0,
      tagOneBonusPoints: 1,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 11,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }
  );

  const model = buildPublicModel(store);
  const [alice, bob] = model.homepage.leaderboardRows;

  assert.deepEqual(alice.eventBreakdown, [
    {
      eventName: "Spring Showdown",
      eventSlug: "spring-showdown",
      attendance: 2,
      placement: 8,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      eventTotal: 10,
    },
    {
      eventName: "Summer Sizzler",
      eventSlug: "summer-sizzler",
      attendance: 2,
      placement: 5,
      startingTagBonus: 1,
      tagOneBonus: 0,
      beatYourTagBonus: 2,
      eventTotal: 10,
    },
  ]);

  assert.deepEqual(alice.totals, {
    attendance: 4,
    placement: 13,
    startingTagBonus: 1,
    tagOneBonus: 0,
    beatYourTagBonus: 2,
    eventTotal: 20,
  });

  assert.deepEqual(bob.eventBreakdown[0], {
    eventName: "Spring Showdown",
    eventSlug: "spring-showdown",
    attendance: 2,
    placement: 0,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: 2,
  });

  assert.deepEqual(bob.totals, {
    attendance: 4,
    placement: 8,
    startingTagBonus: 0,
    tagOneBonus: 1,
    beatYourTagBonus: 0,
    eventTotal: 13,
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because `buildPublicModel()` does not yet add `eventBreakdown` or `totals` to homepage leaderboard rows.

- [ ] **Step 3: Write the minimal public-model implementation**

In `lib/domain/buildPublicModel.js`, add the following helpers above `buildPublicModel()` after `toDisplayLeaderboardRows()`:

```js
function buildHomepageEventBreakdownRow(event, scoreboardRow) {
  return {
    eventName: event.name,
    eventSlug: event.slug,
    attendance: scoreboardRow.attendance,
    placement: scoreboardRow.placement,
    startingTagBonus: scoreboardRow.startingTagBonus,
    tagOneBonus: scoreboardRow.tagOneBonus,
    beatYourTagBonus: scoreboardRow.beatYourTagBonus,
    eventTotal: scoreboardRow.eventTotal,
  };
}

function createEmptyHomepageTotals() {
  return {
    attendance: 0,
    placement: 0,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: 0,
  };
}

function sumHomepageTotals(rows) {
  return rows.reduce((totals, row) => ({
    attendance: totals.attendance + row.attendance,
    placement: totals.placement + row.placement,
    startingTagBonus: totals.startingTagBonus + row.startingTagBonus,
    tagOneBonus: totals.tagOneBonus + row.tagOneBonus,
    beatYourTagBonus: totals.beatYourTagBonus + row.beatYourTagBonus,
    eventTotal: totals.eventTotal + row.eventTotal,
  }), createEmptyHomepageTotals());
}

function buildHomepageLeaderboardRows({
  leaderboardRows,
  players,
  events,
  eventResults,
  eventPoints,
  bootstrapEventId,
}) {
  const breakdownByPlayerId = new Map(
    leaderboardRows.map((row) => [row.playerId, []])
  );

  for (const event of listPublicEvents({ events })) {
    const eventPage = getPublicEventScoreboardBySlug({
      slug: event.slug,
      players,
      events,
      eventResults,
      eventPoints,
    });

    const scoreboard = toDisplayScoreboard(
      event.id === bootstrapEventId
        ? sanitizeBootstrapScoreboard(eventPage.scoreboard, event.isMajor)
        : eventPage.scoreboard
    );

    for (const scoreboardRow of scoreboard) {
      if (!breakdownByPlayerId.has(scoreboardRow.playerId)) {
        continue;
      }

      breakdownByPlayerId.get(scoreboardRow.playerId).push(
        buildHomepageEventBreakdownRow(event, scoreboardRow)
      );
    }
  }

  return toDisplayLeaderboardRows(leaderboardRows).map((row) => {
    const eventBreakdown = breakdownByPlayerId.get(row.playerId) || [];

    return {
      ...row,
      eventBreakdown,
      totals: sumHomepageTotals(eventBreakdown),
    };
  });
}
```

Then replace the current homepage `leaderboardRows` assignment inside `buildPublicModel()` with:

```js
  const leaderboardRows = getSeasonLeaderboardRows({
    players: store.players.items,
    events,
    eventResults,
    eventPoints,
  });

  return {
    siteTitle: "Bag Tag Leaderboard",
    homepage: {
      leaderboardRows: buildHomepageLeaderboardRows({
        leaderboardRows,
        players: store.players.items,
        events,
        eventResults,
        eventPoints,
        bootstrapEventId,
      }),
      events: listPublicEvents({ events }),
    },
```

This keeps the homepage breakdown order tied to `listPublicEvents({ events })`, which already sorts public events by date and slug.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS, including the new homepage breakdown and totals assertions.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/buildPublicModel.js tests/siteBuildCommand.test.js
git commit -m "feat: add homepage player event breakdown data"
```

### Task 2: Render expandable homepage player rows and scoring tables

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/index.njk`
- Modify: `site/styles/site.css`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing homepage build assertions**

In `tests/siteBuildCommand.test.js`, extend `test("siteBuildCommand builds a real Eleventy site into dist with homepage and event pages", async (t) => { ... })`.

Before calling `siteBuildCommand`, add a second public event for the existing store so the homepage can render multiple event rows and meaningful totals:

```js
  store.events.items.push({
    id: "event_0002",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-05-10",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: ["result_0003", "result_0004"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  store.results.items.push(
    {
      id: "result_0003",
      eventId: "event_0002",
      playerId: "player_0001",
      finishPlace: 2,
      startingTag: 5,
      attendancePoints: 2,
      placementPoints: 5,
      startingTagBonusPoints: 1,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 2,
      eventTotalPoints: 10,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "result_0004",
      eventId: "event_0002",
      playerId: "player_0002",
      finishPlace: 1,
      startingTag: 3,
      attendancePoints: 2,
      placementPoints: 8,
      startingTagBonusPoints: 0,
      tagOneBonusPoints: 1,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 11,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }
  );
```

After the existing homepage assertions, add:

```js
  assert.match(homepage, /<details\b[^>]*class="[^"]*leaderboard-card[^"]*"/i);
  assert.match(homepage, /<summary\b[^>]*class="[^"]*leaderboard-summary[^"]*"/i);
  assert.match(homepage, /href="\/events\/spring-showdown\/"[^>]*>Spring Showdown</i);
  assert.match(homepage, /href="\/events\/summer-sizzler\/"[^>]*>Summer Sizzler</i);
  assert.match(homepage, />Totals</i);
  assert.match(homepage, />20<\/td>/i);
  assert.match(homepage, /Beat Your Tag/i);
  assert.match(homepage, /Tag 1 Bonus/i);
  assert.match(stylesheet, /\.leaderboard-card\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-summary\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown\s+\.table-scroll\s*\{/i);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because the homepage template still renders a plain `<li>` summary row with no disclosure/table markup or related CSS hooks.

- [ ] **Step 3: Write the minimal homepage template and CSS implementation**

In `site/index.njk`, replace the current leaderboard loop body:

```njk
        <li class="leaderboard-row panel">
          <div class="leaderboard-primary">
            <span class="leaderboard-name">{{ row.playerName }}</span>
            <span class="leaderboard-events">{{ row.eventsPlayed }} event{% if row.eventsPlayed !== 1 %}s{% endif %}</span>
          </div>
          <span class="leaderboard-points">{{ row.seasonPoints }} points</span>
        </li>
```

with:

```njk
        <li>
          <details class="leaderboard-card panel">
            <summary class="leaderboard-row leaderboard-summary">
              <div class="leaderboard-primary">
                <span class="leaderboard-name">{{ row.playerName }}</span>
                <span class="leaderboard-events">{{ row.eventsPlayed }} event{% if row.eventsPlayed !== 1 %}s{% endif %}</span>
              </div>
              <span class="leaderboard-points">{{ row.seasonPoints }} points</span>
            </summary>

            <div class="leaderboard-breakdown stack-tight">
              <div class="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Attendance</th>
                      <th>Placement</th>
                      <th>Starting Tag Bonus</th>
                      <th>Tag 1 Bonus</th>
                      <th>Beat Your Tag Bonus</th>
                      <th class="total-column">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {% for eventRow in row.eventBreakdown %}
                      <tr>
                        <td><a href="/events/{{ eventRow.eventSlug }}/">{{ eventRow.eventName }}</a></td>
                        <td>{{ eventRow.attendance }}</td>
                        <td>{{ eventRow.placement }}</td>
                        <td>{{ eventRow.startingTagBonus }}</td>
                        <td>{{ eventRow.tagOneBonus }}</td>
                        <td>{{ eventRow.beatYourTagBonus }}</td>
                        <td class="total-column">{{ eventRow.eventTotal }}</td>
                      </tr>
                    {% endfor %}
                    <tr class="leaderboard-totals-row">
                      <td>Totals</td>
                      <td>{{ row.totals.attendance }}</td>
                      <td>{{ row.totals.placement }}</td>
                      <td>{{ row.totals.startingTagBonus }}</td>
                      <td>{{ row.totals.tagOneBonus }}</td>
                      <td>{{ row.totals.beatYourTagBonus }}</td>
                      <td class="total-column">{{ row.totals.eventTotal }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </li>
```

In `site/styles/site.css`, replace the current `.leaderboard-row` rules and add disclosure styles near the leaderboard section:

```css
.leaderboard-card {
  padding: 0;
  overflow: hidden;
}

.leaderboard-row,
.leaderboard-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-summary {
  padding: 1rem 1.1rem;
  border-width: 2px;
  cursor: pointer;
  list-style: none;
}

.leaderboard-summary::-webkit-details-marker {
  display: none;
}

.leaderboard-breakdown {
  padding: 0 1.1rem 1rem;
}

.leaderboard-breakdown .table-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.leaderboard-breakdown tbody tr:last-child {
  background: rgba(18, 48, 74, 0.08);
  font-weight: 700;
}

.leaderboard-breakdown td:nth-child(2),
.leaderboard-breakdown td:nth-child(3),
.leaderboard-breakdown td:nth-child(4),
.leaderboard-breakdown td:nth-child(5),
.leaderboard-breakdown td:nth-child(6),
.leaderboard-breakdown td:nth-child(7) {
  font-variant-numeric: tabular-nums;
}

@media (min-width: 48rem) {
  .leaderboard-summary {
    flex-direction: row-reverse;
    align-items: center;
    justify-content: flex-end;
  }
}
```

Leave the shared `table`, `th`, `td`, `.table-scroll`, and `.total-column` rules in place so the homepage breakdown table inherits the same general table styling as the event scoreboard.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS, including the new homepage disclosure markup, totals row, event links, and stylesheet hook assertions.

- [ ] **Step 5: Commit**

```bash
git add site/index.njk site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "feat: render expandable homepage player scorecards"
```

### Task 3: Run regression verification and acceptance checks

**Files:**
- Verify: `lib/domain/buildPublicModel.js`
- Verify: `site/index.njk`
- Verify: `site/styles/site.css`
- Verify: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS with `0 fail` in the final summary.

- [ ] **Step 2: Verify the acceptance criteria directly**

Check these against the implementation and tests before closing the work:

```text
- Clicking a homepage player row expands and collapses a native disclosure.
- Expanded content shows one event row per attended event.
- Event names link to /events/{slug}/.
- The expanded table includes Attendance, Placement, Starting Tag Bonus, Tag 1 Bonus, Beat Your Tag Bonus, and Total.
- The final row is Totals and sums each numeric scoring column.
- Bootstrap-event homepage breakdown values stay sanitized the same way as event pages.
```

- [ ] **Step 3: Commit verification-only fixes if needed**

If verification required no code changes, do not create another commit.

If a regression fix was needed, commit it with:

```bash
git add lib/domain/buildPublicModel.js site/index.njk site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "test: verify homepage player event breakdown"
```
