# Admin Scoreboard Playwright E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic Playwright happy-path coverage for admin sign-in, UDisc-backed imports, the public event scoreboard, and the season leaderboard.

**Architecture:** Keep the browser exercising the real Next.js app, but add two narrow test seams: a test-only reset route for in-memory state and a server-side fixture import path for Playwright runs. Add stable `data-testid` hooks to the admin review UI and both scoreboard tables so the E2E specs can assert readable, deterministic row data without brittle text scraping.

**Tech Stack:** Next.js App Router, Node.js `node:test`, Playwright, in-memory app stores

---

### Task 1: Add deterministic Playwright test seams

**Files:**
- Create: `lib/e2e/adminScoreboardSeason.js`
- Create: `lib/e2e/testMode.js`
- Create: `app/api/test/reset/route.js`
- Create: `tests/playwrightTestMode.test.js`
- Create: `tests/playwrightResetRoute.test.js`
- Modify: `lib/udiscClient.js`
- Modify: `tests/udiscClient.test.js`
- Modify: `playwright.config.js`

- [ ] **Step 1: Write the failing seam tests**

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");

test("resolvePlaywrightFixtureEventFromUrl returns kickoff fixture in test mode", async () => {
  process.env.PLAYWRIGHT_TEST_MODE = "1";

  const {
    resolvePlaywrightFixtureEventFromUrl,
  } = require("../lib/e2e/testMode.js");

  assert.deepEqual(
    resolvePlaywrightFixtureEventFromUrl(
      "https://udisc.com/events/kickoff-event/leaderboard"
    ),
    {
      name: "Kickoff Event",
      date: "2026-04-01",
      slug: "kickoff-event",
      participants: [
        { playerName: "Alex Ace", externalPlayerId: "u-alex", finishPlace: 1 },
        { playerName: "Blair Birdie", externalPlayerId: "u-blair", finishPlace: 2 },
      ],
    }
  );
});

test("fetchUdiscEventFromUrl uses Playwright fixture before network fetch", async () => {
  process.env.PLAYWRIGHT_TEST_MODE = "1";

  const { fetchUdiscEventFromUrl } = require("../lib/udiscClient.js");

  const result = await fetchUdiscEventFromUrl({
    leaderboardUrl: "https://udisc.com/events/kickoff-event/leaderboard",
    fetchImpl: async () => {
      throw new Error("network should not run");
    },
  });

  assert.equal(result.slug, "kickoff-event");
  assert.equal(result.participants.length, 10);
});

