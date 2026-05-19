import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../app/page.js";

test("renders leaderboard table with required columns", () => {
  const markup = renderToStaticMarkup(HomePage());

  assert.match(markup, /<th scope="col">Rank<\/th>/);
  assert.match(markup, /<th scope="col">Player<\/th>/);
  assert.match(markup, /<th scope="col">Events Played<\/th>/);
  assert.match(markup, /<th scope="col">Season Points<\/th>/);
});

test("renders clear empty state when no leaderboard rows", () => {
  const markup = renderToStaticMarkup(HomePage());

  assert.match(markup, /No leaderboard entries yet\./);
  assert.match(markup, /<td colSpan="4">No leaderboard entries yet\.<\/td>/);
});

test("renders mapped leaderboard rows in rank order", () => {
  const markup = renderToStaticMarkup(
    HomePage({
      loadRows: () => [
        {
          playerId: "p2",
          playerName: "Blair",
          eventsPlayed: 5,
          seasonPoints: 42,
        },
        {
          playerId: "p1",
          playerName: "Alex",
          eventsPlayed: 4,
          seasonPoints: 38,
        },
      ],
    })
  );

  assert.match(markup, /<td>1<\/td><td>Blair<\/td><td>5<\/td><td>42<\/td>/);
  assert.match(markup, /<td>2<\/td><td>Alex<\/td><td>4<\/td><td>38<\/td>/);
  assert.ok(markup.indexOf("Blair") < markup.indexOf("Alex"));
});

test("uses demo rows and badge when demo=1", () => {
  let called = false;
  const markup = renderToStaticMarkup(
    HomePage({
      searchParams: { demo: "1" },
      loadRows: () => {
        called = true;
        return [];
      },
    })
  );

  assert.equal(called, false);
  assert.match(markup, /Demo Data/);
  assert.match(markup, /Casey/);
  assert.match(markup, /<td>1<\/td><td>Blair<\/td><td>5<\/td><td>83<\/td>/);
  assert.match(markup, /<td>3<\/td><td>Casey<\/td><td>5<\/td><td>72<\/td>/);
});

test("uses live loader when demo query param is absent", () => {
  let called = false;
  renderToStaticMarkup(
    HomePage({
      loadRows: () => {
        called = true;
        return [];
      },
    })
  );

  assert.equal(called, true);
});

test("renders shared ranks for ties in non-demo mode", () => {
  const markup = renderToStaticMarkup(
    HomePage({
      loadRows: () => [
        {
          playerId: "p1",
          playerName: "Alex",
          eventsPlayed: 6,
          seasonPoints: 52,
        },
        {
          playerId: "p2",
          playerName: "Blair",
          eventsPlayed: 6,
          seasonPoints: 46,
        },
        {
          playerId: "p3",
          playerName: "Casey",
          eventsPlayed: 6,
          seasonPoints: 46,
        },
        {
          playerId: "p4",
          playerName: "Devon",
          eventsPlayed: 6,
          seasonPoints: 44,
        },
      ],
    })
  );

  assert.match(markup, /<td>1<\/td><td>Alex<\/td><td>6<\/td><td>52<\/td>/);
  assert.match(markup, /<td>2<\/td><td>Blair<\/td><td>6<\/td><td>46<\/td>/);
  assert.match(markup, /<td>2<\/td><td>Casey<\/td><td>6<\/td><td>46<\/td>/);
  assert.match(markup, /<td>4<\/td><td>Devon<\/td><td>6<\/td><td>44<\/td>/);
});
