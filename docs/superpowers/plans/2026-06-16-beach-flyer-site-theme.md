# Beach Flyer Site Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Eleventy public site so the homepage and event pages read like a competitive summer tournament poster while preserving the existing content structure and scoreboard readability.

**Architecture:** Keep the current Eleventy page structure and public model intact. Make the theme shift through targeted semantic class additions in the three Nunjucks templates, then centralize the visual treatment in `site/styles/site.css`, with regression coverage added to the real-site build test.

**Tech Stack:** Node.js, Eleventy, Nunjucks, plain CSS, `node:test`, `node:assert/strict`

---

## File Map

- Modify: `tests/siteBuildCommand.test.js`
  - Add rendering assertions for the new homepage and event-page theme hooks.
  - Add stylesheet assertions for the new theme tokens and key selectors.
- Modify: `site/_includes/layout.njk`
  - Add a body-level class hook for the global themed shell.
- Modify: `site/index.njk`
  - Add homepage hero, section-heading, leaderboard, and event-tile semantic wrappers.
- Modify: `site/events/event.njk`
  - Add event-poster header hooks, stronger link hooks, and scoreboard panel hooks.
- Modify: `site/styles/site.css`
  - Replace the neutral utility styling with the Beach Flyer palette, typography, layout framing, card treatments, badge styling, and responsive table polish.

### Task 1: Lock the themed markup contract with failing build assertions

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Write the failing assertions for homepage, event page, and stylesheet output**

In `tests/siteBuildCommand.test.js`, update the `siteBuildCommand builds a real Eleventy site into dist with homepage and event pages` test so it also reads the built stylesheet and asserts the new structural hooks.

Add this line after `const eventPage = await fs.readFile(..., "utf8");`:

```js
  const stylesheet = await fs.readFile(path.join(tempDirectory, "dist", "styles", "site.css"), "utf8");
```

Then add these assertions near the existing homepage and event-page checks:

```js
  assert.match(homepage, /class="site-body"/i);
  assert.match(homepage, /class="page-header hero panel stack"/i);
  assert.match(homepage, /class="section-heading"/i);
  assert.match(homepage, /class="leaderboard-row panel"/i);
  assert.match(homepage, /class="event-tile panel stack-tight"/i);

  assert.match(eventPage, /class="event-page stack"/i);
  assert.match(eventPage, /class="page-header event-poster panel stack-tight"/i);
  assert.match(eventPage, /class="back-link"/i);
  assert.match(eventPage, /class="meta-row event-meta"/i);
  assert.match(eventPage, /class="secondary-link"/i);
  assert.match(eventPage, /class="panel stack scoreboard-panel"/i);

  assert.match(stylesheet, /--color-sand:/i);
  assert.match(stylesheet, /\.hero\s*\{/i);
  assert.match(stylesheet, /\.event-tile\s*\{/i);
  assert.match(stylesheet, /\.scoreboard-panel\s*table/i);
```

- [ ] **Step 2: Run the focused site build test to verify it fails**

Run: `npm test -- tests/siteBuildCommand.test.js`
Expected: FAIL because the templates and stylesheet do not yet emit the new classes and theme selectors.

- [ ] **Step 3: Commit the failing-test checkpoint**

```bash
git add tests/siteBuildCommand.test.js
git commit -m "test: cover beach flyer site theme hooks"
```

### Task 2: Add semantic theme hooks to the layout and templates

**Files:**
- Modify: `site/_includes/layout.njk`
- Modify: `site/index.njk`
- Modify: `site/events/event.njk`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Update the shared layout hook**

Replace `site/_includes/layout.njk` with:

```njk
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ pageTitle or site.title }}</title>
    <link rel="stylesheet" href="/styles/site.css">
  </head>
  <body class="site-body">
    <main class="page-shell">
      {{ content | safe }}
    </main>
  </body>
</html>
```

- [ ] **Step 2: Update the homepage structure for the hero, placards, and tiles**

Replace `site/index.njk` with:

