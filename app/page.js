import leaderboardQuery from "../lib/leaderboardQuery.js";
import { createElement } from "react";
import demoLeaderboard from "../lib/demoLeaderboard.js";

const { getSeasonLeaderboardRows } = leaderboardQuery;
const { scoreDemoSeason } = demoLeaderboard;

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
    const rank = computedRanks[index];
    return renderLeaderboardRow(row, rank);
  });
}

export default function HomePage({ loadRows = loadLeaderboardRows, searchParams = {} } = {}) {
  const demoMode = searchParams.demo === "1";
  const rows = demoMode ? scoreDemoSeason().leaderboardRows : loadRows();
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
