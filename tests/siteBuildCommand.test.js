const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { buildPublicModel } = require("../lib/domain/buildPublicModel");
const { siteBuildCommand } = require("../lib/cli/siteBuildCommand");

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

async function createTempBuildDirectory(t, prefix = "site-build-") {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  return tempDirectory;
}

function elementWithClassPattern(tagName, className) {
  const safeClassName = escapeRegexLiteral(className);

  return new RegExp(`<${tagName}\\b[^>]*class="(?=[^"]*\\b${safeClassName}\\b)[^"]*"`, "i");
}

function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function elementWithAttributeAndClassPattern(tagName, attributeName, attributeValue, className) {
  const safeAttributeName = escapeRegexLiteral(attributeName);
  const safeAttributeValue = escapeRegexLiteral(attributeValue);
  const safeClassName = escapeRegexLiteral(className);

  return new RegExp(
    `<${tagName}\\b(?=[^>]*\\b${safeAttributeName}="${safeAttributeValue}")(?=[^>]*class="(?=[^"]*\\b${safeClassName}\\b)[^"]*")[^>]*>`,
    "i"
  );
}

test("buildPublicModel returns homepage and event page models from the canonical store", () => {
  const model = buildPublicModel(createStore());

  assert.equal(model.siteTitle, "Bag Tag Leaderboard");
  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonPoints: 10,
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      eventsPlayed: 1,
      seasonPoints: 5,
    },
  ]);
  assert.deepEqual(model.homepage.events, [
    {
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
    },
  ]);
  assert.deepEqual(model.eventPages, [
    {
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      isMajor: false,
      udiscUrl: "https://udisc.com/events/spring-showdown",
      scoreboard: [
        {
          playerId: "player_0001",
          playerName: "Alice Smith",
          startingTag: null,
          eventResult: 1,
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          eventTotal: 10,
        },
        {
          playerId: "player_0002",
          playerName: "Bob Jones",
          startingTag: null,
          eventResult: null,
          attendance: 2,
          placement: 0,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          eventTotal: 2,
        },
      ],
    },
  ]);
});

test("buildPublicModel hides bootstrap-event tags and forces tag-derived display values to zero", () => {
  const store = createStore();
  store.events.items[0].eventDate = "2026-04-01";
  store.results.items[0].startingTag = 7;
  store.results.items[0].startingTagBonusPoints = 5;
  store.results.items[0].tagOneBonusPoints = 2;
  store.results.items[0].beatYourTagBonusPoints = 3;
  store.results.items[0].eventTotalPoints = 18;
  store.results.items[1].startingTag = 1;
  store.results.items[1].startingTagBonusPoints = 1;
  store.results.items[1].tagOneBonusPoints = 2;
  store.results.items[1].beatYourTagBonusPoints = 0;
  store.results.items[1].eventTotalPoints = 5;

  const model = buildPublicModel(store);

  assert.deepEqual(model.eventPages[0].scoreboard, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      startingTag: null,
      eventResult: 1,
      attendance: 2,
      placement: 8,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      eventTotal: 10,
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      startingTag: null,
      eventResult: null,
      attendance: 2,
      placement: 0,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      eventTotal: 2,
    },
  ]);
});

test("buildPublicModel decodes HTML entities in event-page player names at display time", () => {
  const store = createStore();
  store.players.items[0].name = "Alice &amp; Smith";

  const model = buildPublicModel(store);

  assert.equal(store.players.items[0].name, "Alice &amp; Smith");
  assert.equal(model.eventPages[0].scoreboard[0].playerName, "Alice & Smith");
});

test("buildPublicModel decodes HTML entities in homepage leaderboard player names at display time", () => {
  const store = createStore();
  store.players.items[0].name = "Alice &amp; Smith";

  const model = buildPublicModel(store);

  assert.equal(store.players.items[0].name, "Alice &amp; Smith");
  assert.equal(model.homepage.leaderboardRows[0].playerName, "Alice & Smith");
});

test("buildPublicModel sorts tied homepage leaderboard rows by decoded player names", () => {
  const store = createStore();
  store.players.items[0].name = "A&#122;";
  store.players.items[1].name = "Ab";
  store.results.items[1].eventTotalPoints = 10;

  const model = buildPublicModel(store);

  assert.deepEqual(
    model.homepage.leaderboardRows.map((row) => row.playerName),
    ["Ab", "Az"]
  );
});

test("buildPublicModel leaves malformed numeric HTML entities unchanged in event-page player names", () => {
  const store = createStore();
  store.players.items[0].name = "Alice &#x110000; Smith";

  const model = buildPublicModel(store);

  assert.equal(model.eventPages[0].scoreboard[0].playerName, "Alice &#x110000; Smith");
});

