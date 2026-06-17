# Homepage Event Point Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's card-style player leaderboard with a horizontally scrollable event-overview table that always shows each player's total points, player info, and per-event point cells while preserving the existing player breakdown control.

**Architecture:** Keep the homepage overview data assembly inside `lib/domain/buildPublicModel.js`, where the site already prepares display-ready leaderboard rows and event pages. Then update `site/index.njk` to render one shared leaderboard table with event-date headers, and adjust `site/styles/site.css` so the table scrolls horizontally as a unit while still supporting an inline per-player breakdown row.

**Tech Stack:** Node.js, CommonJS, Nunjucks, Eleventy, CSS, `node:test`, `node:assert/strict`

---

## File Map

- Modify: `tests/siteBuildCommand.test.js`
  - Extend homepage public-model expectations with `leaderboardEvents` and per-row `eventOverview` data.
  - Add focused coverage for blank overview cells when a player misses an event.
  - Replace the existing homepage disclosure/card rendering assertions with table-based homepage assertions.
- Modify: `lib/domain/buildPublicModel.js`
  - Derive ordered homepage `leaderboardEvents` from the same season event set already used for homepage rows.
  - Add per-player `eventOverview` arrays aligned to those ordered events.
  - Keep existing `eventBreakdown` and `totals` behavior intact.
- Modify: `site/index.njk`
  - Replace the `<ol>` card leaderboard markup with a single horizontally scrollable table.
  - Keep the breakdown control inside the player column and render a follow-on full-width breakdown row for each player.
- Modify: `site/styles/site.css`
  - Add leaderboard table layout, sticky-ish left-column visual treatment if needed, and horizontal overflow behavior.
  - Remove now-unused card-summary presentation rules only if they are no longer referenced by the homepage.

### Task 1: Add homepage overview data to the public model

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing public-model assertions**

In `tests/siteBuildCommand.test.js`, update the first test, `buildPublicModel returns homepage and event page models from the canonical store`, so it asserts `model.homepage.leaderboardEvents` before asserting `leaderboardRows`:

```js
  assert.deepEqual(model.homepage.leaderboardEvents, [
    {
      slug: "spring-showdown",
      eventDate: "2026-04-12",
      shortDate: "4/12",
    },
  ]);
```

Then extend each row in the existing `model.homepage.leaderboardRows` expectation with `eventOverview`:

```js
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/12",
          points: 10,
          played: true,
        },
      ],
```

and for Bob:

```js
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/12",
          points: 2,
          played: true,
        },
      ],
```

Add a new test immediately after `buildPublicModel adds homepage event breakdown totals across multiple events`:

```js
test("buildPublicModel adds blank homepage overview cells for missed season events", () => {
  const store = createStore();

  store.events.items.push({
    id: "event_0002",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-05-10",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: ["result_0003"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  store.results.items.push({
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
  });

  const model = buildPublicModel(store);

  assert.deepEqual(model.homepage.leaderboardEvents, [
    {
      slug: "spring-showdown",
      eventDate: "2026-04-12",
      shortDate: "4/12",
    },
    {
      slug: "summer-sizzler",
      eventDate: "2026-05-10",
      shortDate: "5/10",
    },
  ]);

  assert.deepEqual(model.homepage.leaderboardRows[0].eventOverview, [
    {
      eventSlug: "spring-showdown",
      shortDate: "4/12",
      points: 10,
      played: true,
    },
    {
      eventSlug: "summer-sizzler",
      shortDate: "5/10",
      points: 10,
      played: true,
    },
  ]);

  assert.deepEqual(model.homepage.leaderboardRows[1].eventOverview, [
    {
      eventSlug: "spring-showdown",
      shortDate: "4/12",
      points: 2,
      played: true,
    },
    {
      eventSlug: "summer-sizzler",
      shortDate: "5/10",
      points: null,
      played: false,
    },
  ]);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because `model.homepage.leaderboardEvents` and `eventOverview` do not exist yet.

- [ ] **Step 3: Write the minimal public-model implementation**

In `lib/domain/buildPublicModel.js`, add a short-date formatter and overview helpers above `buildPublicModel()`:

```js
function toShortMonthDay(eventDate) {
  const [year, month, day] = String(eventDate).split("-");
  return `${Number.parseInt(month, 10)}/${Number.parseInt(day, 10)}`;
}

