import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../app/page.js";

function assertLeaderboardRow(markup, { playerId, rank, playerName, eventsPlayed, seasonPoints }) {
  assert.match(markup, new RegExp(`<tr data-testid="leaderboard-row-${playerId}">`));
  assert.match(markup, new RegExp(`<td data-testid="leaderboard-rank-${playerId}">${rank}<\\/td>`));
  assert.match(markup, new RegExp(`<td data-testid="leaderboard-player-${playerId}">${playerName}<\\/td>`));
  assert.match(markup, new RegExp(`<td data-testid="leaderboard-events-played-${playerId}">${eventsPlayed}<\\/td>`));
  assert.match(markup, new RegExp(`<td data-testid="leaderboard-season-points-${playerId}">${seasonPoints}<\\/td>`));
}

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

  assertLeaderboardRow(markup, { playerId: "p2", rank: 1, playerName: "Blair", eventsPlayed: 5, seasonPoints: 42 });
  assertLeaderboardRow(markup, { playerId: "p1", rank: 2, playerName: "Alex", eventsPlayed: 4, seasonPoints: 38 });
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
  assertLeaderboardRow(markup, { playerId: "p2", rank: 1, playerName: "Blair", eventsPlayed: 5, seasonPoints: 83 });
  assertLeaderboardRow(markup, { playerId: "p3", rank: 3, playerName: "Casey", eventsPlayed: 5, seasonPoints: 72 });
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

  assertLeaderboardRow(markup, { playerId: "p1", rank: 1, playerName: "Alex", eventsPlayed: 6, seasonPoints: 52 });
  assertLeaderboardRow(markup, { playerId: "p2", rank: 2, playerName: "Blair", eventsPlayed: 6, seasonPoints: 46 });
  assertLeaderboardRow(markup, { playerId: "p3", rank: 2, playerName: "Casey", eventsPlayed: 6, seasonPoints: 46 });
  assertLeaderboardRow(markup, { playerId: "p4", rank: 4, playerName: "Devon", eventsPlayed: 6, seasonPoints: 44 });
});