test("POST /api/test/reset clears event stores when token is valid", async () => {
  process.env.PLAYWRIGHT_TEST_MODE = "1";
  process.env.PLAYWRIGHT_TEST_SECRET = "pw-secret";

  const eventsData = require("../lib/eventsData.js");
  const eventDraftStore = require("../lib/eventDraftStore.js");
  const { POST } = await import("../app/api/test/reset/route.js");

  eventsData.resetEventsData({
    players: [{ id: "player_0001", name: "Existing Player" }],
    events: [{ id: "evt_confirmed_0001", slug: "existing", name: "Existing", eventDate: "2026-04-01", status: "confirmed", season: 2026 }],
    eventResults: [{ id: "result_0001", eventId: "evt_confirmed_0001", playerId: "player_0001", finishPlace: 1 }],
    eventPoints: [{ id: "point_0001", eventResultId: "result_0001", playerId: "player_0001", eventTotal: 10 }],
  });
  await eventDraftStore.insertEventDraft({ slug: "draft-only", name: "Draft", date: "2026-04-02" });

  const response = await POST(
    new Request("http://localhost/api/test/reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-playwright-test-secret": "pw-secret",
      },
      body: JSON.stringify({}),
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(eventsData.getEventsData(), {
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  assert.equal(await eventDraftStore.findEventBySlug("draft-only"), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/playwrightTestMode.test.js tests/playwrightResetRoute.test.js tests/udiscClient.test.js`
Expected: FAIL with module-not-found errors for `lib/e2e/testMode.js` and missing route exports.

- [ ] **Step 3: Implement the minimal fixture + reset seams**

```javascript
// lib/e2e/adminScoreboardSeason.js
const PLAYWRIGHT_IMPORT_FIXTURES = {
  "kickoff-event": {
    event: {
      name: "Kickoff Event",
      slug: "kickoff-event",
      date: "2026-04-01",
      isMajor: false,
    },
    participants: [
      { playerName: "Alex Ace", externalPlayerId: "u-alex", finishPlace: 1 },
      { playerName: "Blair Birdie", externalPlayerId: "u-blair", finishPlace: 2 },
      { playerName: "Casey Chain", externalPlayerId: "u-casey", finishPlace: 3 },
      { playerName: "Drew Disc", externalPlayerId: "u-drew", finishPlace: 4 },
      { playerName: "Evan Eagle", externalPlayerId: "u-evan", finishPlace: 5 },
      { playerName: "Flynn Fade", externalPlayerId: "u-flynn", finishPlace: 6 },
      { playerName: "Gray Glide", externalPlayerId: "u-gray", finishPlace: 7 },
      { playerName: "Harper Hyzer", externalPlayerId: "u-harper", finishPlace: 8 },
      { playerName: "Indy Iron", externalPlayerId: "u-indy", finishPlace: 9 },
      { playerName: "Jules Jam", externalPlayerId: "u-jules", finishPlace: 10 },
    ],
  },
  "event-two": {
    event: { name: "Event Two", slug: "event-two", date: "2026-04-08", isMajor: false },
    participants: [
      { playerName: "Harper Hyzer", externalPlayerId: "u-harper", finishPlace: 1 },
      { playerName: "Kai Kick", externalPlayerId: "u-kai", finishPlace: 2 },
      { playerName: "Alex Ace", externalPlayerId: "u-alex", finishPlace: 3 },
      { playerName: "Blair Birdie", externalPlayerId: "u-blair", finishPlace: 4 },
      { playerName: "Lane Loft", externalPlayerId: "u-lane", finishPlace: 5 },
      { playerName: "Casey Chain", externalPlayerId: "u-casey", finishPlace: 6 },
      { playerName: "Drew Disc", externalPlayerId: "u-drew", finishPlace: 7 },
      { playerName: "Evan Eagle", externalPlayerId: "u-evan", finishPlace: 8 },
      { playerName: "Flynn Fade", externalPlayerId: "u-flynn", finishPlace: 9 },
      { playerName: "Gray Glide", externalPlayerId: "u-gray", finishPlace: 10 },
    ],
  },
};

module.exports = {
  PLAYWRIGHT_IMPORT_FIXTURES,
};
```

```javascript
// lib/e2e/testMode.js
const { PLAYWRIGHT_IMPORT_FIXTURES } = require("./adminScoreboardSeason.js");

function isPlaywrightTestMode() {
  return process.env.PLAYWRIGHT_TEST_MODE === "1";
}

function resolveFixtureSlugFromUrl(leaderboardUrl) {
  const parsed = new URL(String(leaderboardUrl || ""));
  const match = parsed.pathname.match(/^\/events\/([^/]+)\/leaderboard\/?$/);
  return match ? match[1] : null;
}

function resolvePlaywrightFixtureEventFromUrl(leaderboardUrl) {
  if (!isPlaywrightTestMode()) {
    return null;
  }

  const slug = resolveFixtureSlugFromUrl(leaderboardUrl);
  const fixture = slug ? PLAYWRIGHT_IMPORT_FIXTURES[slug] : null;
  if (!fixture) {
    return null;
  }

  return {
    name: fixture.event.name,
    date: fixture.event.date,
    slug: fixture.event.slug,
    isMajor: fixture.event.isMajor,
    participants: fixture.participants.map((participant) => ({ ...participant })),
  };
}

function assertPlaywrightTestSecret(request) {
  const expected = process.env.PLAYWRIGHT_TEST_SECRET;
  const actual = request.headers.get("x-playwright-test-secret");

  if (!isPlaywrightTestMode() || !expected || actual !== expected) {
    const error = new Error("Forbidden");
    error.status = 403;
    throw error;
  }
}

module.exports = {
  assertPlaywrightTestSecret,
  isPlaywrightTestMode,
  resolvePlaywrightFixtureEventFromUrl,
};
```

```javascript
// app/api/test/reset/route.js
import { NextResponse } from "next/server";
import eventsData from "../../../../lib/eventsData.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";
import testMode from "../../../../lib/e2e/testMode.js";

const { resetEventsData } = eventsData;
const { resetEventDraftStore } = eventDraftStore;
const { assertPlaywrightTestSecret } = testMode;

export async function POST(request) {
  try {
    assertPlaywrightTestSecret(request);
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: error.status || 403 });
  }

  resetEventsData({
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  resetEventDraftStore();

  return NextResponse.json({ ok: true });
}
```

```javascript
// lib/udiscClient.js
const { resolvePlaywrightFixtureEventFromUrl } = require("./e2e/testMode");

async function fetchUdiscEventFromUrl({ leaderboardUrl, fetchImpl = fetch }) {
  const validatedUrl = parseAndValidateLeaderboardUrl(leaderboardUrl);
  const fixture = resolvePlaywrightFixtureEventFromUrl(validatedUrl);
  if (fixture) {
    return fixture;
  }

  const requestOptions = {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "User-Agent": "Mozilla/5.0",
    },
  };

  try {
    const response = await fetchImpl(validatedUrl, requestOptions);

    if (response.ok) {
      return parseUdiscEventPayloadOrThrow(await response.text());
    }

    if (response.status === 404) throw createUdiscError("NOT_FOUND");
    if (response.status === 429) throw createUdiscError("RATE_LIMITED");
    throw createUdiscError("UPSTREAM_ERROR");
  } catch (error) {
    if (KNOWN_UDISC_ERROR_TYPES.has(error?.type)) {
      throw error;
    }

    throw createUdiscError("NETWORK_ERROR");
  }
}
```

```javascript
// playwright.config.js
module.exports = defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      ...process.env,
      ADMIN_SHARED_SECRET: process.env.ADMIN_SHARED_SECRET || "playwright-admin-secret",
      PLAYWRIGHT_TEST_MODE: "1",
      PLAYWRIGHT_TEST_SECRET: "playwright-secret",
    },
  },
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
});
```

- [ ] **Step 4: Run tests to verify the seam passes**

Run: `npm test -- tests/playwrightTestMode.test.js tests/playwrightResetRoute.test.js tests/udiscClient.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/e2e/adminScoreboardSeason.js lib/e2e/testMode.js app/api/test/reset/route.js lib/udiscClient.js tests/playwrightTestMode.test.js tests/playwrightResetRoute.test.js tests/udiscClient.test.js playwright.config.js
git commit -m "test: add deterministic Playwright app seams"
```

### Task 2: Add stable browser selectors for admin and public scoreboards

**Files:**
- Modify: `app/admin/events/new/page.js`
- Modify: `app/page.js`
- Modify: `app/events/[slug]/page.js`
- Modify: `tests/adminNewEventPage.phase6.test.js`
- Modify: `tests/homePageRanking.test.js`
- Create: `tests/eventScoreboardPage.test.js`

- [ ] **Step 1: Write failing selector markup tests**

```javascript
test("renderUdiscPreviewSection exposes participant review test ids", async () => {
  const { renderUdiscPreviewSection } = await import("../app/admin/events/new/page.js");
  const { renderToStaticMarkup } = require("react-dom/server");

  const html = renderToStaticMarkup(
    renderUdiscPreviewSection({
      preview: {
        event: { name: "Event Two", slug: "event-two", date: "2026-04-08" },
        participants: [
          {
            playerName: "Alex Ace",
            finishPlace: 3,
            matchStatus: "matched",
            matchedPlayerName: "Alex Ace",
            startingTag: 1,
          },
          {
            playerName: "Kai Kick",
            finishPlace: 2,
            matchStatus: "unmatched",
          },
        ],
      },
      previewValid: true,
      action: async () => {},
      confirmAction: async () => {},
    })
  );

  assert.match(html, /data-testid="participant-row-0"/);
  assert.match(html, /data-testid="participant-match-status-0">matched</);
  assert.match(html, /data-testid="participant-match-status-1">new</);
  assert.match(html, /data-testid="confirm-import-form"/);
});

test("HomePage renders leaderboard row and cell test ids", async () => {
  const { default: HomePage } = await import("../app/page.js");
  const html = renderToStaticMarkup(
    HomePage({
      loadRows: () => [
        { playerId: "player_0001", playerName: "Alex Ace", eventsPlayed: 4, seasonPoints: 65 },
      ],
    })
  );

  assert.match(html, /data-testid="leaderboard-row-player_0001"/);
  assert.match(html, /data-testid="leaderboard-rank-player_0001">1</);
  assert.match(html, /data-testid="leaderboard-points-player_0001">65</);
});

test("EventScoreboardPage renders scoreboard row and total test ids", async () => {
  const { default: EventScoreboardPage } = await import("../app/events/[slug]/page.js");
  const html = renderToStaticMarkup(
    EventScoreboardPage({
      params: { slug: "kickoff-event" },
      loadEvent: () => ({
        name: "Kickoff Event",
        scoreboard: [
          {
            playerId: "player_0001",
            playerName: "Alex Ace",
            startingTag: null,
            attendance: 2,
            eventResult: 1,
            placement: 8,
            startingTagBonus: 0,
            tagOneBonus: 0,
            beatYourTagBonus: 0,
            eventTotal: 10,
          },
        ],
      }),
    })
  );

  assert.match(html, /data-testid="event-score-row-player_0001"/);
  assert.match(html, /data-testid="event-score-total-player_0001">10</);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js tests/homePageRanking.test.js tests/eventScoreboardPage.test.js`
Expected: FAIL because the new `data-testid` markers are not present in the rendered HTML.

- [ ] **Step 3: Add the minimal selector hooks**

```javascript
// app/admin/events/new/page.js inside renderUdiscPreviewSection participantRows map
return createElement(
  "div",
  {
    key: `${participant.externalPlayerId || participant.playerName || index}`,
    "data-testid": `participant-row-${index}`,
  },
  createElement("p", { "data-testid": `participant-name-${index}` }, participant.playerName),
  createElement("p", { "data-testid": `participant-finish-${index}` }, `Finish place: ${participant.finishPlace}`),
  createElement(
    "p",
    { "data-testid": `participant-match-status-${index}` },
    participant.matchStatus === "matched" ? "matched" : participant.matchStatus === "unmatched" ? "new" : "ambiguous"
  ),
  participant.matchStatus === "matched"
    ? createElement("input", {
        id: startingTagField,
        name: startingTagField,
        type: "number",
        min: 1,
        required: true,
        defaultValue: participant.startingTag,
        "data-testid": `participant-starting-tag-${index}`,
      })
    : null
);
```

```javascript
// app/admin/events/new/page.js inside preview-valid confirm form
createElement(
  "form",
  {
    action: confirmAction,
    "data-testid": "confirm-import-form",
  },
  createElement("input", {
    type: "hidden",
    name: "previewPayload",
    value: JSON.stringify(preview),
  }),
  createElement("label", { htmlFor: "confirm_slug" }, "Slug"),
  createElement("input", {
    id: "confirm_slug",
    name: "slug",
    type: "text",
    required: true,
    defaultValue: preview.event?.slug || "",
  }),
  createElement("p", null, "This import is ready to confirm."),
  createElement("button", { type: "submit" }, "Confirm Import")
)
```

```javascript
// app/page.js
function renderLeaderboardRow(row, rank) {
  return createElement(
    "tr",
    { key: row.playerId, "data-testid": `leaderboard-row-${row.playerId}` },
    createElement("td", { "data-testid": `leaderboard-rank-${row.playerId}` }, rank),
    createElement("td", { "data-testid": `leaderboard-player-${row.playerId}` }, row.playerName),
    createElement("td", { "data-testid": `leaderboard-events-${row.playerId}` }, row.eventsPlayed),
    createElement("td", { "data-testid": `leaderboard-points-${row.playerId}` }, row.seasonPoints)
  );
}
```

```javascript
// app/events/[slug]/page.js
function renderScoreRow(row) {
  return createElement(
    "tr",
    { key: row.playerId, "data-testid": `event-score-row-${row.playerId}` },
    createElement("td", { "data-testid": `event-score-player-${row.playerId}` }, row.playerName),
    createElement("td", { "data-testid": `event-score-starting-tag-${row.playerId}` }, row.startingTag ?? ""),
    createElement("td", { "data-testid": `event-score-attendance-${row.playerId}` }, row.attendance),
    createElement("td", { "data-testid": `event-score-result-${row.playerId}` }, row.eventResult ?? ""),
    createElement("td", { "data-testid": `event-score-placement-${row.playerId}` }, row.placement),
    createElement("td", { "data-testid": `event-score-starting-bonus-${row.playerId}` }, row.startingTagBonus),
    createElement("td", { "data-testid": `event-score-tag-one-${row.playerId}` }, row.tagOneBonus),
    createElement("td", { "data-testid": `event-score-beat-tag-${row.playerId}` }, row.beatYourTagBonus),
    createElement("td", { "data-testid": `event-score-total-${row.playerId}` }, row.eventTotal)
  );
}
```

- [ ] **Step 4: Run tests to verify the selectors pass**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js tests/homePageRanking.test.js tests/eventScoreboardPage.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/new/page.js app/page.js app/events/[slug]/page.js tests/adminNewEventPage.phase6.test.js tests/homePageRanking.test.js tests/eventScoreboardPage.test.js
git commit -m "test: add stable selectors for browser scoreboard coverage"
```

### Task 3: Add Playwright helpers and the admin login smoke spec

**Files:**
- Create: `e2e/helpers/adminScoreboard.js`
- Create: `e2e/admin-login.spec.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing Playwright login spec**

```javascript
const { test, expect } = require("@playwright/test");
const { resetApplicationState, loginAsAdmin } = require("./helpers/adminScoreboard.js");

test.beforeEach(async ({ request }) => {
  await resetApplicationState(request);
});

test("admin can sign in and reach the event import page", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page).toHaveURL(/\/admin\/events\/new$/);
  await expect(page.getByRole("heading", { name: "Create Event Draft" })).toBeVisible();
  await expect(page.getByLabel("UDisc Leaderboard URL")).toBeVisible();
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `npx playwright test e2e/admin-login.spec.js --project=chromium`
Expected: FAIL because `e2e/helpers/adminScoreboard.js` does not exist yet.

- [ ] **Step 3: Add the Playwright helper layer**

```javascript
// e2e/helpers/adminScoreboard.js
const { expect } = require("@playwright/test");

const PLAYWRIGHT_TEST_SECRET = "playwright-secret";
const ADMIN_SHARED_SECRET = "playwright-admin-secret";

async function resetApplicationState(request) {
  const response = await request.post("/api/test/reset", {
    headers: {
      "x-playwright-test-secret": PLAYWRIGHT_TEST_SECRET,
    },
    data: {},
  });

  expect(response.ok()).toBe(true);
}

async function loginAsAdmin(page) {
  await page.goto("/admin/login");
  await page.getByLabel("Shared secret").fill(ADMIN_SHARED_SECRET);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/events\/new$/);
}

module.exports = {
  ADMIN_SHARED_SECRET,
  PLAYWRIGHT_TEST_SECRET,
  loginAsAdmin,
  resetApplicationState,
};
```

```json
// package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

- [ ] **Step 4: Run the login spec to verify it passes**

Run: `npx playwright test e2e/admin-login.spec.js --project=chromium`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/helpers/adminScoreboard.js e2e/admin-login.spec.js package.json
git commit -m "test: add Playwright admin login smoke coverage"
```

### Task 4: Add the multi-event season import + public scoreboard specs

**Files:**
- Modify: `lib/e2e/adminScoreboardSeason.js`
- Create: `e2e/admin-season-scoreboards.spec.js`
- Modify: `README.md`

- [ ] **Step 1: Write the failing season E2E spec using explicit expected rows**

```javascript
const { test, expect } = require("@playwright/test");
const {
  resetApplicationState,
  loginAsAdmin,
  importFixtureEvent,
  reviewMatchedPlayers,
  assertEventScoreboardRow,
  assertLeaderboardRow,
} = require("./helpers/adminScoreboard.js");
const { seasonFixture } = require("../lib/e2e/adminScoreboardSeason.js");

test.beforeEach(async ({ request }) => {
  await resetApplicationState(request);
});

test("admin can import a four-event season and see correct public scoreboards", async ({ page }) => {
  await loginAsAdmin(page);

  await importFixtureEvent(page, seasonFixture.events[0]);
  await page.getByRole("button", { name: "Review Imported Players" }).click();
  await page.getByRole("button", { name: "Confirm Import" }).click();

  await page.goto("/events/kickoff-event");
  await assertEventScoreboardRow(page, "Alex Ace", {
    startingTag: "",
    attendance: "2",
    eventResult: "1",
    placement: "8",
    startingTagBonus: "0",
    tagOneBonus: "0",
    beatYourTagBonus: "0",
    eventTotal: "10",
  });

  await page.goto("/admin/events/new");
  await importFixtureEvent(page, seasonFixture.events[1]);
  await reviewMatchedPlayers(page, seasonFixture.events[1]);
  await page.getByRole("button", { name: "Review Imported Players" }).click();
  await page.getByRole("button", { name: "Confirm Import" }).click();

  await page.goto("/admin/events/new");
  await importFixtureEvent(page, seasonFixture.events[2]);
  await reviewMatchedPlayers(page, seasonFixture.events[2]);
  await page.getByRole("button", { name: "Review Imported Players" }).click();
  await page.getByRole("button", { name: "Confirm Import" }).click();

  await page.goto("/admin/events/new");
  await importFixtureEvent(page, seasonFixture.events[3]);
  await reviewMatchedPlayers(page, seasonFixture.events[3]);
  await page.getByRole("button", { name: "Review Imported Players" }).click();
  await page.getByRole("button", { name: "Confirm Import" }).click();

  await page.goto("/events/season-major");
  await assertEventScoreboardRow(page, "Casey Chain", {
    startingTag: "7",
    attendance: "2",
    eventResult: "1",
    placement: "8",
    startingTagBonus: "3",
    tagOneBonus: "0",
    beatYourTagBonus: "3",
    eventTotal: "32",
  });
  await assertEventScoreboardRow(page, "Alex Ace", {
    startingTag: "1",
    attendance: "2",
    eventResult: "4",
    placement: "4",
    startingTagBonus: "6",
    tagOneBonus: "2",
    beatYourTagBonus: "0",
    eventTotal: "28",
  });
  await assertEventScoreboardRow(page, "Nova Net", {
    startingTag: "10",
    attendance: "2",
    eventResult: "3",
    placement: "5",
    startingTagBonus: "0",
    tagOneBonus: "0",
    beatYourTagBonus: "3",
    eventTotal: "20",
  });

  await page.goto("/");
  await expect(page.getByTestId(/^leaderboard-row-/)).toHaveCount(15);
  await assertLeaderboardRow(page, "Alex Ace", { rank: "1", eventsPlayed: "4", seasonPoints: "65" });
  await assertLeaderboardRow(page, "Casey Chain", { rank: "2", eventsPlayed: "4", seasonPoints: "54" });
  await assertLeaderboardRow(page, "Harper Hyzer", { rank: "3", eventsPlayed: "4", seasonPoints: "41" });
  await assertLeaderboardRow(page, "Indy Iron", { rank: "7", eventsPlayed: "3", seasonPoints: "28" });
  await assertLeaderboardRow(page, "Nova Net", { rank: "7", eventsPlayed: "2", seasonPoints: "28" });
});
```

- [ ] **Step 2: Run the season spec to verify it fails**

Run: `npx playwright test e2e/admin-season-scoreboards.spec.js --project=chromium`
Expected: FAIL because the season fixture helpers and assertions do not exist yet.

- [ ] **Step 3: Implement fixture helpers and the full season scenario**

```javascript
// lib/e2e/adminScoreboardSeason.js
const seasonFixture = {
  events: [
    {
      importUrl: "https://udisc.com/events/kickoff-event/leaderboard",
      slug: "kickoff-event",
      matchedStartingTags: {},
    },
    {
      importUrl: "https://udisc.com/events/event-two/leaderboard",
      slug: "event-two",
      matchedStartingTags: {
        "Alex Ace": 1,
        "Blair Birdie": 2,
        "Casey Chain": 3,
        "Drew Disc": 4,
        "Evan Eagle": 5,
        "Flynn Fade": 6,
        "Gray Glide": 7,
        "Harper Hyzer": 8,
      },
    },
    {
      importUrl: "https://udisc.com/events/event-three/leaderboard",
      slug: "event-three",
      matchedStartingTags: {
        "Alex Ace": 1,
        "Harper Hyzer": 2,
        "Casey Chain": 3,
        "Evan Eagle": 4,
        "Gray Glide": 5,
        "Indy Iron": 9,
        "Jules Jam": 10,
      },
    },
    {
      importUrl: "https://udisc.com/events/season-major/leaderboard",
      slug: "season-major",
      matchedStartingTags: {
        "Alex Ace": 1,
        "Harper Hyzer": 2,
        "Jules Jam": 3,
        "Blair Birdie": 4,
        "Indy Iron": 5,
        "Kai Kick": 6,
        "Casey Chain": 7,
        "Lane Loft": 8,
        "Milo Mesh": 9,
        "Nova Net": 10,
      },
    },
  ],
};

module.exports = {
  PLAYWRIGHT_IMPORT_FIXTURES,
  seasonFixture,
};
```

```javascript
// e2e/helpers/adminScoreboard.js
async function importFixtureEvent(page, fixture) {
  await page.getByLabel("UDisc Leaderboard URL").fill(fixture.importUrl);
  await page.getByRole("button", { name: "Fetch UDisc Preview" }).click();
  await expect(page.getByRole("heading", { name: "Preview Event" })).toBeVisible();
}

async function reviewMatchedPlayers(page, fixture) {
  for (const [playerName, startingTag] of Object.entries(fixture.matchedStartingTags)) {
    const nameCell = page.getByText(playerName, { exact: true });
    const row = nameCell.locator("xpath=ancestor::*[@data-testid][1]");
    await row.getByRole("spinbutton").fill(String(startingTag));
  }
}

async function assertEventScoreboardRow(page, playerName, expected) {
  const row = page.getByRole("row").filter({ has: page.getByText(playerName, { exact: true }) });
  await expect(row).toContainText(playerName);
  await expect(row).toContainText(expected.startingTag);
  await expect(row).toContainText(expected.attendance);
  await expect(row).toContainText(expected.eventResult);
  await expect(row).toContainText(expected.placement);
  await expect(row).toContainText(expected.startingTagBonus);
  await expect(row).toContainText(expected.tagOneBonus);
  await expect(row).toContainText(expected.beatYourTagBonus);
  await expect(row).toContainText(expected.eventTotal);
}

async function assertLeaderboardRow(page, playerName, expected) {
  const row = page.getByRole("row").filter({ has: page.getByText(playerName, { exact: true }) });
  await expect(row).toContainText(expected.rank);
  await expect(row).toContainText(expected.eventsPlayed);
  await expect(row).toContainText(expected.seasonPoints);
}

module.exports = {
  ADMIN_SHARED_SECRET,
  PLAYWRIGHT_TEST_SECRET,
  assertEventScoreboardRow,
  assertLeaderboardRow,
  importFixtureEvent,
  loginAsAdmin,
  reviewMatchedPlayers,
  resetApplicationState,
};
```

```markdown
## Playwright E2E season suite

- `npm run test:e2e` now runs real browser specs in `e2e/`.
- The admin scoreboard suite uses test-only app seams enabled by Playwright's managed server environment.
- Those seams are only for local/browser automation and are not part of the normal dev workflow.
```

- [ ] **Step 4: Run the full verification set**

Run: `npm test && npm run test:e2e`
Expected: PASS for the existing Node test suite and the new Chromium Playwright suite.

- [ ] **Step 5: Commit**

```bash
git add lib/e2e/adminScoreboardSeason.js e2e/helpers/adminScoreboard.js e2e/admin-season-scoreboards.spec.js README.md
git commit -m "test: add admin scoreboard Playwright season coverage"
```