```njk
---
layout: layout.njk
pageTitle: Bag Tag Leaderboard
---
<header class="page-header hero panel stack">
  <p class="eyebrow">League Standings</p>
  <h1>{{ site.title }}</h1>
</header>

{% if publicModel.homepage.leaderboardRows.length %}
  <section class="panel stack">
    <div class="section-heading stack-tight">
      <p class="eyebrow">Season Race</p>
      <h2>Leaderboard</h2>
    </div>
    <ol class="leaderboard-list">
      {% for row in publicModel.homepage.leaderboardRows %}
        <li class="leaderboard-row panel">
          <div class="leaderboard-primary">
            <span class="leaderboard-name">{{ row.playerName }}</span>
            <span class="leaderboard-events">{{ row.eventsPlayed }} event{% if row.eventsPlayed !== 1 %}s{% endif %}</span>
          </div>
          <span class="leaderboard-points">{{ row.seasonPoints }} pts</span>
        </li>
      {% endfor %}
    </ol>
  </section>
{% endif %}

{% if publicModel.homepage.events.length %}
  <section class="panel stack">
    <div class="section-heading stack-tight">
      <p class="eyebrow">Tournament Lineup</p>
      <h2>Events</h2>
    </div>
    <ul class="event-list">
      {% for event in publicModel.homepage.events %}
        <li class="event-tile panel stack-tight">
          <span class="event-date">{{ event.eventDate }}</span>
          <a href="/events/{{ event.slug }}/">{{ event.name }}</a>
        </li>
      {% endfor %}
    </ul>
  </section>
{% else %}
  <p class="empty-state">No events yet.</p>
{% endif %}
```

- [ ] **Step 3: Update the event page structure for the poster header and scoreboard panel**

Replace `site/events/event.njk` with:

```njk
---
layout: layout.njk
pagination:
  data: publicModel.eventPages
  size: 1
  alias: eventPage
permalink: "events/{{ eventPage.slug }}/index.html"
eleventyComputed:
  pageTitle: "{{ eventPage.name }} | Bag Tag Leaderboard"
---
<article class="event-page stack">
  <header class="page-header event-poster panel stack-tight">
    <p><a class="back-link" href="/">Back to home</a></p>
    <h1>{{ eventPage.name }}</h1>
    <div class="meta-row event-meta">
      <span>{{ eventPage.eventDate }}</span>
      {% if eventPage.isMajor %}
        <span class="badge">Major</span>
      {% endif %}
    </div>
    <p><a class="secondary-link" href="{{ eventPage.udiscUrl }}">View on UDisc</a></p>
  </header>

  <section class="panel stack scoreboard-panel">
    <div class="section-heading stack-tight">
      <p class="eyebrow">Round Results</p>
      <h2>Scoreboard</h2>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Start Tag</th>
            <th>Finish</th>
            <th>Attendance</th>
            <th>Placement</th>
            <th>Start Bonus</th>
            <th>Tag #1</th>
            <th>Beat Tag</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {% for row in eventPage.scoreboard %}
            <tr>
              <td>{{ row.playerName }}</td>
              <td>{{ row.startingTag }}</td>
              <td>{% if row.eventResult === null %}DNF{% else %}{{ row.eventResult }}{% endif %}</td>
              <td>{{ row.attendance }}</td>
              <td>{{ row.placement }}</td>
              <td>{{ row.startingTagBonus }}</td>
              <td>{{ row.tagOneBonus }}</td>
              <td>{{ row.beatYourTagBonus }}</td>
              <td>{{ row.eventTotal }}</td>
            </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </section>
</article>
```

- [ ] **Step 4: Run the focused site build test to verify the new markup passes**

Run: `npm test -- tests/siteBuildCommand.test.js`
Expected: FAIL, but now only on the stylesheet assertions because the markup hooks exist and the CSS has not been updated yet.

- [ ] **Step 5: Commit the template changes**

```bash
git add site/_includes/layout.njk site/index.njk site/events/event.njk tests/siteBuildCommand.test.js
git commit -m "feat: add beach flyer site theme structure"
```