function toHomepageLeaderboardEvents(homepageEvents) {
  return homepageEvents.map((event) => ({
    slug: event.slug,
    eventDate: event.eventDate,
    shortDate: toShortMonthDay(event.eventDate),
  }));
}

function buildHomepageOverviewByPlayerId(eventPages) {
  const overviewByPlayerId = new Map();

  for (const eventPage of [...eventPages].sort(compareEventsForHomepageBreakdown)) {
    for (const row of eventPage.scoreboard) {
      const playerOverview = overviewByPlayerId.get(row.playerId) || new Map();
      playerOverview.set(eventPage.slug, {
        eventSlug: eventPage.slug,
        shortDate: toShortMonthDay(eventPage.eventDate),
        points: row.eventTotal,
        played: true,
      });
      overviewByPlayerId.set(row.playerId, playerOverview);
    }
  }

  return overviewByPlayerId;
}

function buildHomepageEventOverviewRow(leaderboardEvents, playerOverview) {
  return leaderboardEvents.map((event) => {
    const overviewCell = playerOverview.get(event.slug);

    if (overviewCell) {
      return overviewCell;
    }

    return {
      eventSlug: event.slug,
      shortDate: event.shortDate,
      points: null,
      played: false,
    };
  });
}
```

Then update `buildPublicModel()` to create `homepageEvents`, `leaderboardEvents`, and `homepageOverviewByPlayerId` once and feed them into `leaderboardRows`:

```js
  const homepageEvents = listPublicEvents({ events });
  const leaderboardEvents = toHomepageLeaderboardEvents(homepageEvents);
  const homepageOverviewByPlayerId = buildHomepageOverviewByPlayerId(
    eventPages.filter((eventPage) => homepageEventSlugs.has(eventPage.slug))
  );
```

and inside the existing `leaderboardRows` mapping:

```js
          const playerOverview = homepageOverviewByPlayerId.get(row.playerId) || new Map();
          const eventOverview = buildHomepageEventOverviewRow(
            leaderboardEvents,
            playerOverview
          );

          return {
            ...row,
            seasonPoints: totals.eventTotal,
            eventBreakdown,
            totals,
            eventOverview,
          };
```

Finally, expose `leaderboardEvents` on `homepage` and reuse `homepageEvents` for `homepage.events`:

```js
    homepage: {
      leaderboardEvents,
      leaderboardRows: toDisplayLeaderboardRows(/* existing mapped rows */),
      events: homepageEvents,
    },
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS for the updated `buildPublicModel()` expectations, with rendering assertions still untouched.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildPublicModel.js
git commit -m "feat: add homepage event overview data"
```

### Task 2: Render the homepage leaderboard as a shared event table

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/index.njk`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing homepage rendering assertions**

In the existing `siteBuildCommand` rendering test that currently checks for `.leaderboard-card` and `.leaderboard-summary`, remove the disclosure-card expectations and replace them with table assertions:

```js
  assert.match(homepage, elementWithClassPattern("div", "leaderboard-table-scroll"));
  assert.match(homepage, elementWithClassPattern("table", "leaderboard-table"));
  assert.match(homepage, /<th\b[^>]*scope="col"[^>]*>Pts<\/th>/i);
  assert.match(homepage, /<th\b[^>]*scope="col"[^>]*>Player<\/th>/i);
  assert.match(homepage, /<th\b[^>]*scope="col"[^>]*>4\/12<\/th>/i);
  assert.match(homepage, /<th\b[^>]*scope="col"[^>]*>5\/10<\/th>/i);
  assert.match(homepage, /<td\b[^>]*class="[^"]*leaderboard-total-cell[^"]*"[\s\S]*?>[\s\S]*?>20<(?=[\s\S]*?>pts<)/i);
  assert.match(homepage, /<td\b[^>]*class="[^"]*leaderboard-player-cell[^"]*"[\s\S]*?>[\s\S]*?>Alice Smith</i);
  assert.match(homepage, />Show breakdown</i);
  assert.match(homepage, /<td\b[^>]*data-event-slug="spring-showdown"[^>]*>10<\/td>/i);
  assert.match(homepage, /<td\b[^>]*data-event-slug="summer-sizzler"[^>]*>11<\/td>/i);
```

