import { createElement } from "react";
import { notFound } from "next/navigation.js";
import publicEventsQuery from "../../../lib/publicEventsQuery.js";
import demoLeaderboard from "../../../lib/demoLeaderboard.js";

const { getPublicEventScoreboardBySlug } = publicEventsQuery;
const { scoreDemoSeason, DEMO_PLAYERS } = demoLeaderboard;

function loadEventScoreboard({ slug }) {
  return getPublicEventScoreboardBySlug({
    slug,
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
}

function loadDemoEventScoreboard({ slug }) {
  const { scoredEvents } = scoreDemoSeason();
  const nameById = new Map(DEMO_PLAYERS.map((player) => [player.id, player.name]));
  const event = scoredEvents.find((entry) => entry.id === slug);
  if (!event) {
    return null;
  }

  return {
    slug: event.id,
    name: event.label,
    eventDate: "2026-01-01",
    scoreboard: event.rows.map((row) => ({
      ...row,
      playerName: nameById.get(row.playerId) || row.playerId,
      startingTag: event.startingTagByPlayerId.get(row.playerId) ?? null,
      eventResult: event.finishPlaceByPlayerId.get(row.playerId) ?? null,
    })),
  };
}

function renderScoreRow(row) {
  return createElement(
    "tr",
    { key: row.playerId },
    createElement("td", null, row.playerName),
    createElement("td", null, row.startingTag),
    createElement("td", null, row.attendance),
    createElement("td", null, row.eventResult),
    createElement("td", null, row.placement),
    createElement("td", null, row.startingTagBonus),
    createElement("td", null, row.tagOneBonus),
    createElement("td", null, row.beatYourTagBonus),
    createElement("td", null, row.eventTotal)
  );
}

export default function EventScoreboardPage({
  params = {},
  loadEvent = loadEventScoreboard,
  notFoundHandler = notFound,
  searchParams = {},
} = {}) {
  const event = searchParams.demo === "1" ? loadDemoEventScoreboard({ slug: params.slug }) : loadEvent({ slug: params.slug });

  if (!event) {
    notFoundHandler();
    return null;
  }

  return createElement(
    "main",
    null,
    createElement("h1", null, event.name),
    createElement(
      "table",
      null,
      createElement(
        "thead",
        null,
        createElement(
          "tr",
          null,
          createElement("th", { scope: "col" }, "Player"),
          createElement("th", { scope: "col" }, "Starting Tag"),
          createElement("th", { scope: "col" }, "Attendance"),
          createElement("th", { scope: "col" }, "Event Result"),
          createElement("th", { scope: "col" }, "Placement"),
          createElement("th", { scope: "col" }, "Starting Tag Bonus"),
          createElement("th", { scope: "col" }, "Tag #1 Bonus"),
          createElement("th", { scope: "col" }, "Beat Your Tag Bonus"),
          createElement("th", { scope: "col" }, "Event Total")
        )
      ),
      createElement(
        "tbody",
        null,
        event.scoreboard.length === 0
          ? createElement(
              "tr",
              null,
              createElement("td", { colSpan: 9 }, "No scores posted for this event yet.")
            )
          : event.scoreboard.map(renderScoreRow)
      )
    )
  );
}