### Task 3: Replace the neutral stylesheet with the Beach Flyer theme

**Files:**
- Modify: `site/styles/site.css`
- Test: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Replace the stylesheet with the themed implementation**

Replace `site/styles/site.css` with:

```css
:root {
  color-scheme: light;
  font-family: "Arial Black", Impact, Haettenschweiler, "Arial Narrow Bold", Arial, sans-serif;
  line-height: 1.5;
  --color-sand: #f6deb3;
  --color-sun: #ffb703;
  --color-orange: #fb8500;
  --color-ink: #12304a;
  --color-ink-soft: #35556f;
  --color-card: #fffaf2;
  --color-card-strong: #fffdf8;
  --color-line: rgba(18, 48, 74, 0.18);
  --shadow-poster: 0 20px 45px rgba(18, 48, 74, 0.14);
  --shadow-card: 0 12px 24px rgba(18, 48, 74, 0.1);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.site-body {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.5), transparent 30%),
    linear-gradient(180deg, #ffe6b8 0%, var(--color-sand) 44%, #f7d39c 100%);
  color: var(--color-ink);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: var(--color-ink);
  font-weight: 700;
  text-decoration-thickness: 0.14em;
  text-underline-offset: 0.18em;
}

a:hover,
a:focus-visible {
  color: #071b2c;
}

table a {
  white-space: nowrap;
}

.page-shell {
  width: min(100%, 74rem);
  margin: 0 auto;
  padding: 1.25rem;
}

.page-shell > * + * {
  margin-top: 1.25rem;
}

.page-header {
  margin-bottom: 0;
}

.panel {
  background: linear-gradient(180deg, var(--color-card-strong) 0%, var(--color-card) 100%);
  border: 3px solid rgba(18, 48, 74, 0.9);
  border-radius: 1.4rem;
  box-shadow: var(--shadow-card);
  padding: 1.25rem;
}

.hero,
.event-poster {
  position: relative;
  overflow: clip;
  box-shadow: var(--shadow-poster);
}

.hero::before,
.event-poster::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 0.65rem;
  background: linear-gradient(90deg, var(--color-orange), var(--color-sun), var(--color-orange));
}

.hero h1,
.event-poster h1,
h2,
.leaderboard-points {
  font-family: "Arial Black", Impact, Haettenschweiler, "Arial Narrow Bold", Arial, sans-serif;
  letter-spacing: 0.02em;
}

.hero h1,
.event-poster h1 {
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 4.75rem);
  line-height: 0.95;
  text-transform: uppercase;
}

h2 {
  margin: 0;
  font-size: clamp(1.45rem, 2.4vw, 2rem);
  line-height: 1;
  text-transform: uppercase;
}

.eyebrow {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.section-heading {
  padding-bottom: 0.75rem;
  border-bottom: 2px dashed rgba(18, 48, 74, 0.22);
}

.stack > * + * {
  margin-top: 1rem;
}

.stack-tight > * + * {
  margin-top: 0.5rem;
}

.leaderboard-list,
.event-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.leaderboard-list,
.event-list,
.event-page {
  display: grid;
  gap: 1rem;
}

.leaderboard-row,
.event-tile {
  background: #fffef9;
}

.leaderboard-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.1rem;
  border-width: 2px;
}

.leaderboard-primary {
  display: grid;
  gap: 0.2rem;
}

.leaderboard-name {
  font-size: 1.15rem;
  font-weight: 700;
}

.leaderboard-events {
  color: var(--color-ink-soft);
  font-size: 0.92rem;
}

.leaderboard-points {
  color: var(--color-orange);
  font-size: 1.4rem;
  line-height: 1;
}

.event-tile {
  padding: 1rem 1.1rem;
  border-width: 2px;
}

.event-tile a {
  font-size: 1.2rem;
  text-decoration: none;
}

.event-tile a:hover,
.event-tile a:focus-visible {
  text-decoration: underline;
}

.event-date,
.meta-row {
  color: var(--color-ink-soft);
}

.event-date {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.event-meta {
  align-items: flex-start;
}

.back-link,
.secondary-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.35rem 0.7rem;
  border: 2px solid rgba(18, 48, 74, 0.85);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
  text-decoration: none;
}

.back-link:hover,
.back-link:focus-visible,
.secondary-link:hover,
.secondary-link:focus-visible {
  background: rgba(255, 255, 255, 0.95);
}

.badge {
  display: inline-block;
  width: fit-content;
  padding: 0.25rem 0.65rem;
  border: 2px solid rgba(18, 48, 74, 0.9);
  border-radius: 0.35rem;
  background: linear-gradient(180deg, #ffd45d 0%, var(--color-orange) 100%);
  color: #082032;
  font-family: "Arial Black", Impact, Haettenschweiler, "Arial Narrow Bold", Arial, sans-serif;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transform: rotate(-3deg);
  box-shadow: 0.25rem 0.25rem 0 rgba(18, 48, 74, 0.14);
}

.empty-state {
  margin: 0;
  color: var(--color-ink-soft);
}

.scoreboard-panel {
  overflow: hidden;
}

.table-scroll {
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

table {
  width: 100%;
  min-width: 42rem;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.95rem;
}

th,
td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}

th {
  background: rgba(18, 48, 74, 0.08);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.scoreboard-panel table tbody tr:nth-child(even) {
  background: rgba(255, 183, 3, 0.08);
}

.scoreboard-panel table tbody td:last-child,
.scoreboard-panel table tbody td:nth-child(3),
.scoreboard-panel table tbody td:nth-child(4),
.scoreboard-panel table tbody td:nth-child(5),
.scoreboard-panel table tbody td:nth-child(6),
.scoreboard-panel table tbody td:nth-child(7),
.scoreboard-panel table tbody td:nth-child(8),
.scoreboard-panel table tbody td:nth-child(9) {
  font-variant-numeric: tabular-nums;
}

@media (min-width: 48rem) {
  .page-shell {
    padding: 2rem 1.5rem 3rem;
  }

  .panel {
    padding: 1.5rem;
  }

  .leaderboard-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .event-list {
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  }

  .meta-row {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.75rem;
  }
}
```

