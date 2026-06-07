const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

function extractRankCells(html) {
  return Array.from(
    html.matchAll(/data-testid="leaderboard-rank-[^"]+">(\d+)</g),
    (match) => Number(match[1])
  );
}

test("non-demo mode computes shared ranks from season points", async () => {
  const { default: HomePage } = await import("../app/page.js");

  const rows = [
    { playerId: "p1", playerName: "Ada", eventsPlayed: 4, seasonPoints: 20, rank: 99 },
    { playerId: "p2", playerName: "Bert", eventsPlayed: 4, seasonPoints: 15, rank: 88 },
    { playerId: "p3", playerName: "Cara", eventsPlayed: 4, seasonPoints: 15, rank: 77 },
  ];

  const html = renderToStaticMarkup(HomePage({ loadRows: () => rows, searchParams: {} }));
  const rankCells = extractRankCells(html);

  assert.deepEqual(rankCells, [1, 2, 2]);
  assert.match(html, /data-testid="leaderboard-row-p1"/);
  assert.match(html, /data-testid="leaderboard-rank-p1">1</);
  assert.match(html, /data-testid="leaderboard-player-p1">Ada</);
  assert.match(html, /data-testid="leaderboard-events-played-p1">4</);
  assert.match(html, /data-testid="leaderboard-season-points-p1">20</);
});

test("default non-demo mode loads persisted leaderboard rows", async (t) => {
  const { default: HomePage } = await import("../app/page.js");
  const eventsData = await import("../lib/eventsData.js");

  t.after(() => {
    eventsData.resetEventsData();
  });

  eventsData.resetEventsData({
    players: [
      { id: "p1", name: "Ada" },
      { id: "p2", name: "Bert" },
    ],
    events: [
      {
        id: "evt_confirmed_0001",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        season: 2026,
        status: "confirmed",
      },
    ],
    eventResults: [
      { id: "result_0001", eventId: "evt_confirmed_0001", playerId: "p1" },
      { id: "result_0002", eventId: "evt_confirmed_0001", playerId: "p2" },
    ],
    eventPoints: [
      { id: "point_0001", eventResultId: "result_0001", points: 12 },
      { id: "point_0002", eventResultId: "result_0002", points: 8 },
    ],
  });

  const html = renderToStaticMarkup(HomePage({ searchParams: {} }));
  const rankCells = extractRankCells(html);

  assert.deepEqual(rankCells, [1, 2]);
  assert.match(html, /data-testid="leaderboard-player-p1">Ada</);
  assert.match(html, /data-testid="leaderboard-season-points-p1">12</);
  assert.match(html, /data-testid="leaderboard-player-p2">Bert</);
  assert.doesNotMatch(html, /No leaderboard entries yet/);
});

test("demo mode uses fixture-scored aggregates and preserves shared-rank display", async () => {
  const { default: HomePage } = await import("../app/page.js");

  const html = renderToStaticMarkup(HomePage({ searchParams: { demo: "1" } }));
  const rankCells = extractRankCells(html);

  assert.equal(html.includes("Demo Data"), true);
  assert.deepEqual(rankCells, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(html.includes("Blair"), true);
  assert.equal(html.includes("Casey"), true);
});
