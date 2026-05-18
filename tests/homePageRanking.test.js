const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("non-demo mode computes shared ranks from season points", async () => {
  const { default: HomePage } = await import("../app/page.js");

  const rows = [
    { playerId: "p1", playerName: "Ada", eventsPlayed: 4, seasonPoints: 20, rank: 99 },
    { playerId: "p2", playerName: "Bert", eventsPlayed: 4, seasonPoints: 15, rank: 88 },
    { playerId: "p3", playerName: "Cara", eventsPlayed: 4, seasonPoints: 15, rank: 77 },
  ];

  const html = renderToStaticMarkup(HomePage({ loadRows: () => rows, searchParams: {} }));
  const rankCells = Array.from(html.matchAll(/<tr><td>(\d+)<\/td><td>/g), (match) => Number(match[1]));

  assert.deepEqual(rankCells, [1, 2, 2]);
});