- [ ] **Step 2: Run the focused site build test to verify the themed output passes**

Run: `npm test -- tests/siteBuildCommand.test.js`
Expected: PASS for the updated rendering assertions and no regressions in the rest of the file.

- [ ] **Step 3: Commit the stylesheet implementation**

```bash
git add site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "feat: apply beach flyer public site theme"
```

### Task 4: Run full verification and perform the required visual review

**Files:**
- Verify: `site/_includes/layout.njk`
- Verify: `site/index.njk`
- Verify: `site/events/event.njk`
- Verify: `site/styles/site.css`
- Verify: `tests/siteBuildCommand.test.js`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS for the full Node test suite.

- [ ] **Step 2: Run the production site build**

Run: `npm run build`
Expected: PASS with output ending in `Built public site for <n> event page(s).`

- [ ] **Step 3: Perform desktop visual review against the acceptance criteria**

Open these built files in a browser at desktop width and confirm each item directly:

```text
dist/index.html
dist/events/spring-showdown/index.html
```

Desktop review checklist:

```text
- Homepage hero reads like a poster header without subtitle copy.
- Leaderboard rows read as placards with stronger player/points hierarchy.
- Event tiles feel promotional rather than archival.
- Event page header has a stronger masthead and the Major badge reads like a stamp.
- Scoreboard remains easy to scan.
```

- [ ] **Step 4: Perform mobile visual review against the acceptance criteria**

Using the same two built pages at a narrow viewport, confirm:

```text
- Hero, placards, and event tiles stack cleanly.
- Event metadata does not crowd or wrap awkwardly.
- Scoreboard still scrolls horizontally.
- Decorative framing simplifies cleanly instead of compressing content.
```

- [ ] **Step 5: Commit the verified final state**

```bash
git add site/_includes/layout.njk site/index.njk site/events/event.njk site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "feat: restyle public site with beach flyer theme"
```
