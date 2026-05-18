import leaderboardQuery from "../lib/leaderboardQuery.js";
import { createElement } from "react";

const { getSeasonLeaderboardRows } = leaderboardQuery;

const DEMO_ROWS = [
  { playerId: "p01", playerName: "Alex", eventsPlayed: 6, seasonPoints: 52, rank: 1 },
  { playerId: "p02", playerName: "Blair Johnson", eventsPlayed: 6, seasonPoints: 46, rank: 2 },
  { playerId: "p11", playerName: "Bailey", eventsPlayed: 6, seasonPoints: 46, rank: 2 },
  { playerId: "p03", playerName: "Casey Longlastname Example", eventsPlayed: 6, seasonPoints: 44, rank: 3 },
  { playerId: "p04", playerName: "Devon", eventsPlayed: 6, seasonPoints: 44, rank: 3 },
  { playerId: "p05", playerName: "Emerson", eventsPlayed: 5, seasonPoints: 39, rank: 6 },
  { playerId: "p06", playerName: "Franklin", eventsPlayed: 5, seasonPoints: 37, rank: 7 },
  { playerId: "p07", playerName: "Gwendolyn Rivera", eventsPlayed: 5, seasonPoints: 33, rank: 8 },
  { playerId: "p08", playerName: "Harper", eventsPlayed: 4, seasonPoints: 30, rank: 9 },
  { playerId: "p09", playerName: "Indigo-Mae", eventsPlayed: 4, seasonPoints: 28, rank: 10 },
  { playerId: "p10", playerName: "Jordan", eventsPlayed: 4, seasonPoints: 28, rank: 10 },
];

function loadLeaderboardRows() {
  return getSeasonLeaderboardRows({
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
}

function renderEmptyRow() {
  return createElement(
    "tr",
    { key: "empty" },
    createElement("td", { colSpan: 4 }, "No leaderboard entries yet.")
  );
}

function renderLeaderboardRow(row, rank) {
  return createElement(
    "tr",
    { key: row.playerId },
    createElement("td", null, rank),
    createElement("td", null, row.playerName),
    createElement("td", null, row.eventsPlayed),
    createElement("td", null, row.seasonPoints)
  );
}

function getSharedRanks(rows) {
  let lastPoints = null;
  let lastRank = 0;

  return rows.map((row, index) => {
    if (row.seasonPoints === lastPoints) {
      return lastRank;
    }

    lastPoints = row.seasonPoints;
    lastRank = index + 1;
    return lastRank;
  });
}

function renderBodyRows(rows, demoMode) {
  if (rows.length === 0) {
    return [renderEmptyRow()];
  }

  const computedRanks = getSharedRanks(rows);

  return rows.map((row, index) => {
    const rank = demoMode && row.rank != null ? row.rank : computedRanks[index];
    return renderLeaderboardRow(row, rank);
  });
}

export default function HomePage({ loadRows = loadLeaderboardRows, searchParams = {} } = {}) {
  const demoMode = searchParams.demo === "1";
  const rows = demoMode ? DEMO_ROWS : loadRows();
  const bodyRows = renderBodyRows(rows, demoMode);

  return createElement(
    "main",
      null,
      createElement("h1", null, "Bag Tag Leaderboard"),
      demoMode ? createElement("p", null, "Demo Data") : null,
      createElement(
      "table",
      null,
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { scope: "col" }, "Rank"),
          createElement("th", { scope: "col" }, "Player"),
          createElement("th", { scope: "col" }, "Events Played"),
          createElement("th", { scope: "col" }, "Season Points")
        )
      ),
      createElement("tbody", null, bodyRows)
    )
  );
}