test("buildPublicModel leaves semicolonless malformed numeric HTML entities unchanged in event-page player names", () => {
  const store = createStore();
  store.players.items[0].name = "Alice &#x110000 Smith";

  const model = buildPublicModel(store);

  assert.equal(model.eventPages[0].scoreboard[0].playerName, "Alice &#x110000 Smith");
});

test("buildPublicModel leaves surrogate and null numeric HTML entities unchanged in event-page player names", () => {
  const store = createStore();
  store.players.items[0].name = "Alice &#55296;";
  store.players.items[1].name = "Bob &#0;";
  store.results.items[1].finishPlace = 1;

  const model = buildPublicModel(store);

  assert.deepEqual(
    model.eventPages[0].scoreboard.map((row) => row.playerName),
    ["Alice &#55296;", "Bob &#0;"]
  );
});

test("buildPublicModel preserves placeholder-like source text while restoring malformed numeric HTML entities", () => {
  const store = createStore();
  store.players.items[0].name = "Alice __MALFORMED_HTML_ENTITY_0__ &#x110000; Smith";

  const model = buildPublicModel(store);

  assert.equal(
    model.eventPages[0].scoreboard[0].playerName,
    "Alice __MALFORMED_HTML_ENTITY_0__ &#x110000; Smith"
  );
});

test("buildPublicModel sorts equal-finish event-page rows by decoded player names", () => {
  const store = createStore();
  store.players.items[0].name = "A&#122;";
  store.players.items[1].name = "Ab";
  store.results.items[1].finishPlace = 1;

  const model = buildPublicModel(store);

  assert.deepEqual(
    model.eventPages[0].scoreboard.map((row) => row.playerName),
    ["Ab", "Az"]
  );
});

test("buildPublicModel decodes mixed HTML entities only once in event-page player names", () => {
  const store = createStore();
  store.players.items[0].name = "A&amp;#122;";
  store.players.items[1].name = "&amp;lt;tag&amp;gt;";
  store.results.items[1].finishPlace = 1;

  const model = buildPublicModel(store);

  assert.deepEqual(
    model.eventPages[0].scoreboard.map((row) => row.playerName),
    ["&lt;tag&gt;", "A&#122;"]
  );
});

test("siteBuildCommand validates the canonical store and returns the public model in an isolated build directory", async (t) => {
  const stdout = [];
  const tempDirectory = await createTempBuildDirectory(t, "site-build-validate-");
  const outputDirectory = path.join(tempDirectory, "public-output");
  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    outputDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => createStore(),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.publicModel.siteTitle, "Bag Tag Leaderboard");
  assert.equal(result.publicModel.homepage.events.length, 1);
  assert.equal(result.publicModel.eventPages[0].udiscUrl, "https://udisc.com/events/spring-showdown");
  assert.match(stdout.join(""), /Built public site for 1 event page/i);

  await fs.access(path.join(outputDirectory, "index.html"));
  await fs.access(path.join(outputDirectory, "styles", "site.css"));
});

test("siteBuildCommand builds a real Eleventy site into dist with homepage and event pages", async (t) => {
  const stdout = [];
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.events.items[0].isMajor = true;

  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: (value) => stdout.push(value),
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => store,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.publicModel.siteTitle, "Bag Tag Leaderboard");
  assert.match(stdout.join(""), /Built public site for 1 event page/i);

  const homepage = await fs.readFile(path.join(tempDirectory, "dist", "index.html"), "utf8");
  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );
  const stylesheet = await fs.readFile(path.join(tempDirectory, "dist", "styles", "site.css"), "utf8");

  assert.match(homepage, /<title>Bag Tag Leaderboard<\/title>/i);
  assert.match(homepage, />Bag Tag Leaderboard</i);
  assert.match(homepage, />Leaderboard</i);
  assert.match(homepage, />Events</i);
  assert.match(homepage, /href="\/events\/spring-showdown\/"/i);
  assert.match(homepage, elementWithClassPattern("body", "site-body"));
  assert.match(homepage, elementWithClassPattern("header", "hero"));
  assert.match(homepage, elementWithClassPattern("div", "section-heading"));
  assert.match(homepage, elementWithClassPattern("li", "leaderboard-row"));
  assert.match(homepage, elementWithClassPattern("li", "event-tile"));

  assert.match(eventPage, /<title>Spring Showdown \| Bag Tag Leaderboard<\/title>/i);
  assert.match(eventPage, />Spring Showdown</i);
  assert.match(eventPage, />2026-04-12</i);
  assert.match(eventPage, />Major</i);
  assert.match(eventPage, /href="https:\/\/udisc\.com\/events\/spring-showdown"/i);
  assert.match(eventPage, />View on UDisc</i);
  assert.match(eventPage, elementWithClassPattern("article", "event-page"));
  assert.match(eventPage, elementWithClassPattern("header", "event-poster"));
  assert.match(eventPage, elementWithAttributeAndClassPattern("a", "href", "\/", "back-link"));
  assert.match(eventPage, elementWithClassPattern("div", "event-meta"));
  assert.match(
    eventPage,
    elementWithAttributeAndClassPattern(
      "a",
      "href",
      "https:\/\/udisc\.com\/events\/spring-showdown",
      "secondary-link"
    )
  );
  assert.match(eventPage, elementWithClassPattern("section", "scoreboard-panel"));
  assert.match(eventPage, />Player</i);
  assert.match(eventPage, />Start Tag</i);
  assert.match(eventPage, />Finish</i);
  assert.match(eventPage, />Attendance</i);
  assert.match(eventPage, />Placement</i);
  assert.match(eventPage, />Start Bonus</i);
  assert.match(eventPage, />Tag #1</i);
  assert.match(eventPage, />Beat Tag</i);
  assert.match(eventPage, />Total</i);
  assert.match(eventPage, />DNF</i);

  assert.match(stylesheet, /--color-sand:/i);
  assert.match(stylesheet, /\.hero,\s*\.event-poster\s*\{/i);
  assert.match(stylesheet, /\.event-tile\s*\{/i);
  assert.match(stylesheet, /\.scoreboard-panel\s*table/i);
});

test("siteBuildCommand renders decoded event-page player names in displayed order", async (t) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-decoded-names-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.players.items[0].name = "A&#122;";
  store.players.items[1].name = "Ab";
  store.results.items[1].finishPlace = 1;

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

  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );

  assert.match(eventPage, />Ab</i);
  assert.match(eventPage, />Az</i);
  assert.equal(eventPage.indexOf(">Ab<") < eventPage.indexOf(">Az<"), true);
});

