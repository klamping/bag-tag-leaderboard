# Public Points Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact points-rules summary to the homepage and event pages, plus a dedicated `/points-rules/` page, so visitors can quickly understand how scoring works.

**Architecture:** Extend `buildPublicModel()` with one shared `pointsRules` object, then render that shared content through one reusable Eleventy include on the homepage and event pages plus a new dedicated rules page template. Keep the public copy explicit and hand-curated in code so the summary and full rules remain stable and easy to test.

**Tech Stack:** Node.js built-in test runner, Eleventy/Nunjucks templates, existing site CSS, existing CLI site build pipeline.

---

## File Map

- Modify: `lib/domain/buildPublicModel.js`
  - Add one shared `pointsRules` object to the top-level `publicModel`.
- Modify: `tests/siteBuildCommand.test.js`
  - Add failing public-model and rendered-output assertions for the shared rules content, homepage summary, event-page summary, and `/points-rules/` page.
- Create: `site/_includes/points-rules-summary.njk`
  - Reusable compact summary panel used on the homepage and event pages.
- Modify: `site/index.njk`
  - Render the summary panel near the leaderboard section.
- Modify: `site/events/event.njk`
  - Render the same summary panel near the event scoreboard.
- Create: `site/points-rules.njk`
  - Dedicated `/points-rules/` page rendering the full rules content.
- Modify: `site/styles/site.css`
  - Add styles for the summary panel and full rules page sections using the existing panel visual language.

