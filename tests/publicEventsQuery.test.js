const test = require("node:test");
const assert = require("node:assert/strict");

const {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
} = require("../lib/publicEventsQuery");

test("listPublicEvents returns confirmed events ordered by date descending and slug", () => {
  const events = [
    {
      id: "e-old",
      slug: "spring-open",
      name: "Spring Open",
      eventDate: "2026-03-09",
      confirmed: true,
    },
    {
      id: "e-hidden",
      slug: "draft-night",
      name: "Draft Night",
      eventDate: "2026-04-01",
      confirmed: false,
    },
    {
      id: "e-new",
      slug: "summer-showdown",
      name: "Summer Showdown",
      eventDate: "2026-05-20",
      confirmed: true,
    },
    {
      id: "e-new-2",
      slug: "autumn-open",
      name: "Autumn Open",
      eventDate: "2026-05-20",
      confirmed: true,
    },
  ];

  const rows = listPublicEvents({ events });

  assert.deepEqual(rows, [
    {
      slug: "autumn-open",
      name: "Autumn Open",
      eventDate: "2026-05-20",
    },
    {
      slug: "summer-showdown",
      name: "Summer Showdown",
      eventDate: "2026-05-20",
    },
    {
      slug: "spring-open",
      name: "Spring Open",
      eventDate: "2026-03-09",
    },
  ]);
});