test("siteBuildCommand renders named HTML entities in event-page player names", async (t) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-named-entities-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.players.items[0].name = "Andr&eacute;";

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

  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );

  assert.match(eventPage, />André</i);
});

test("siteBuildCommand renders decoded homepage leaderboard player names without double-encoding source entities", async (t) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-homepage-decoded-names-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.players.items[0].name = "Alice &amp; Smith";

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

  assert.match(homepage, /Alice &amp; Smith/i);
  assert.doesNotMatch(homepage, /Alice &amp;amp; Smith/i);
});

test("siteBuildCommand renders tied homepage leaderboard rows in decoded visible order", async (t) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-homepage-order-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.players.items[0].name = "A&#122;";
  store.players.items[1].name = "Ab";
  store.results.items[1].eventTotalPoints = 10;

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

  assert.match(homepage, />Ab</i);
  assert.match(homepage, />Az</i);
  assert.equal(homepage.indexOf(">Ab<") < homepage.indexOf(">Az<"), true);
});

test("siteBuildCommand renders a single empty-state message when no events exist", async (t) => {
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-empty-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const result = await siteBuildCommand({
    baseDirectory: tempDirectory,
    projectDirectory: path.join(__dirname, ".."),
    io: {
      writeStdout: () => {},
      writeStderr: () => {},
    },
    loadCanonicalStore: async () => ({
      players: { schemaVersion: 1, items: [] },
      events: { schemaVersion: 1, items: [] },
      results: { schemaVersion: 1, items: [] },
    }),
  });

  assert.equal(result.exitCode, 0);

  const homepage = await fs.readFile(path.join(tempDirectory, "dist", "index.html"), "utf8");
  const emptyMatches = homepage.match(/No events yet\./g) || [];

  assert.equal(emptyMatches.length, 1);
  assert.doesNotMatch(homepage, />Leaderboard</i);
  assert.doesNotMatch(homepage, />Events</i);
});

test("siteBuildCommand returns non-zero when canonical validation fails", async () => {
  const stderr = [];
  const result = await siteBuildCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    loadCanonicalStore: async () => ({
      players: { schemaVersion: 1, items: [] },
      events: { schemaVersion: 1, items: [] },
      results: {
        schemaVersion: 1,
        items: [
          {
            id: "result_0001",
            eventId: "event_9999",
            playerId: "player_9999",
            finishPlace: 1,
            startingTag: 1,
            attendancePoints: 2,
            placementPoints: 8,
            startingTagBonusPoints: 0,
            tagOneBonusPoints: 0,
            beatYourTagBonusPoints: 0,
            eventTotalPoints: 10,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
      },
    }),
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.match(stderr.join(""), /playerId|missing player|eventId|missing event/i);
});

test("siteBuildCommand returns non-zero when public-model generation fails", async () => {
  const stderr = [];
  const result = await siteBuildCommand({
    io: {
      writeStdout: () => {},
      writeStderr: (value) => stderr.push(value),
    },
    loadCanonicalStore: async () => createStore(),
    buildPublicModel: () => {
      throw new Error("unable to build pages");
    },
  });

  assert.deepEqual(result, { exitCode: 1 });
  assert.match(stderr.join(""), /unable to build pages/i);
});