### Task 1: Shared Public Rules Data

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/domain/buildPublicModel.js`

- [ ] **Step 1: Write the failing public-model test**

In `tests/siteBuildCommand.test.js`, extend the first test, `buildPublicModel returns homepage and event page models from the canonical store`, with an assertion immediately after `const model = buildPublicModel(createStore());`:

```js
  assert.deepEqual(model.pointsRules, {
    summaryTitle: "How points work",
    summaryIntro: "Season standings combine attendance, finish placement, and tag-based bonuses.",
    summaryItems: [
      { label: "Attendance", detail: "2 points for attending an event." },
      {
        label: "Placement",
        detail: "1st gets 8, 2nd 6, 3rd 5, 4th 4, then top-half gets 2 and top-75% gets 1.",
      },
      {
        label: "Starting Tag Bonus",
        detail: "+1 for each player at the event with a worse tag than yours, capped at 6.",
      },
      { label: "Tag #1 Bonus", detail: "+2 if you start the event holding tag #1." },
      {
        label: "Beat Your Tag Bonus",
        detail: "Improve 1-2 spots for +1, 3-4 for +2, and 5+ for +3.",
      },
    ],
    summaryTieNote: "Tied players share placement points.",
    fullPageTitle: "Points Rules",
    fullPageIntro: "Bag tag points come from attendance, finish placement, and tag-based bonuses.",
    sections: [
      {
        title: "Attendance",
        items: ["2 points for attending an event."],
      },
      {
        title: "Event Placement",
        items: [
          "1st place: 8 points",
          "2nd place: 6 points",
          "3rd place: 5 points",
          "4th place: 4 points",
          "Top 50% of the field: 2 points",
          "Top 75% of the field: 1 point",
        ],
      },
      {
        title: "Starting Tag Bonus",
        items: [
          "+1 point for each player at the event with a worse tag than yours.",
          "Maximum of 6 points.",
        ],
      },
      {
        title: "Tag #1 Bonus",
        items: ["+2 points if you start the event with tag #1."],
      },
      {
        title: 'Beat Your Tag Bonus',
        items: [
          "Players are ranked at the start of the event by tag among attendees.",
          "Players are ranked again by event results.",
          "Improvement is starting rank minus finishing rank.",
          "Improve by 1-2 positions: +1 point",
          "Improve by 3-4 positions: +2 points",
          "Improve by 5 or more positions: +3 points",
        ],
      },
      {
        title: "Ties",
        items: ["Tied players at the end of the event share placement points."],
      },
      {
        title: "Starting Tag Duplication Rules",
        items: [
          "Duplicate starting tags are allowed only when a player is newly joining mid-season and inherits the entry tag.",
          "Duplicate starting tags are allowed when league policy explicitly assigns the same provisional tag to multiple late joiners.",
          "Duplicate starting tags are not allowed if both players already had established tags before the event.",
          "Duplicate starting tags are not allowed when caused by admin data-entry mistakes.",
          "Duplicate starting tags are not allowed if they conflict with a previously confirmed event assignment and no correction workflow is used.",
          "When duplicate starting tags are allowed, players sharing the same tag share the same starting rank.",
          "No secondary tiebreak is used for starting-rank calculations.",
        ],
      },
    ],
    href: "/points-rules/",
  });
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="buildPublicModel returns homepage and event page models from the canonical store"`

Expected: FAIL with an assertion showing `model.pointsRules` is `undefined` or missing.

- [ ] **Step 3: Write the minimal shared rules implementation**

In `lib/domain/buildPublicModel.js`, add a helper above `buildPublicModel()` and expose it from the returned object.

Add this helper:

```js
function createPointsRules() {
  return {
    summaryTitle: "How points work",
    summaryIntro: "Season standings combine attendance, finish placement, and tag-based bonuses.",
    summaryItems: [
      { label: "Attendance", detail: "2 points for attending an event." },
      {
        label: "Placement",
        detail: "1st gets 8, 2nd 6, 3rd 5, 4th 4, then top-half gets 2 and top-75% gets 1.",
      },
      {
        label: "Starting Tag Bonus",
        detail: "+1 for each player at the event with a worse tag than yours, capped at 6.",
      },
      { label: "Tag #1 Bonus", detail: "+2 if you start the event holding tag #1." },
      {
        label: "Beat Your Tag Bonus",
        detail: "Improve 1-2 spots for +1, 3-4 for +2, and 5+ for +3.",
      },
    ],
    summaryTieNote: "Tied players share placement points.",
    fullPageTitle: "Points Rules",
    fullPageIntro: "Bag tag points come from attendance, finish placement, and tag-based bonuses.",
    sections: [
      {
        title: "Attendance",
        items: ["2 points for attending an event."],
      },
      {
        title: "Event Placement",
        items: [
          "1st place: 8 points",
          "2nd place: 6 points",
          "3rd place: 5 points",
          "4th place: 4 points",
          "Top 50% of the field: 2 points",
          "Top 75% of the field: 1 point",
        ],
      },
      {
        title: "Starting Tag Bonus",
        items: [
          "+1 point for each player at the event with a worse tag than yours.",
          "Maximum of 6 points.",
        ],
      },
      {
        title: "Tag #1 Bonus",
        items: ["+2 points if you start the event with tag #1."],
      },
      {
        title: 'Beat Your Tag Bonus',
        items: [
          "Players are ranked at the start of the event by tag among attendees.",
          "Players are ranked again by event results.",
          "Improvement is starting rank minus finishing rank.",
          "Improve by 1-2 positions: +1 point",
          "Improve by 3-4 positions: +2 points",
          "Improve by 5 or more positions: +3 points",
        ],
      },
      {
        title: "Ties",
        items: ["Tied players at the end of the event share placement points."],
      },
      {
        title: "Starting Tag Duplication Rules",
        items: [
          "Duplicate starting tags are allowed only when a player is newly joining mid-season and inherits the entry tag.",
          "Duplicate starting tags are allowed when league policy explicitly assigns the same provisional tag to multiple late joiners.",
          "Duplicate starting tags are not allowed if both players already had established tags before the event.",
          "Duplicate starting tags are not allowed when caused by admin data-entry mistakes.",
          "Duplicate starting tags are not allowed if they conflict with a previously confirmed event assignment and no correction workflow is used.",
          "When duplicate starting tags are allowed, players sharing the same tag share the same starting rank.",
          "No secondary tiebreak is used for starting-rank calculations.",
        ],
      },
    ],
    href: "/points-rules/",
  };
}
```

Then inside `buildPublicModel(store)`, create the shared object once and return it:

```js
  const pointsRules = createPointsRules();

  return {
    siteTitle: "Bag Tag Leaderboard",
    pointsRules,
    homepage: {
      leaderboardRows: toDisplayLeaderboardRows(
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- --test-name-pattern="buildPublicModel returns homepage and event page models from the canonical store"`

Expected: PASS for the focused public-model test.

- [ ] **Step 5: Commit**

```bash
git add tests/siteBuildCommand.test.js lib/domain/buildPublicModel.js
git commit -m "feat: add shared public points rules data"
```

### Task 2: Summary Panel On Homepage And Event Pages

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Create: `site/_includes/points-rules-summary.njk`
- Modify: `site/index.njk`
- Modify: `site/events/event.njk`
- Modify: `site/styles/site.css`

- [ ] **Step 1: Write the failing rendered-output assertions**

In `tests/siteBuildCommand.test.js`, inside `test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => { ... })`, add these homepage, event-page, and stylesheet assertions after the existing leaderboard checks:

```js
  assert.match(homepage, elementWithClassPattern("section", "points-rules-summary"));
  assert.match(homepage, />How points work</i);
  assert.match(
    homepage,
    />Season standings combine attendance, finish placement, and tag-based bonuses\./i
  );
  assert.match(homepage, />Attendance<[^>]*>2 points for attending an event\./i);
  assert.match(homepage, />Placement<[^>]*>1st gets 8, 2nd 6, 3rd 5, 4th 4, then top-half gets 2 and top-75% gets 1\./i);
  assert.match(homepage, />Tied players share placement points\./i);
  assert.match(homepage, /href="\/points-rules\/"[^>]*>See full points rules</i);

  assert.match(eventPage, elementWithClassPattern("section", "points-rules-summary"));
  assert.match(eventPage, />How points work</i);
  assert.match(eventPage, /href="\/points-rules\/"[^>]*>See full points rules</i);

  assert.match(stylesheet, /\.points-rules-summary\s*\{/i);
  assert.match(stylesheet, /\.points-rules-summary-list\s*\{/i);
  assert.match(stylesheet, /\.points-rules-summary-link\s*\{/i);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: FAIL because the summary panel markup and CSS selectors do not exist yet.

- [ ] **Step 3: Create the reusable summary include**

Create `site/_includes/points-rules-summary.njk` with this exact content:

```njk
<section class="panel stack-tight points-rules-summary" aria-labelledby="points-rules-summary-title">
  <div class="section-heading stack-tight">
    <p class="eyebrow">Scoring</p>
    <h2 id="points-rules-summary-title">{{ publicModel.pointsRules.summaryTitle }}</h2>
  </div>
  <p>{{ publicModel.pointsRules.summaryIntro }}</p>
  <dl class="points-rules-summary-list">
    {% for item in publicModel.pointsRules.summaryItems %}
      <div>
        <dt>{{ item.label }}</dt>
        <dd>{{ item.detail }}</dd>
      </div>
    {% endfor %}
  </dl>
  <p class="points-rules-summary-note">{{ publicModel.pointsRules.summaryTieNote }}</p>
  <p>
    <a class="points-rules-summary-link" href="{{ publicModel.pointsRules.href }}">See full points rules</a>
  </p>
</section>
```

- [ ] **Step 4: Render the include on the homepage and event page**

In `site/index.njk`, render the include immediately after the leaderboard section block and before the past-events section:

```njk
{% if publicModel.leaderboardRows.length %}
  ...existing leaderboard section...
{% endif %}

{% include "points-rules-summary.njk" %}

{% if publicModel.homepage.events.length %}
```

Use the actual homepage property name already in the file when inserting the include:

```njk
{% if publicModel.homepage.leaderboardRows.length %}
  ...existing leaderboard section...
{% endif %}

{% include "points-rules-summary.njk" %}

{% if publicModel.homepage.events.length %}
```

In `site/events/event.njk`, render the same include immediately after the scoreboard section:

```njk
  <section class="panel stack scoreboard-panel">
    ...existing scoreboard...
  </section>

  {% include "points-rules-summary.njk" %}
</article>
```

- [ ] **Step 5: Add the minimal styles for the summary panel**

In `site/styles/site.css`, add these rules near the other panel/table utility styles:

```css
.points-rules-summary-list {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

.points-rules-summary-list > div {
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed rgba(18, 48, 74, 0.22);
}

.points-rules-summary-list > div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.points-rules-summary-list dt {
  font-weight: 700;
}

.points-rules-summary-list dd {
  margin: 0.2rem 0 0;
  color: var(--color-ink-soft);
}

.points-rules-summary-note {
  margin: 0;
  font-weight: 700;
}

.points-rules-summary-link {
  white-space: nowrap;
}
```

- [ ] **Step 6: Run the focused test to verify it passes**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: PASS with homepage and event-page summary content present.

- [ ] **Step 7: Commit**

```bash
git add tests/siteBuildCommand.test.js site/_includes/points-rules-summary.njk site/index.njk site/events/event.njk site/styles/site.css
git commit -m "feat: add public points rules summary panels"
```

### Task 3: Dedicated Points Rules Page

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Create: `site/points-rules.njk`
- Modify: `site/styles/site.css`

- [ ] **Step 1: Write the failing dedicated-page assertions**

In `tests/siteBuildCommand.test.js`, inside `test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => { ... })`, read the built rules page and assert its content.

Add this file read next to the existing homepage/event page reads:

```js
  const pointsRulesPage = await fs.readFile(
    path.join(tempDirectory, "dist", "points-rules", "index.html"),
    "utf8"
  );
```

Then add these assertions:

```js
  assert.match(pointsRulesPage, /<title>Points Rules \| Bag Tag Leaderboard<\/title>/i);
  assert.match(pointsRulesPage, />Points Rules</i);
  assert.match(
    pointsRulesPage,
    />Bag tag points come from attendance, finish placement, and tag-based bonuses\./i
  );
  assert.match(pointsRulesPage, />Event Placement</i);
  assert.match(pointsRulesPage, />1st place: 8 points</i);
  assert.match(pointsRulesPage, />Starting Tag Duplication Rules</i);
  assert.match(
    pointsRulesPage,
    />Duplicate starting tags are allowed only when a player is newly joining mid-season and inherits the entry tag\./i
  );
  assert.match(pointsRulesPage, /href="\/"[^>]*>Back to home</i);

  assert.match(stylesheet, /\.points-rules-page\s*\{/i);
  assert.match(stylesheet, /\.points-rules-section\s*\{/i);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: FAIL because `dist/points-rules/index.html` does not exist yet.

- [ ] **Step 3: Create the dedicated rules page template**

Create `site/points-rules.njk` with this exact content:

```njk
---
layout: layout.njk
pageTitle: Points Rules | Bag Tag Leaderboard
permalink: "points-rules/index.html"
---
<article class="points-rules-page stack">
  <header class="page-header panel stack-tight">
    <p><a class="back-link" href="/">Back to home</a></p>
    <p class="eyebrow">Scoring</p>
    <h1>{{ publicModel.pointsRules.fullPageTitle }}</h1>
    <p>{{ publicModel.pointsRules.fullPageIntro }}</p>
  </header>

  {% for section in publicModel.pointsRules.sections %}
    <section class="panel stack-tight points-rules-section" aria-labelledby="section-{{ loop.index }}">
      <h2 id="section-{{ loop.index }}">{{ section.title }}</h2>
      <ul class="points-rules-section-list">
        {% for item in section.items %}
          <li>{{ item }}</li>
        {% endfor %}
      </ul>
    </section>
  {% endfor %}
</article>
```

- [ ] **Step 4: Add the minimal full-page styles**

In `site/styles/site.css`, add:

```css
.points-rules-page {
  max-width: 56rem;
}

.points-rules-section-list {
  margin: 0;
  padding-left: 1.25rem;
}

.points-rules-section-list li + li {
  margin-top: 0.45rem;
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: PASS with the dedicated page built and linked content present.

- [ ] **Step 6: Run the full suite**

Run: `npm test`

Expected: PASS for the full Node test suite with no new failures.

- [ ] **Step 7: Commit**

```bash
git add tests/siteBuildCommand.test.js site/points-rules.njk site/styles/site.css
git commit -m "feat: add points rules page"
```

## Self-Review

- Spec coverage check:
  - Shared source of public rules content: Task 1
  - Homepage summary panel: Task 2
  - Event-page summary panel: Task 2
  - Dedicated `/points-rules/` page: Task 3
  - Duplicate starting-tag guidance on full page only: Tasks 1 and 3
  - TDD and verification: all tasks include red/green steps and final full-suite verification
- Placeholder scan:
  - No `TODO`, `TBD`, or “implement later” text remains.
  - All code-changing steps include concrete snippets.
- Type consistency check:
  - `publicModel.pointsRules` is the single shared property name throughout.
  - `summaryItems`, `summaryTieNote`, `fullPageTitle`, `fullPageIntro`, `sections`, and `href` are used consistently across tests and templates.
