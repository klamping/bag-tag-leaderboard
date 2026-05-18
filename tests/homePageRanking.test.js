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

test("demo mode uses fixture-scored aggregates and preserves shared-rank display", async () => {
  const { default: HomePage } = await import("../app/page.js");

  const html = renderToStaticMarkup(HomePage({ searchParams: { demo: "1" } }));
  const rankCells = Array.from(html.matchAll(/<tr><td>(\d+)<\/td><td>/g), (match) => Number(match[1]));

  assert.equal(html.includes("Demo Data"), true);
  assert.deepEqual(rankCells, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(html.includes("Blair"), true);
  assert.equal(html.includes("Casey"), true);
});
