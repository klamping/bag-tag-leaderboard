# Season Standing Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Season Standing` column to the homepage leaderboard that shows each player's shared-place rank in the current season.

**Architecture:** Keep ranking logic in the homepage public-model pipeline so Nunjucks only renders a display-ready `seasonStanding` field. Implement the change in two TDD slices: first the homepage model shape in `buildPublicModel`, then the rendered homepage table in `site/index.njk` and its integration test expectations.

**Tech Stack:** Node.js, Eleventy/Nunjucks, node:test, node:assert

---

## File Structure

- Modify: `tests/siteBuildCommand.test.js`
  Responsibility: existing homepage public-model coverage and generated homepage HTML assertions.
- Modify: `lib/domain/buildPublicModel.js`
  Responsibility: build display-ready homepage leaderboard rows.
- Modify: `site/index.njk`
  Responsibility: render the homepage leaderboard table.

### Task 1: Add `seasonStanding` To Homepage Leaderboard Rows

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing public-model test**

Update the existing `buildPublicModel returns homepage and event page models from the canonical store` assertion near `tests/siteBuildCommand.test.js:207` so each expected leaderboard row includes `seasonStanding`:

```js
  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonStanding: 1,
      seasonPoints: 10,
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/12",
          points: 10,
          played: true,
        },
      ],
      eventBreakdown: [
        {
          eventName: "Spring Showdown",
          eventSlug: "spring-showdown",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          startingTagBonusDisplay: "-",
          tagOneBonus: 0,
          tagOneBonusDisplay: "-",
          beatYourTagBonus: 0,
          beatYourTagBonusDisplay: "-",
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
      seasonStanding: 2,
      seasonPoints: 2,
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/12",
          points: 2,
          played: true,
        },
      ],
      eventBreakdown: [
        {
          eventName: "Spring Showdown",
          eventSlug: "spring-showdown",
          attendance: 2,
          placement: 0,
          startingTagBonus: 0,
          startingTagBonusDisplay: "-",
          tagOneBonus: 0,
          tagOneBonusDisplay: "-",
          beatYourTagBonus: 0,
          beatYourTagBonusDisplay: "-",
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

Add a dedicated tie-coverage test nearby so the plan enforces shared-place ranking:

```js
test("buildPublicModel assigns shared-place season standings on the homepage", () => {
  const store = createStore();

  store.events.items.push({
    id: "event_0002",
    slug: "summer-sizzler",
    name: "Summer Sizzler",
    eventDate: "2026-05-10",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/summer-sizzler",
    importPath: "data/imports/summer-sizzler.json",
    resultIds: ["result_0003", "result_0004", "result_0005"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });

  store.players.items.push({
    id: "player_0003",
    name: "Cara Diaz",
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
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 10,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "result_0005",
      eventId: "event_0002",
      playerId: "player_0003",
      finishPlace: 3,
      startingTag: 7,
      attendancePoints: 2,
      placementPoints: 4,
      startingTagBonusPoints: 0,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 6,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }
  );

  const model = buildPublicModel(store);

  assert.deepEqual(
    model.homepage.leaderboardRows.map((row) => ({
      playerName: row.playerName,
      seasonPoints: row.seasonPoints,
      seasonStanding: row.seasonStanding,
    })),
    [
      { playerName: "Alice Smith", seasonPoints: 20, seasonStanding: 1 },
      { playerName: "Bob Jones", seasonPoints: 20, seasonStanding: 1 },
      { playerName: "Cara Diaz", seasonPoints: 6, seasonStanding: 3 },
    ]
  );
});
```

- [ ] **Step 2: Run the focused public-model test to verify it fails**

Run:

```bash
npm test -- --test-name-pattern="buildPublicModel returns homepage and event page models from the canonical store|buildPublicModel assigns shared-place season standings on the homepage"
```

Expected: FAIL because `seasonStanding` is missing from homepage leaderboard rows.

- [ ] **Step 3: Write the minimal model implementation**

In `lib/domain/buildPublicModel.js`, split the homepage row construction into two small steps: first build the enriched rows, then assign standings in one pass before `toDisplayLeaderboardRows(...)`.

Add this helper above `buildPublicModel()`:

```js
function addSeasonStandings(rows) {
  let previousSeasonPoints = null;
  let currentStanding = 0;

  return rows.map((row, index) => {
    if (row.seasonPoints !== previousSeasonPoints) {
      currentStanding = index + 1;
      previousSeasonPoints = row.seasonPoints;
    }

    return {
      ...row,
      seasonStanding: currentStanding,
    };
  });
}
```

Then replace the current inline `leaderboardRows` expression with this structure:

```js
  const homepageLeaderboardRows = getSeasonLeaderboardRows({
    players: store.players.items,
    events,
    eventResults,
    eventPoints,
  }).map((row) => {
    const eventBreakdown = homepageBreakdownsByPlayerId.get(row.playerId) || [];
    const totals = sumHomepageTotals(eventBreakdown);
    const playerOverview = homepageOverviewByPlayerId.get(row.playerId) || new Map();
    const eventOverview = buildHomepageEventOverviewRow(leaderboardEvents, playerOverview);

    return {
      ...row,
      seasonPoints: totals.eventTotal,
      eventBreakdown,
      totals,
      eventOverview,
    };
  });
```

And update the homepage model return to:

```js
    homepage: {
      leaderboardRows: toDisplayLeaderboardRows(addSeasonStandings(homepageLeaderboardRows)),
      leaderboardEvents,
      events: publicEvents,
    },
```

- [ ] **Step 4: Run the focused public-model test to verify it passes**

Run:

```bash
npm test -- --test-name-pattern="buildPublicModel returns homepage and event page models from the canonical store|buildPublicModel assigns shared-place season standings on the homepage"
```

Expected: PASS.

- [ ] **Step 5: Commit the model slice**

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildPublicModel.js
git commit -m "feat: add homepage season standings"
```

### Task 2: Render The Season Standing Column On The Homepage

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `site/index.njk`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing homepage render test**

Update the homepage HTML assertions in `tests/siteBuildCommand.test.js:1059-1094` to require the new header, a standing cell, and the new breakdown-row span.

Add these assertions near the existing leaderboard header checks:

```js
  assert.match(homepage, /<th scope="col">Season Standing<\/th>/i);
  assert.match(homepage, /<th scope="col">Season<br\s*\/?>Total<\/th>/i);
```

Add this assertion near the existing total-cell assertion:

```js
  assert.match(homepage, /<td\b[^>]*class="[^"]*leaderboard-standing-cell[^"]*"[^>]*>1<\/td>/i);
```

Update the breakdown row assertion so the full-row span grows from `4` to `5` for the fixture with two event columns:

```js
  assert.match(
    homepage,
    /<tr\b[^>]*class="[^"]*leaderboard-breakdown-row[^"]*"[\s\S]*?<td\b[^>]*colspan="5"[^>]*>[\s\S]*?<div\b[^>]*class="[^"]*leaderboard-breakdown[^"]*"[\s\S]*?<caption\b[^>]*class="[^"]*visually-hidden[^"]*"[^>]*>Alice Smith scoring breakdown<\/caption>/i
  );
```

- [ ] **Step 2: Run the focused render test to verify it fails**

Run:

```bash
npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"
```

Expected: FAIL because the homepage template does not yet render the `Season Standing` header/cell and still uses the old `colspan`.

- [ ] **Step 3: Write the minimal template implementation**

In `site/index.njk`, update the homepage leaderboard table header and row template like this:

```njk
          <tr>
            <th scope="col">Season Standing</th>
            <th scope="col">Season<br />Total</th>
            <th scope="col">Player</th>
            {% for event in publicModel.homepage.leaderboardEvents %}
              <th scope="col" aria-label="{{ event.accessibleLabel }}">{{ event.shortDate }}</th>
            {% endfor %}
          </tr>
```

Add the standing cell ahead of the total cell:

```njk
            <tr>
              <td class="leaderboard-standing-cell">{{ row.seasonStanding }}</td>
              <td class="leaderboard-total-cell">
                <span class="leaderboard-points-value">{{ row.seasonPoints }}</span>
                <span class="leaderboard-points-label">pts</span>
              </td>
```

Update the breakdown span from `2 + publicModel.homepage.leaderboardEvents.length` to `3 + publicModel.homepage.leaderboardEvents.length`:

```njk
              <td colspan="{{ 3 + publicModel.homepage.leaderboardEvents.length }}">
```

- [ ] **Step 4: Run the focused render test to verify it passes**

Run:

```bash
npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"
```

Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit the render slice**

```bash
git add tests/siteBuildCommand.test.js site/index.njk
git commit -m "feat: show season standing on homepage leaderboard"
```