test("listPublicEvents treats confirmed=true as authoritative when status conflicts", () => {
  const rows = listPublicEvents({
    events: [
      {
        id: "e1",
        slug: "explicit-confirmed",
        name: "Explicit Confirmed",
        eventDate: "2026-06-01",
        confirmed: true,
        status: "draft",
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      slug: "explicit-confirmed",
      name: "Explicit Confirmed",
      eventDate: "2026-06-01",
    },
  ]);
});

test("listPublicEvents treats confirmed=false as authoritative when status conflicts", () => {
  const rows = listPublicEvents({
    events: [
      {
        id: "e1",
        slug: "explicit-unconfirmed",
        name: "Explicit Unconfirmed",
        eventDate: "2026-06-01",
        confirmed: false,
        status: "confirmed",
      },
    ],
  });

  assert.deepEqual(rows, []);
});

test("listPublicEvents falls back to status=confirmed when confirmed is absent", () => {
  const rows = listPublicEvents({
    events: [
      {
        id: "e1",
        slug: "status-only-confirmed",
        name: "Status Only Confirmed",
        eventDate: "2026-06-01",
        status: "confirmed",
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      slug: "status-only-confirmed",
      name: "Status Only Confirmed",
      eventDate: "2026-06-01",
    },
  ]);
});

test("getPublicEventScoreboardBySlug returns null for unknown or unconfirmed slugs", () => {
  const players = [{ id: "p1", name: "Ada" }];
  const events = [
    {
      id: "e1",
      slug: "confirmed-event",
      name: "Confirmed",
      eventDate: "2026-03-01",
      confirmed: true,
    },
    {
      id: "e2",
      slug: "draft-event",
      name: "Draft",
      eventDate: "2026-03-02",
      confirmed: false,
    },
  ];

  const eventResults = [{ id: "r1", eventId: "e1", playerId: "p1", startingTag: 3 }];
  const eventPoints = [
    {
      eventResultId: "r1",
      attendance: 2,
      placement: 8,
      startingTagBonus: 6,
      tagOneBonus: 0,
      beatYourTagBonus: 2,
      eventTotal: 18,
    },
  ];

  assert.equal(
    getPublicEventScoreboardBySlug({
      slug: "missing",
      players,
      events,
      eventResults,
      eventPoints,
    }),
    null
  );

  assert.equal(
    getPublicEventScoreboardBySlug({
      slug: "draft-event",
      players,
      events,
      eventResults,
      eventPoints,
    }),
    null
  );
});

test("getPublicEventScoreboardBySlug returns metadata with deterministic sort by total name and id", () => {
  const players = [
    { id: "p1", name: "Ada" },
    { id: "p2", name: "Bert" },
  ];
  const events = [
    {
      id: "e1",
      slug: "may-major",
      name: "May Major",
      eventDate: "2026-05-01",
      confirmed: true,
    },
  ];
  const eventResults = [
    { id: "r1", eventId: "e1", playerId: "p2", startingTag: 1 },
    { id: "r2", eventId: "e1", playerId: "p1", startingTag: 4 },
  ];
  const eventPoints = [
    {
      eventResultId: "r1",
      attendance: 2,
      placement: 6,
      startingTagBonus: 5,
      tagOneBonus: 2,
      beatYourTagBonus: 0,
      eventTotal: 15,
    },
    {
      eventResultId: "r2",
      attendance: 2,
      placement: 8,
      startingTagBonus: 2,
      tagOneBonus: 0,
      beatYourTagBonus: 3,
      eventTotal: 15,
    },
  ];

  const event = getPublicEventScoreboardBySlug({
    slug: "may-major",
    players,
    events,
    eventResults,
    eventPoints,
  });

  assert.deepEqual(event, {
    slug: "may-major",
    name: "May Major",
    eventDate: "2026-05-01",
    scoreboard: [
      {
        playerId: "p1",
        playerName: "Ada",
        startingTag: 4,
        eventResult: undefined,
        attendance: 2,
        placement: 8,
        startingTagBonus: 2,
        tagOneBonus: 0,
        beatYourTagBonus: 3,
        eventTotal: 15,
      },
      {
        playerId: "p2",
        playerName: "Bert",
        startingTag: 1,
        eventResult: undefined,
        attendance: 2,
        placement: 6,
        startingTagBonus: 5,
        tagOneBonus: 2,
        beatYourTagBonus: 0,
        eventTotal: 15,
      },
    ],
  });
});

test("getPublicEventScoreboardBySlug defaults missing eventPoints columns to zero", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "partial-points",
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e1",
        slug: "partial-points",
        name: "Partial Points",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [{ id: "r1", eventId: "e1", playerId: "p1", startingTag: 7 }],
    eventPoints: [{ eventResultId: "r1", attendance: 2, eventTotal: 2 }],
  });

  assert.deepEqual(event.scoreboard[0], {
    playerId: "p1",
    playerName: "Ada",
    startingTag: 7,
    eventResult: undefined,
    attendance: 2,
    placement: 0,
    startingTagBonus: 0,
    tagOneBonus: 0,
    beatYourTagBonus: 0,
    eventTotal: 2,
  });
});

test("getPublicEventScoreboardBySlug normalizes numeric category fields from strings and invalid values", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "numeric-normalization",
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
    ],
    events: [
      {
        id: "e1",
        slug: "numeric-normalization",
        name: "Numeric Normalization",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1", startingTag: 7 },
      { id: "r2", eventId: "e1", playerId: "p2", startingTag: 3 },
    ],
    eventPoints: [
      {
        eventResultId: "r1",
        attendance: "2",
        placement: "8",
        startingTagBonus: "6",
        tagOneBonus: "0",
        beatYourTagBonus: "2",
        eventTotal: "18",
      },
      {
        eventResultId: "r2",
        attendance: "bad",
        placement: "",
        startingTagBonus: "nope",
        tagOneBonus: null,
        beatYourTagBonus: undefined,
        eventTotal: "bad",
      },
    ],
  });

  assert.deepEqual(event.scoreboard, [
    {
      playerId: "p1",
      playerName: "Ada",
      startingTag: 7,
      eventResult: undefined,
      attendance: 2,
      placement: 8,
      startingTagBonus: 6,
      tagOneBonus: 0,
      beatYourTagBonus: 2,
      eventTotal: 18,
    },
    {
      playerId: "p2",
      playerName: "Bert",
      startingTag: 3,
      eventResult: undefined,
      attendance: 0,
      placement: 0,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      eventTotal: 0,
    },
  ]);
});

