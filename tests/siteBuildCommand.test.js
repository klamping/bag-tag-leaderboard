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

  // assert.equal(model.siteTitle, "Bag Tag Leaderboard");
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
  assert.deepEqual(model.homepage.leaderboardEvents, [
    {
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      shortDate: "4/12",
      accessibleLabel: "Spring Showdown on 2026-04-12",
    },
  ]);
  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
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
          startingTagBonusDisplay: "-",
          tagOneBonus: 0,
          tagOneBonusDisplay: "-",
          beatYourTagBonus: 0,
          beatYourTagBonusDisplay: "-",
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
          startingTagBonusDisplay: "-",
          tagOneBonus: 0,
          tagOneBonusDisplay: "-",
          beatYourTagBonus: 0,
          beatYourTagBonusDisplay: "-",
          eventTotal: 2,
        },
      ],
    },
  ]);
});

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

  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 2,
      seasonPoints: 20,
      eventOverview: [
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
        {
          eventName: "Summer Sizzler",
          eventSlug: "summer-sizzler",
          attendance: 2,
          placement: 5,
          startingTagBonus: 1,
          startingTagBonusDisplay: 1,
          tagOneBonus: 0,
          tagOneBonusDisplay: 0,
          beatYourTagBonus: 2,
          beatYourTagBonusDisplay: 2,
          eventTotal: 10,
        },
      ],
      totals: {
        attendance: 4,
        placement: 13,
        startingTagBonus: 1,
        tagOneBonus: 0,
        beatYourTagBonus: 2,
        eventTotal: 20,
      },
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      eventsPlayed: 2,
      seasonPoints: 13,
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/12",
          points: 2,
          played: true,
        },
        {
          eventSlug: "summer-sizzler",
          shortDate: "5/10",
          points: 11,
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
        {
          eventName: "Summer Sizzler",
          eventSlug: "summer-sizzler",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          startingTagBonusDisplay: 0,
          tagOneBonus: 1,
          tagOneBonusDisplay: 1,
          beatYourTagBonus: 0,
          beatYourTagBonusDisplay: 0,
          eventTotal: 11,
        },
      ],
      totals: {
        attendance: 4,
        placement: 8,
        startingTagBonus: 0,
        tagOneBonus: 1,
        beatYourTagBonus: 0,
        eventTotal: 13,
      },
    },
  ]);
});

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
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      shortDate: "4/12",
      accessibleLabel: "Spring Showdown on 2026-04-12",
    },
    {
      slug: "summer-sizzler",
      name: "Summer Sizzler",
      eventDate: "2026-05-10",
      shortDate: "5/10",
      accessibleLabel: "Summer Sizzler on 2026-05-10",
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

test("buildPublicModel excludes out-of-season events from homepage breakdowns and totals", () => {
  const store = createStore();
  store.events.items.push({
    id: "event_0002",
    slug: "winter-warmup",
    name: "Winter Warmup",
    eventDate: "2027-01-15",
    isMajor: false,
    udiscUrl: "https://udisc.com/events/winter-warmup",
    importPath: "data/imports/winter-warmup.json",
    resultIds: ["result_0003", "result_0004"],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  store.results.items.push(
    {
      id: "result_0003",
      eventId: "event_0002",
      playerId: "player_0001",
      finishPlace: 1,
      startingTag: 4,
      attendancePoints: 2,
      placementPoints: 8,
      startingTagBonusPoints: 1,
      tagOneBonusPoints: 0,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 11,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    {
      id: "result_0004",
      eventId: "event_0002",
      playerId: "player_0002",
      finishPlace: 2,
      startingTag: 1,
      attendancePoints: 2,
      placementPoints: 5,
      startingTagBonusPoints: 0,
      tagOneBonusPoints: 1,
      beatYourTagBonusPoints: 0,
      eventTotalPoints: 8,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }
  );

  const model = buildPublicModel(store);

  assert.deepEqual(model.homepage.events, [
    {
      slug: "winter-warmup",
      name: "Winter Warmup",
      eventDate: "2027-01-15",
    },
    {
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
    },
  ]);

  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
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
      startingTagBonusDisplay: "-",
      tagOneBonus: 0,
      tagOneBonusDisplay: "-",
      beatYourTagBonus: 0,
      beatYourTagBonusDisplay: "-",
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
      startingTagBonusDisplay: "-",
      tagOneBonus: 0,
      tagOneBonusDisplay: "-",
      beatYourTagBonus: 0,
      beatYourTagBonusDisplay: "-",
      eventTotal: 2,
    },
  ]);

  assert.equal(model.eventPages[0].scoreboard[0].startingTagBonus, 0);
});

test("buildPublicModel sanitizes homepage seasonPoints for major bootstrap events", () => {
  const store = createStore();
  store.events.items[0].eventDate = "2026-04-01";
  store.events.items[0].isMajor = true;

  const model = buildPublicModel(store);

  assert.deepEqual(model.homepage.leaderboardRows, [
    {
      playerId: "player_0001",
      playerName: "Alice Smith",
      eventsPlayed: 1,
      seasonPoints: 20,
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/1",
          points: 20,
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
          eventTotal: 20,
        },
      ],
      totals: {
        attendance: 2,
        placement: 8,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 20,
      },
    },
    {
      playerId: "player_0002",
      playerName: "Bob Jones",
      eventsPlayed: 1,
      seasonPoints: 4,
      eventOverview: [
        {
          eventSlug: "spring-showdown",
          shortDate: "4/1",
          points: 4,
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
          eventTotal: 4,
        },
      ],
      totals: {
        attendance: 2,
        placement: 0,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 4,
      },
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
  store.results.items[1].placementPoints = 8;

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

test("siteBuildCommand builds homepage, event page, and stylesheet", async (t) => {
  const stdout = [];
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "site-build-"));

  t.after(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  const store = createStore();
  store.events.items[0].isMajor = true;
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
  );

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
  assert.match(stdout.join(""), /Built public site for 2 event page/i);

  const homepage = await fs.readFile(path.join(tempDirectory, "dist", "index.html"), "utf8");
  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );
  const seasonLeaderboardImagePage = await fs.readFile(
    path.join(tempDirectory, "dist", "season-leaderboard-image", "index.html"),
    "utf8"
  );
  const pointsRulesPage = await fs.readFile(
    path.join(tempDirectory, "dist", "points-rules", "index.html"),
    "utf8"
  );
  const stylesheet = await fs.readFile(path.join(tempDirectory, "dist", "styles", "site.css"), "utf8");

  // assert.match(homepage, /<title>Bag Tag Leaderboard<\/title>/i);
  // assert.match(homepage, />Bag Tag Leaderboard</i);
  // assert.match(homepage, />Leaderboard</i);
  // assert.match(homepage, />Events</i);
  assert.match(homepage, elementWithClassPattern("div", "leaderboard-table-scroll"));
  assert.match(homepage, /<link rel="stylesheet" href="\/styles\/site\.css">/i);
  assert.match(homepage, elementWithClassPattern("table", "leaderboard-table"));
  assert.match(homepage, /<th scope="col">Season<br\s*\/?>Total<\/th>/i);
  assert.match(homepage, /<th scope="col">Player<\/th>/i);
  assert.match(
    homepage,
    /<th scope="col" aria-label="Spring Showdown on 2026-04-12">4\/12<\/th>/i
  );
  assert.match(
    homepage,
    /<th scope="col" aria-label="Summer Sizzler on 2026-05-10">5\/10<\/th>/i
  );
  assert.match(homepage, elementWithClassPattern("td", "leaderboard-total-cell"));
  assert.match(homepage, /<th scope="row"[^>]*class="[^"]*leaderboard-player-cell[^"]*"/i);
  assert.match(homepage, elementWithClassPattern("details", "leaderboard-breakdown-toggle"));
  assert.match(homepage, elementWithClassPattern("span", "leaderboard-name"));
  assert.match(homepage, />pts</i);
  assert.match(homepage, />Show breakdown</i);
  assert.match(homepage, />Hide breakdown</i);
  assert.match(homepage, /<td\b[^>]*class="[^"]*leaderboard-total-cell[^"]*"[\s\S]*?>[\s\S]*?>30<(?=[\s\S]*?>pts<)/i);
  assert.match(homepage, /<details\b[^>]*class="[^"]*leaderboard-breakdown-toggle[^"]*"[\s\S]*?<summary\b[^>]*class="[^"]*leaderboard-summary[^"]*"/i);
  assert.match(
    homepage,
    /<th scope="row"[^>]*class="[^"]*leaderboard-player-cell[^"]*"[\s\S]*?<details\b[^>]*class="[^"]*leaderboard-breakdown-toggle[^"]*"[\s\S]*?>Alice Smith<[\s\S]*?>Show breakdown<[\s\S]*?>Hide breakdown<[\s\S]*?<\/details>[\s\S]*?<\/th>/i
  );
  assert.match(
    homepage,
    /<tr\b[^>]*>[\s\S]*?<th scope="row"[^>]*class="[^"]*leaderboard-player-cell[^"]*"[\s\S]*?Alice Smith[\s\S]*?<\/tr>\s*<tr\b[^>]*class="[^"]*leaderboard-breakdown-row[^"]*"/i
  );
  assert.match(
    homepage,
    /<tr\b[^>]*class="[^"]*leaderboard-breakdown-row[^"]*"[\s\S]*?<td\b[^>]*colspan="4"[^>]*>[\s\S]*?<div\b[^>]*class="[^"]*leaderboard-breakdown[^"]*"[\s\S]*?<caption\b[^>]*class="[^"]*visually-hidden[^"]*"[^>]*>Alice Smith scoring breakdown<\/caption>/i
  );
  assert.match(homepage, /<td\b[^>]*data-event-slug="spring-showdown"[^>]*>20<\/td>/i);
  assert.match(homepage, /<td\b[^>]*data-event-slug="summer-sizzler"[^>]*>10<\/td>/i);
  assert.match(homepage, /href="\/events\/spring-showdown\/"[^>]*>Spring Showdown</i);
  assert.match(homepage, /href="\/events\/summer-sizzler\/"[^>]*>Summer Sizzler</i);
  assert.match(homepage, />Totals</i);
  assert.match(homepage, /20<\/td>/i);
  assert.match(
    seasonLeaderboardImagePage,
    /<link rel="stylesheet" href="\.\.\/styles\/site\.css">/i
  );
  assert.match(homepage, />Beat Your Tag Bonus</i);
  assert.match(homepage, />Tag 1 Bonus</i);
  assert.match(homepage, elementWithClassPattern("section", "points-rules-summary"));
  assert.match(homepage, />How points work</i);
  assert.match(
    homepage,
    />Season standings combine attendance, finish placement, and tag-based bonuses\./i
  );
  assert.match(
    homepage,
    /<dt>Attendance<\/dt>\s*<dd>2 points for attending an event\.<\/dd>/i
  );
  assert.match(
    homepage,
    /<dt>Placement<\/dt>\s*<dd>1st gets 8, 2nd 6, 3rd 5, 4th 4, then top-half gets 2 and top-75% gets 1\.<\/dd>/i
  );
  assert.match(homepage, />Tied players share placement points\./i);
  assert.match(homepage, /href="\/points-rules\/"[^>]*>See full points rules</i);
  assert.doesNotMatch(homepage, /<dl class="visually-hidden">/i);

  // assert.match(eventPage, /<title>Spring Showdown \| Bag Tag Leaderboard<\/title>/i);
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
  assert.match(eventPage, elementWithClassPattern("section", "points-rules-summary"));
  assert.match(eventPage, />Player</i);
  assert.match(eventPage, />How points work</i);
  assert.match(eventPage, /href="\/points-rules\/"[^>]*>See full points rules</i);
  // assert.match(eventPage, />Start Tag</i);
  // assert.match(eventPage, />Finish</i);
  // assert.match(eventPage, />Attendance</i);
  // assert.match(eventPage, />Placement</i);
  // assert.match(eventPage, />Start Bonus</i);
  // assert.match(eventPage, />Tag #1</i);
  // assert.match(eventPage, />Beat Tag</i);
  // assert.match(eventPage, />Total</i);
  assert.match(eventPage, />DNF</i);

  assert.match(
    seasonLeaderboardImagePage,
    /<title>Season Leaderboard Export \| Bag Tag Leaderboard<\/title>/i
  );
  assert.match(seasonLeaderboardImagePage, /id="season-leaderboard-image"/i);
  assert.match(seasonLeaderboardImagePage, />Season Leaderboard</i);
  assert.match(seasonLeaderboardImagePage, />2026 Season</i);
  assert.match(seasonLeaderboardImagePage, />Alice Smith</i);
  assert.match(seasonLeaderboardImagePage, />Bob Jones</i);
  assert.match(seasonLeaderboardImagePage, />pts</i);
  assert.match(seasonLeaderboardImagePage, />4\/12</i);

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

  assert.match(stylesheet, /--color-sand:/i);
  assert.match(stylesheet, /\.leaderboard-table-scroll\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-table\s*\{/i);
  assert.match(
    stylesheet,
    /\.leaderboard-table\s*>\s*thead\s+th,\s*\.leaderboard-table\s*>\s*tbody\s*>\s*tr\s*>\s*:is\(th,\s*td\)\s*\{[\s\S]*?white-space:\s*nowrap;/i
  );
  assert.match(
    stylesheet,
    /\.leaderboard-table\s*>\s*thead\s+th:not\(:nth-child\(2\)\),\s*\.leaderboard-table\s*>\s*tbody\s*>\s*tr\s*>\s*:is\(th,\s*td\):not\(:nth-child\(2\)\)\s*\{[\s\S]*?text-align:\s*center;/i
  );
  assert.match(stylesheet, /\.leaderboard-total-cell\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-player-cell\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown-toggle\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown-row\s*\{/i);
  assert.match(stylesheet, /\.leaderboard-breakdown-row\s*>\s*td\s*\{/i);
  assert.match(
    stylesheet,
    /tr:has\(\.leaderboard-breakdown-toggle:not\(\[open\]\)\)\s*\+\s*\.leaderboard-breakdown-row\s*\{[\s\S]*?display:\s*none;/i
  );
  assert.match(
    stylesheet,
    /\.leaderboard-breakdown-toggle\s*:not\(\[open\]\)\s+\.leaderboard-summary-open\s*\{[\s\S]*?display:\s*none;/i
  );
  assert.match(
    stylesheet,
    /\.leaderboard-breakdown-toggle\[open\]\s+\.leaderboard-summary-closed\s*\{[\s\S]*?display:\s*none;/i
  );
  assert.match(stylesheet, /\.leaderboard-breakdown\s+\.table-scroll\s*\{/i);
  assert.match(stylesheet, /\.visually-hidden\s*\{/i);
  assert.match(stylesheet, /\.scoreboard-panel\s*table/i);
  assert.match(stylesheet, /\.points-rules-summary\s*\{/i);
  assert.match(stylesheet, /\.points-rules-summary-list\s*\{/i);
  assert.match(stylesheet, /\.points-rules-summary-link\s*\{/i);
  assert.match(stylesheet, /\.points-rules-page\s*\{/i);
  assert.match(stylesheet, /\.points-rules-section\s*\{/i);
  assert.match(
    stylesheet,
    /#season-leaderboard-image\s*\{[\s\S]*?width:\s*1080px;[\s\S]*?height:\s*1350px;/i
  );
  assert.doesNotMatch(stylesheet, /#season-leaderboard-image\s*\{[\s\S]*?min-height:\s*1350px;/i);
  assert.match(stylesheet, /\.season-leaderboard-image-table\s*\{/i);
  assert.match(stylesheet, /\.season-leaderboard-image-rank\s*\{/i);
});

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

test("siteBuildCommand renders kickoff tag bonus zeros as dashes", async (t) => {
  const tempDirectory = await createTempBuildDirectory(t, "site-build-kickoff-tag-bonus-dash-");
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
      startingTag: 4,
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
  const eventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "spring-showdown", "index.html"),
    "utf8"
  );
  const nonKickoffEventPage = await fs.readFile(
    path.join(tempDirectory, "dist", "events", "summer-sizzler", "index.html"),
    "utf8"
  );

  assert.match(homepage, />-<\/td>\s*<td>-<\/td>\s*<td>-<\/td>/i);
  assert.match(homepage, />1<\/td>\s*<td>0<\/td>\s*<td>2<\/td>\s*<td>10<\/td>/i);
  assert.doesNotMatch(homepage, />1<\/td>\s*<td>-<\/td>\s*<td>2<\/td>\s*<td>10<\/td>/i);
  assert.match(eventPage, />-<\/td>\s*<td>-<\/td>\s*<td>-<\/td>\s*<td class="total-column">10<\/td>/i);
  assert.doesNotMatch(eventPage, />0<\/td>\s*<td>0<\/td>\s*<td>0<\/td>\s*<td class="total-column">10<\/td>/i);
  assert.match(nonKickoffEventPage, />1<\/td>\s*<td>0<\/td>\s*<td>2<\/td>\s*<td class="total-column">10<\/td>/i);
  assert.doesNotMatch(nonKickoffEventPage, />1<\/td>\s*<td>-<\/td>\s*<td>2<\/td>\s*<td class="total-column">10<\/td>/i);
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
  store.results.items[1].placementPoints = 8;

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

  assert.match(homepage, /<span class="leaderboard-name">Ab<\/span>/i);
  assert.match(homepage, /<span class="leaderboard-name">Az<\/span>/i);
  assert.equal(
    homepage.indexOf('<span class="leaderboard-name">Ab</span>') <
      homepage.indexOf('<span class="leaderboard-name">Az</span>'),
    true
  );
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
  await assert.rejects(
    fs.readFile(path.join(tempDirectory, "dist", "season-leaderboard-image", "index.html"), "utf8"),
    { code: "ENOENT" }
  );
});

test("season leaderboard image template keeps permalink logic in the template file", async () => {
  const templatePath = path.join(__dirname, "..", "site", "season-leaderboard-image.njk");
  const templateSource = await fs.readFile(templatePath, "utf8");

  assert.match(templateSource, /^---js\n/);
  await assert.rejects(
    fs.access(path.join(__dirname, "..", "site", "season-leaderboard-image.11tydata.js")),
    { code: "ENOENT" }
  );
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