Add one assertion that a missed event renders blank instead of `0` by using the one-missed-event fixture from Task 1 in a new `siteBuildCommand` test:

```js
test("siteBuildCommand leaves missed homepage event overview cells blank", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-homepage-overview-blank-");
  const store = createStore();

  store.events.items.push({
    id: "event_0002",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-05-10",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: ["result_0003"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  store.results.items.push({
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
  });

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

  assert.match(homepage, /<td\b[^>]*data-event-slug="summer-sizzler"[^>]*><\/td>/i);
  assert.doesNotMatch(homepage, /<td\b[^>]*data-event-slug="summer-sizzler"[^>]*>0<\/td>/i);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because the homepage still renders `<details>` cards rather than the new shared table.

- [ ] **Step 3: Write the minimal template implementation**

In `site/index.njk`, replace the current homepage leaderboard `<ol class="leaderboard-list">` block with a horizontally scrollable table:

```njk
    <div class="leaderboard-table-scroll">
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th scope="col">Pts</th>
            <th scope="col">Player</th>
            {% for event in publicModel.homepage.leaderboardEvents %}
              <th scope="col">{{ event.shortDate }}</th>
            {% endfor %}
          </tr>
        </thead>
        <tbody>
          {% for row in publicModel.homepage.leaderboardRows %}
            <tr>
              <td class="leaderboard-total-cell">
                <span class="leaderboard-points-value">{{ row.seasonPoints }}</span>
                <span class="leaderboard-points-label">pts</span>
              </td>
              <td class="leaderboard-player-cell">
                <details class="leaderboard-breakdown-toggle">
                  <summary>
                    <span class="leaderboard-name">{{ row.playerName }}</span>
                    <span class="leaderboard-breakdown-label">Show Breakdown</span>
                  </summary>
                  <span class="leaderboard-events">{{ row.eventsPlayed }} event{% if row.eventsPlayed !== 1 %}s{% endif %}</span>
                </details>
              </td>
              {% for event in row.eventOverview %}
                <td data-event-slug="{{ event.eventSlug }}">{% if event.played %}{{ event.points }}{% endif %}</td>
              {% endfor %}
            </tr>
            <tr class="leaderboard-breakdown-row">
              <td colspan="{{ 2 + publicModel.homepage.leaderboardEvents.length }}">
                <div class="leaderboard-breakdown">
                  <div class="table-scroll">
                    <table>
                      <caption class="visually-hidden">{{ row.playerName }} scoring breakdown</caption>
                      <thead>
                        <tr>
                          <th scope="col">Event</th>
                          <th scope="col">Attendance</th>
                          <th scope="col">Placement</th>
                          <th scope="col">Starting Tag Bonus</th>
                          <th scope="col">Tag 1 Bonus</th>
                          <th scope="col">Beat Your Tag Bonus</th>
                          <th scope="col">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {% for event in row.eventBreakdown %}
                          <tr>
                            <td><a href="/events/{{ event.eventSlug }}/">{{ event.eventName }}</a></td>
                            <td>{{ event.attendance }}</td>
                            <td>{{ event.placement }}</td>
                            <td>{{ event.startingTagBonus }}</td>
                            <td>{{ event.tagOneBonus }}</td>
                            <td>{{ event.beatYourTagBonus }}</td>
                            <td>{{ event.eventTotal }}</td>
                          </tr>
                        {% endfor %}
                        <tr>
                          <th scope="row">Totals</th>
                          <td>{{ row.totals.attendance }}</td>
                          <td>{{ row.totals.placement }}</td>
                          <td>{{ row.totals.startingTagBonus }}</td>
                          <td>{{ row.totals.tagOneBonus }}</td>
                          <td>{{ row.totals.beatYourTagBonus }}</td>
                          <td>{{ row.totals.eventTotal }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </td>
            </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
```

If the nested `<details>` summary does not produce a clean accessible structure inside the table, simplify it to a plain button-like summary text treatment using `<details>` and `<summary>` just around the label, but keep the visible `Show Breakdown` control in the player cell.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS for the homepage HTML assertions, with CSS assertions still failing or still referencing old classes.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js site/index.njk
git commit -m "feat: render homepage event overview table"
```

### Task 3: Update homepage leaderboard styling for horizontal overview layout

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/styles/site.css`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing stylesheet assertions**

In the existing `siteBuildCommand` rendering test, replace the old card/disclosure CSS checks with assertions for the new table selectors:

```js
  assert.match(stylesheet, /\.leaderboard-table-scroll\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-table\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-total-cell\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-player-cell\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown-row\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown\s+\.table-scroll\s*\{/i);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: FAIL because `site/styles/site.css` still only contains the old card-summary selectors.

- [ ] **Step 3: Write the minimal CSS implementation**

In `site/styles/site.css`, replace the current homepage leaderboard card rules near `.leaderboard-card` with table-oriented styles:

```css
.leaderboard-table-scroll {
  overflow-x: auto;
}

.leaderboard-table {
  width: 100%;
  min-width: 42rem;
  border-collapse: separate;
  border-spacing: 0;
}

.leaderboard-table th,
.leaderboard-table td {
  padding: 0.85rem 1rem;
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid var(--color-line);
  background: #fffef9;
}

.leaderboard-table th:first-child,
.leaderboard-table td:first-child,
.leaderboard-table th:nth-child(2),
.leaderboard-table td:nth-child(2) {
  text-align: left;
}

.leaderboard-total-cell {
  min-width: 4.5rem;
}

.leaderboard-points-value,
.leaderboard-points-label {
  display: block;
}

.leaderboard-points-value {
  color: var(--color-orange);
  font-family: "Arial Black", Impact, Haettenschweiler, "Arial Narrow Bold", Arial, sans-serif;
  font-size: 1.5rem;
  line-height: 1;
}

.leaderboard-points-label {
  color: var(--color-ink-soft);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.leaderboard-player-cell {
  min-width: 14rem;
  text-align: left;
}

.leaderboard-breakdown-toggle summary {
  cursor: pointer;
  list-style: none;
}

.leaderboard-breakdown-toggle summary::-webkit-details-marker {
  display: none;
}

.leaderboard-breakdown-label {
  display: block;
  margin-top: 0.2rem;
  color: var(--color-ink-soft);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.leaderboard-breakdown-row td {
  padding: 0;
  border-bottom: 0;
}

.leaderboard-breakdown {
  padding: 0.75rem 0 1rem;
}

.leaderboard-breakdown .table-scroll {
  padding: 0 1rem 1rem;
}

.leaderboard-breakdown table {
  min-width: 48rem;
}
```

Keep `.leaderboard-name`, `.leaderboard-events`, and `.visually-hidden` if they are still used. Remove `.leaderboard-card`, `.leaderboard-summary`, and `.leaderboard-summary-indicator` only after confirming nothing else references them.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/siteBuildCommand.test.js`
Expected: PASS for the focused homepage/public-model suite.

- [ ] **Step 5: Run the full automated suite**

Run: `npm test`
Expected: PASS across the repository.

- [ ] **Step 6: Commit**

```bash
git add tests/siteBuildCommand.test.js site/styles/site.css
git commit -m "style: update homepage leaderboard overview layout"
```