test("getPublicEventScoreboardBySlug resolves eventTotal from points contracts in precedence order", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "points-contracts",
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
      { id: "p3", name: "Cara" },
      { id: "p4", name: "Dion" },
    ],
    events: [
      {
        id: "e1",
        slug: "points-contracts",
        name: "Points Contracts",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1", startingTag: 1 },
      { id: "r2", eventId: "e1", playerId: "p2", startingTag: 2 },
      { id: "r3", eventId: "e1", playerId: "p3", startingTag: 3 },
      { id: "r4", eventId: "e1", playerId: "p4", startingTag: 4 },
    ],
    eventPoints: [
      { eventResultId: "r1", points: 9, eventTotal: 99, event_total_pts: 999 },
      { eventResultId: "r2", eventTotal: 8, event_total_pts: 888 },
      { eventResultId: "r3", event_total_pts: 7 },
      { eventResultId: "r4" },
    ],
  });

  assert.deepEqual(
    event.scoreboard.map((row) => [row.playerId, row.eventTotal]),
    [
      ["p1", 9],
      ["p2", 8],
      ["p3", 7],
      ["p4", 0],
    ]
  );
});

test("getPublicEventScoreboardBySlug falls back to playerId when player is unknown", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "unknown-player",
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e1",
        slug: "unknown-player",
        name: "Unknown Player",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [{ id: "r1", eventId: "e1", playerId: "p999", startingTag: 9 }],
    eventPoints: [{ eventResultId: "r1", eventTotal: 0 }],
  });

  assert.equal(event.scoreboard[0].playerName, "p999");
});

test("getPublicEventScoreboardBySlug breaks ties by playerId when totals and names tie", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "tie-break",
    players: [
      { id: "p2", name: "Alex" },
      { id: "p1", name: "Alex" },
    ],
    events: [
      {
        id: "e1",
        slug: "tie-break",
        name: "Tie Break",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r2", eventId: "e1", playerId: "p2", startingTag: 1 },
      { id: "r1", eventId: "e1", playerId: "p1", startingTag: 2 },
    ],
    eventPoints: [
      { eventResultId: "r1", eventTotal: 10 },
      { eventResultId: "r2", eventTotal: 10 },
    ],
  });

  assert.deepEqual(
    event.scoreboard.map((row) => row.playerId),
    ["p1", "p2"]
  );
});

test("getPublicEventScoreboardBySlug sorts by finish place then player name with DNF last", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "finish-order",
    players: [
      { id: "p1", name: "Cara" },
      { id: "p2", name: "Ada" },
      { id: "p3", name: "Bert" },
      { id: "p4", name: "Zane" },
    ],
    events: [
      {
        id: "e1",
        slug: "finish-order",
        name: "Finish Order",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1", startingTag: 4, finishPlace: 2 },
      { id: "r2", eventId: "e1", playerId: "p2", startingTag: 1, finishPlace: 1 },
      { id: "r3", eventId: "e1", playerId: "p3", startingTag: 2, finishPlace: 2 },
      { id: "r4", eventId: "e1", playerId: "p4", startingTag: 3, finishPlace: null },
    ],
    eventPoints: [
      { eventResultId: "r1", eventTotal: 20 },
      { eventResultId: "r2", eventTotal: 5 },
      { eventResultId: "r3", eventTotal: 30 },
      { eventResultId: "r4", eventTotal: 50 },
    ],
  });

  assert.deepEqual(
    event.scoreboard.map((row) => [row.playerName, row.eventResult]),
    [
      ["Ada", 1],
      ["Bert", 2],
      ["Cara", 2],
      ["Zane", null],
    ]
  );
});

