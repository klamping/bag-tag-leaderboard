# Season Leaderboard Image Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a Facebook-ready `1080x1350` season leaderboard PNG during the site build and write it into `dist`.

**Architecture:** Keep `buildPublicModel()` as the season standings source of truth, derive a small export-only view model from `publicModel.homepage`, render that view model through a dedicated Eleventy page, and capture that page with a headless browser after Eleventy finishes writing HTML/CSS. Keep the homepage untouched apart from shared data reuse, and fail the build clearly if the export cannot be produced or does not fit the fixed portrait bounds.

**Tech Stack:** Node.js built-in test runner, Eleventy/Nunjucks templates, existing site CSS, Node `fs/promises` + `url`, Playwright for headless Chromium capture.

---

## File Map

- Create: `lib/domain/buildSeasonLeaderboardImageModel.js`
  - Derive the export-only view model from `publicModel.homepage`.
- Create: `lib/cli/captureSeasonLeaderboardImage.js`
  - Load the generated export page in a headless browser, validate fit, and write the PNG.
- Modify: `lib/cli/siteBuildCommand.js`
  - Build the export model, inject it into Eleventy global data, and run PNG capture after `eleventy.write()`.
- Create: `site/season-leaderboard-image.njk`
  - Render the export-only portrait page used for screenshot capture.
- Modify: `site/styles/site.css`
  - Add dedicated styles for the portrait export layout and fixed-size capture root.
- Create: `tests/seasonLeaderboardImageModel.test.js`
  - Unit-test the export view-model shaping in isolation.
- Create: `tests/captureSeasonLeaderboardImage.test.js`
  - Unit-test browser capture orchestration and overflow failure without launching a real browser.
- Modify: `tests/siteBuildCommand.test.js`
  - Cover export page generation, PNG integration, skip-on-empty behavior, and build failure when capture throws.
- Modify: `package.json`
  - Add the browser dependency.
- Modify: `package-lock.json`
  - Record the installed browser dependency.

### Task 1: Export View Model

**Files:**
- Create: `tests/seasonLeaderboardImageModel.test.js`
- Create: `lib/domain/buildSeasonLeaderboardImageModel.js`

- [ ] **Step 1: Write the failing export-model tests**

Create `tests/seasonLeaderboardImageModel.test.js` with this content:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPublicModel } = require("../lib/domain/buildPublicModel");
const { buildSeasonLeaderboardImageModel } = require("../lib/domain/buildSeasonLeaderboardImageModel");