test("getPublicEventScoreboardBySlug row shape includes all score columns", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "shape-check",
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e1",
        slug: "shape-check",
        name: "Shape Check",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [{ id: "r1", eventId: "e1", playerId: "p1", startingTag: 7 }],
    eventPoints: [
      {
        eventResultId: "r1",
        attendance: 2,
        placement: 4,
        startingTagBonus: 0,
        tagOneBonus: 0,
        beatYourTagBonus: 0,
        eventTotal: 6,
      },
    ],
  });

  assert.deepEqual(Object.keys(event.scoreboard[0]).sort(), [
      "attendance",
      "beatYourTagBonus",
      "eventResult",
      "eventTotal",
    "placement",
    "playerId",
    "playerName",
    "startingTag",
    "startingTagBonus",
    "tagOneBonus",
  ]);
});

test("getPublicEventScoreboardBySlug dedupes duplicate result rows per player", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "dup-scoreboard",
    players: [{ id: "p:1", name: "Ada" }],
    events: [
      {
        id: "e:1",
        slug: "dup-scoreboard",
        name: "Dup Scoreboard",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e:1", playerId: "p:1", startingTag: 7 },
      { id: "r1", eventId: "e:1", playerId: "p:1", startingTag: 7 },
    ],
    eventPoints: [{ eventResultId: "r1", eventTotal: 6 }],
  });

  assert.equal(event.scoreboard.length, 1);
  assert.equal(event.scoreboard[0].playerId, "p:1");
});

test("getPublicEventScoreboardBySlug picks deterministic duplicate winner by smallest result id", () => {
  const sharedInput = {
    slug: "dup-deterministic",
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e1",
        slug: "dup-deterministic",
        name: "Dup Deterministic",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventPoints: [
      { eventResultId: "r-a", eventTotal: 9 },
      { eventResultId: "r-b", eventTotal: 2 },
    ],
  };

  const eventAB = getPublicEventScoreboardBySlug({
    ...sharedInput,
    eventResults: [
      { id: "r-a", eventId: "e1", playerId: "p1", startingTag: 4, finishPlace: 1 },
      { id: "r-b", eventId: "e1", playerId: "p1", startingTag: 7, finishPlace: 9 },
    ],
  });

  const eventBA = getPublicEventScoreboardBySlug({
    ...sharedInput,
    eventResults: [
      { id: "r-b", eventId: "e1", playerId: "p1", startingTag: 7, finishPlace: 9 },
      { id: "r-a", eventId: "e1", playerId: "p1", startingTag: 4, finishPlace: 1 },
    ],
  });

  assert.equal(eventAB.scoreboard[0].eventTotal, 9);
  assert.equal(eventAB.scoreboard[0].startingTag, 4);
  assert.equal(eventAB.scoreboard[0].eventResult, 1);
  assert.deepEqual(eventBA.scoreboard, eventAB.scoreboard);
});

test("status=confirmed events appear in public events list", () => {
  const rows = listPublicEvents({
    events: [
      {
        id: "e1",
        slug: "status-confirmed",
        name: "Status Confirmed",
        eventDate: "2026-07-01",
        status: "confirmed",
      },
      {
        id: "e2",
        slug: "status-draft",
        name: "Status Draft",
        eventDate: "2026-07-02",
        status: "draft",
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      slug: "status-confirmed",
      name: "Status Confirmed",
      eventDate: "2026-07-01",
    },
  ]);
});

test("status=confirmed event slug returns public event detail scoreboard", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "status-confirmed",
    players: [{ id: "p1", name: "Ada" }],
    events: [
      {
        id: "e1",
        slug: "status-confirmed",
        name: "Status Confirmed",
        eventDate: "2026-07-01",
        status: "confirmed",
      },
    ],
    eventResults: [{ id: "r1", eventId: "e1", playerId: "p1", startingTag: 5 }],
    eventPoints: [{ eventResultId: "r1", eventTotal: 12 }],
  });

  assert.equal(event.slug, "status-confirmed");
  assert.equal(event.scoreboard[0].eventTotal, 12);
});