function createStore() {
  return {
    players: {
      schemaVersion: 1,
      items: [
        {
          id: "player_0001",
          name: "Alice Smith",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "player_0002",
          name: "Bob Jones",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
    events: {
      schemaVersion: 1,
      items: [
        {
          id: "event_0001",
          slug: "spring-showdown",
          name: "Spring Showdown",
          eventDate: "2026-04-12",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown",
          importPath: "data/imports/spring-showdown.json",
          resultIds: ["result_0001", "result_0002"],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
    results: {
      schemaVersion: 1,
      items: [
        {
          id: "result_0001",
          eventId: "event_0001",
          playerId: "player_0001",
          finishPlace: 1,
          startingTag: 2,
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
          id: "result_0002",
          eventId: "event_0001",
          playerId: "player_0002",
          finishPlace: null,
          startingTag: 1,
          attendancePoints: 2,
          placementPoints: 0,
          startingTagBonusPoints: 1,
          tagOneBonusPoints: 2,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 5,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
  };
}

test("buildSeasonLeaderboardImageModel derives a portrait export model from homepage leaderboard data", () => {
  const publicModel = buildPublicModel(createStore());

  assert.deepEqual(buildSeasonLeaderboardImageModel(publicModel), {
    title: "Bag Tag Leaderboard",
    subtitle: "Season Leaderboard",
    seasonLabel: "2026 Season",
    filename: "season-leaderboard.png",
    width: 1080,
    height: 1350,
    eventHeaders: [
      {
        eventSlug: "spring-showdown",
        shortDate: "4/12",
      },
    ],
    rows: [
      {
        rank: 1,
        playerName: "Alice Smith",
        seasonPoints: 10,
        eventOverview: [
          {
            eventSlug: "spring-showdown",
            points: 10,
            played: true,
          },
        ],
      },
      {
        rank: 2,
        playerName: "Bob Jones",
        seasonPoints: 2,
        eventOverview: [
          {
            eventSlug: "spring-showdown",
            points: 2,
            played: true,
          },
        ],
      },
    ],
  });
});

test("buildSeasonLeaderboardImageModel returns null when no leaderboard rows exist", () => {
  const publicModel = {
    homepage: {
      leaderboardRows: [],
      leaderboardEvents: [],
    },
  };

  assert.equal(buildSeasonLeaderboardImageModel(publicModel), null);
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- tests/seasonLeaderboardImageModel.test.js`

Expected: FAIL with `Cannot find module '../lib/domain/buildSeasonLeaderboardImageModel'`.

- [ ] **Step 3: Write the minimal export-model implementation**

Create `lib/domain/buildSeasonLeaderboardImageModel.js` with this content:

```js
function inferSeasonLabel(leaderboardEvents) {
  if (!leaderboardEvents.length) {
    return "Season";
  }

  return `${String(leaderboardEvents[0].eventDate).slice(0, 4)} Season`;
}

function buildSeasonLeaderboardImageModel(publicModel) {
  const leaderboardRows = publicModel?.homepage?.leaderboardRows || [];
  const leaderboardEvents = publicModel?.homepage?.leaderboardEvents || [];

  if (!leaderboardRows.length) {
    return null;
  }

  return {
    title: publicModel.siteTitle || "Bag Tag Leaderboard",
    subtitle: "Season Leaderboard",
    seasonLabel: inferSeasonLabel(leaderboardEvents),
    filename: "season-leaderboard.png",
    width: 1080,
    height: 1350,
    eventHeaders: leaderboardEvents.map((event) => ({
      eventSlug: event.slug,
      shortDate: event.shortDate,
    })),
    rows: leaderboardRows.map((row, index) => ({
      rank: index + 1,
      playerName: row.playerName,
      seasonPoints: row.seasonPoints,
      eventOverview: row.eventOverview.map((event) => ({
        eventSlug: event.eventSlug,
        points: event.points,
        played: event.played,
      })),
    })),
  };
}

module.exports = {
  buildSeasonLeaderboardImageModel,
};
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- tests/seasonLeaderboardImageModel.test.js`

Expected: PASS for both export-model tests.

- [ ] **Step 5: Commit**

```bash
git add tests/seasonLeaderboardImageModel.test.js lib/domain/buildSeasonLeaderboardImageModel.js
git commit -m "feat: add leaderboard image export model"
```

### Task 2: Export HTML Page And Styling

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Create: `site/season-leaderboard-image.njk`
- Modify: `site/styles/site.css`
- Modify: `lib/cli/siteBuildCommand.js`

- [ ] **Step 1: Write the failing export-page build assertions**

In `tests/siteBuildCommand.test.js`, inside `test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => { ... })`, read the export page after the existing stylesheet read:

```js
  const seasonLeaderboardImagePage = await fs.readFile(
    path.join(tempDirectory, "dist", "season-leaderboard-image", "index.html"),
    "utf8"
  );
```

Then add these assertions before the stylesheet assertions:

```js
  assert.match(seasonLeaderboardImagePage, /<title>Season Leaderboard Export \| Bag Tag Leaderboard<\/title>/i);
  assert.match(seasonLeaderboardImagePage, /id="season-leaderboard-image"/i);
  assert.match(seasonLeaderboardImagePage, />Season Leaderboard</i);
  assert.match(seasonLeaderboardImagePage, />2026 Season</i);
  assert.match(seasonLeaderboardImagePage, />Alice Smith</i);
  assert.match(seasonLeaderboardImagePage, />Bob Jones</i);
  assert.match(seasonLeaderboardImagePage, />10<\/span>\s*<span[^>]*>pts</i);
  assert.match(seasonLeaderboardImagePage, />4\/12</i);
```

Add these stylesheet assertions near the other CSS checks:

```js
  assert.match(stylesheet, /#season-leaderboard-image\s*\{/i);
  assert.match(stylesheet, /\.season-leaderboard-image-table\s*\{/i);
  assert.match(stylesheet, /\.season-leaderboard-image-rank\s*\{/i);
```

- [ ] **Step 2: Run the focused build test to verify it fails**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: FAIL with `ENOENT` for `dist/season-leaderboard-image/index.html`.

- [ ] **Step 3: Inject the export model into the Eleventy global data**

At the top of `lib/cli/siteBuildCommand.js`, add the import:

```js
const { buildSeasonLeaderboardImageModel } = require("../domain/buildSeasonLeaderboardImageModel");
```

Then inside `siteBuildCommand(options = {})`, replace the current public-model creation block:

```js
    const publicModel = createPublicModel(store);
```

with:

```js
    const publicModel = createPublicModel(store);
    const seasonLeaderboardImage = buildSeasonLeaderboardImageModel(publicModel);
    const siteData = {
      ...publicModel,
      seasonLeaderboardImage,
    };
```

And update the Eleventy global-data injection block to use `siteData`:

```js
      config: (eleventyConfig) => {
        eleventyConfig.addGlobalData("publicModel", siteData);
      },
```

Finally, update the success return value so the calling tests can inspect the enriched model if needed later:

```js
      publicModel: siteData,
```

- [ ] **Step 4: Add the export page template**

Create `site/season-leaderboard-image.njk` with this content:

```njk
---
layout: layout.njk
pageTitle: Season Leaderboard Export | Bag Tag Leaderboard
permalink: "season-leaderboard-image/index.html"
---
{% set exportModel = publicModel.seasonLeaderboardImage %}
{% if exportModel %}
  <section id="season-leaderboard-image" class="season-leaderboard-image panel stack">
    <header class="season-leaderboard-image-header stack-tight">
      <p class="eyebrow">{{ exportModel.seasonLabel }}</p>
      <h1>{{ exportModel.subtitle }}</h1>
      <p class="season-leaderboard-image-title">{{ exportModel.title }}</p>
    </header>

    <table class="season-leaderboard-image-table">
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Player</th>
          <th scope="col">Total</th>
          {% for event in exportModel.eventHeaders %}
            <th scope="col">{{ event.shortDate }}</th>
          {% endfor %}
        </tr>
      </thead>
      <tbody>
        {% for row in exportModel.rows %}
          <tr>
            <td class="season-leaderboard-image-rank">{{ row.rank }}</td>
            <th scope="row">{{ row.playerName }}</th>
            <td class="season-leaderboard-image-total">
              <span>{{ row.seasonPoints }}</span>
              <span>pts</span>
            </td>
            {% for event in row.eventOverview %}
              <td>{% if event.played %}{{ event.points }}{% endif %}</td>
            {% endfor %}
          </tr>
        {% endfor %}
      </tbody>
    </table>

    <footer class="season-leaderboard-image-footer">
      <p>Rochester, MN Bag Tag</p>
    </footer>
  </section>
{% endif %}
```

- [ ] **Step 5: Add the export-specific CSS**

Append this block near the leaderboard styles in `site/styles/site.css`:

```css
#season-leaderboard-image {
  width: 1080px;
  min-height: 1350px;
  margin: 0 auto;
  padding: 48px;
  border-radius: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(255, 250, 242, 0.98) 100%),
    linear-gradient(180deg, #ffe6b8 0%, var(--color-sand) 44%, #f7d39c 100%);
  box-shadow: none;
}

.season-leaderboard-image-header {
  padding-bottom: 1rem;
  border-bottom: 2px dashed rgba(18, 48, 74, 0.22);
}

.season-leaderboard-image-title {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 1rem;
  font-weight: 700;
}

.season-leaderboard-image-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.season-leaderboard-image-table th,
.season-leaderboard-image-table td {
  padding: 0.45rem 0.35rem;
  border-bottom: 1px solid var(--color-line);
  text-align: center;
  white-space: nowrap;
}

.season-leaderboard-image-table th:nth-child(2),
.season-leaderboard-image-table td:nth-child(2) {
  text-align: left;
}

.season-leaderboard-image-rank {
  font-weight: 700;
}

.season-leaderboard-image-total {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.season-leaderboard-image-total > span:last-child {
  margin-left: 0.25rem;
  color: var(--color-ink-soft);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.season-leaderboard-image-footer {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 2px dashed rgba(18, 48, 74, 0.22);
  color: var(--color-ink-soft);
  font-size: 0.85rem;
  font-weight: 700;
}
```

- [ ] **Step 6: Run the focused build test to verify it passes**

Run: `npm test -- --test-name-pattern="siteBuildCommand builds homepage, event page, and stylesheet"`

Expected: PASS with the new export-page and stylesheet assertions green.

- [ ] **Step 7: Commit**

```bash
git add lib/cli/siteBuildCommand.js site/season-leaderboard-image.njk site/styles/site.css tests/siteBuildCommand.test.js
git commit -m "feat: render leaderboard image export page"
```

### Task 3: Browser Capture Helper

**Files:**
- Create: `tests/captureSeasonLeaderboardImage.test.js`
- Create: `lib/cli/captureSeasonLeaderboardImage.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing capture-helper tests**

Create `tests/captureSeasonLeaderboardImage.test.js` with this content:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { captureSeasonLeaderboardImage } = require("../lib/cli/captureSeasonLeaderboardImage");

test("captureSeasonLeaderboardImage screenshots the export root to the requested output path", async () => {
  const calls = [];
  const fakeLocator = {
    async boundingBox() {
      return { x: 0, y: 0, width: 1080, height: 1336 };
    },
    async screenshot(options) {
      calls.push(["screenshot", options]);
    },
  };
  const fakePage = {
    async goto(url) {
      calls.push(["goto", url]);
    },
    locator(selector) {
      calls.push(["locator", selector]);
      return fakeLocator;
    },
  };
  const fakeBrowser = {
    async newPage(options) {
      calls.push(["newPage", options]);
      return fakePage;
    },
    async close() {
      calls.push(["close"]);
    },
  };

  await captureSeasonLeaderboardImage({
    exportPagePath: "/tmp/season-leaderboard-image/index.html",
    outputPath: "/tmp/dist/season-leaderboard.png",
    width: 1080,
    height: 1350,
    launchBrowser: async () => fakeBrowser,
  });

  assert.deepEqual(calls, [
    ["newPage", { viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 }],
    ["goto", "file:///tmp/season-leaderboard-image/index.html"],
    ["locator", "#season-leaderboard-image"],
    [
      "screenshot",
      {
        path: "/tmp/dist/season-leaderboard.png",
        type: "png",
        animations: "disabled",
      },
    ],
    ["close"],
  ]);
});

test("captureSeasonLeaderboardImage throws when the rendered export exceeds portrait bounds", async () => {
  const fakeLocator = {
    async boundingBox() {
      return { x: 0, y: 0, width: 1080, height: 1502 };
    },
    async screenshot() {
      throw new Error("screenshot should not run when overflow is detected");
    },
  };
  const fakePage = {
    async goto() {},
    locator() {
      return fakeLocator;
    },
  };
  const fakeBrowser = {
    async newPage() {
      return fakePage;
    },
    async close() {},
  };

  await assert.rejects(
    () =>
      captureSeasonLeaderboardImage({
        exportPagePath: "/tmp/season-leaderboard-image/index.html",
        outputPath: "/tmp/dist/season-leaderboard.png",
        width: 1080,
        height: 1350,
        launchBrowser: async () => fakeBrowser,
      }),
    /exceeds the supported 1080x1350 export bounds/i
  );
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- tests/captureSeasonLeaderboardImage.test.js`

Expected: FAIL with `Cannot find module '../lib/cli/captureSeasonLeaderboardImage'`.

- [ ] **Step 3: Add the browser dependency**

In `package.json`, add `playwright` under `dependencies`:

```json
  "dependencies": {
    "@11ty/eleventy": "^3.1.6",
    "he": "^1.2.0",
    "playwright": "^1.53.0"
  }
```

Then run:

`npm install`

Expected: `package-lock.json` updates to include `playwright`.

- [ ] **Step 4: Write the minimal capture helper**

Create `lib/cli/captureSeasonLeaderboardImage.js` with this content:

```js
const { pathToFileURL } = require("node:url");

async function defaultLaunchBrowser() {
  const { chromium } = require("playwright");
  return chromium.launch({ headless: true });
}

async function captureSeasonLeaderboardImage(options) {
  const {
    exportPagePath,
    outputPath,
    width,
    height,
    launchBrowser = defaultLaunchBrowser,
  } = options;
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(exportPagePath).href);

    const exportRoot = page.locator("#season-leaderboard-image");
    const box = await exportRoot.boundingBox();

    if (!box || box.width > width || box.height > height) {
      throw new Error(`Season leaderboard export exceeds the supported ${width}x${height} export bounds.`);
    }

    await exportRoot.screenshot({
      path: outputPath,
      type: "png",
      animations: "disabled",
    });
  } finally {
    await browser.close();
  }
}

module.exports = {
  captureSeasonLeaderboardImage,
};
```

- [ ] **Step 5: Run the focused tests to verify they pass**

Run: `npm test -- tests/captureSeasonLeaderboardImage.test.js`

Expected: PASS for the happy path and overflow error tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tests/captureSeasonLeaderboardImage.test.js lib/cli/captureSeasonLeaderboardImage.js
git commit -m "feat: add leaderboard image browser capture"
```

### Task 4: Build Integration And Failure Paths

**Files:**
- Modify: `tests/siteBuildCommand.test.js`
- Modify: `lib/cli/siteBuildCommand.js`

- [ ] **Step 1: Write the failing PNG integration test**

In `tests/siteBuildCommand.test.js`, add this new test after `test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => { ... })`:

```js
test("siteBuildCommand writes a season leaderboard PNG into dist", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-season-image-");
  const store = createStore();

  const captureCalls = [];
  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => store,
    captureSeasonLeaderboardImage: async (options) => {
      captureCalls.push(options);
      await fs.writeFile(options.outputPath, "fake png bytes");
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(captureCalls.length, 1);
  assert.match(captureCalls[0].exportPagePath, /dist\/season-leaderboard-image\/index\.html$/i);
  assert.match(captureCalls[0].outputPath, /dist\/season-leaderboard\.png$/i);
  assert.equal(captureCalls[0].width, 1080);
  assert.equal(captureCalls[0].height, 1350);

  const png = await fs.readFile(path.join(tempDirectory, "dist", "season-leaderboard.png"), "utf8");
  assert.equal(png, "fake png bytes");
});
```

- [ ] **Step 2: Write the failing skip-on-empty test**

Add this test near the other empty-state coverage:

```js
test("siteBuildCommand skips the season leaderboard PNG when no leaderboard rows exist", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-no-season-image-");
  const store = createStore();

  store.events.items = [];
  store.results.items = [];

  let captureCalled = false;
  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => store,
    captureSeasonLeaderboardImage: async () => {
      captureCalled = true;
    },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(captureCalled, false);
  await assert.rejects(
    () => fs.access(path.join(tempDirectory, "dist", "season-leaderboard.png")),
    /ENOENT/
  );
});
```

- [ ] **Step 3: Write the failing capture-error test**

Add this test near the existing non-zero failure coverage:

```js
test("siteBuildCommand returns non-zero when leaderboard image capture fails", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-image-failure-");
  const errors = [];

  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: (value) => errors.push(value),
    },
    loadCanonicalStore: async () => createStore(),
    captureSeasonLeaderboardImage: async () => {
      throw new Error("capture exploded");
    },
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.match(errors.join(""), /capture exploded/i);
});
```

- [ ] **Step 4: Run the focused integration tests to verify they fail**

Run: `npm test -- --test-name-pattern="season leaderboard"`

Expected: FAIL because `siteBuildCommand()` does not yet call the injected capture helper.

- [ ] **Step 5: Wire the capture helper into the build command**

At the top of `lib/cli/siteBuildCommand.js`, add:

```js
const { captureSeasonLeaderboardImage } = require("./captureSeasonLeaderboardImage");
```

Inside `siteBuildCommand(options = {})`, add the injectable dependency:

```js
  const exportSeasonLeaderboardImage =
    options.captureSeasonLeaderboardImage || captureSeasonLeaderboardImage;
```

After `await eleventy.write();`, insert this block before the success log:

```js
    if (seasonLeaderboardImage) {
      await exportSeasonLeaderboardImage({
        exportPagePath: path.join(outputDirectory, "season-leaderboard-image", "index.html"),
        outputPath: path.join(outputDirectory, seasonLeaderboardImage.filename),
        width: seasonLeaderboardImage.width,
        height: seasonLeaderboardImage.height,
      });
    } else {
      io.writeStdout("Skipped season leaderboard image export because no leaderboard rows were available.\n");
    }
```

Leave the existing top-level `try/catch` in place so thrown capture errors still produce `exitCode: 1`.

- [ ] **Step 6: Run the focused integration tests to verify they pass**

Run: `npm test -- --test-name-pattern="season leaderboard"`

Expected: PASS for the PNG write, skip, and capture-failure tests.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`

Expected: PASS for the entire repository test suite.

- [ ] **Step 8: Run a real site build**

Run: `npm run build`

Expected: build succeeds, `dist/season-leaderboard.png` exists, and `dist/season-leaderboard-image/index.html` exists as the export source page.

- [ ] **Step 9: Commit**

```bash
git add lib/cli/siteBuildCommand.js tests/siteBuildCommand.test.js
git commit -m "feat: export season leaderboard image during build"
```

## Self-Review

- Spec coverage check:
  - build-time PNG into `dist`: Task 4
  - dedicated export HTML and social layout: Task 2
  - reuse existing leaderboard ordering and totals: Task 1
  - fixed `1080x1350` portrait output: Tasks 1, 2, and 3
  - fail on overflow instead of clipping: Task 3
  - skip cleanly when there is no leaderboard: Task 4
- Placeholder scan: no `TODO`, `TBD`, or implicit “handle later” instructions remain.
- Type consistency check: `seasonLeaderboardImage`, `filename`, `width`, `height`, `exportPagePath`, and `outputPath` are used consistently across tasks.
