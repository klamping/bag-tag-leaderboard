const { isConfirmedEvent } = require("./isConfirmedEvent");
const { resolvePointsValue } = require("./resolvePointsValue");

function compareStrings(a, b) {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

function normalizeScoreNumber(value) {
  if (value == null) {
    return 0;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function listPublicEvents({ events }) {
  return events
    .filter((event) => isConfirmedEvent(event))
    .sort((a, b) => {
      const dateSort = compareStrings(b.eventDate, a.eventDate);
      if (dateSort !== 0) {
        return dateSort;
      }

      return compareStrings(a.slug, b.slug);
    })
    .map((event) => ({
      slug: event.slug,
      name: event.name,
      eventDate: event.eventDate,
    }));
}

function getPublicEventScoreboardBySlug({ slug, players, events, eventResults, eventPoints }) {
  const event = events.find((entry) => entry.slug === slug && isConfirmedEvent(entry));
  if (!event) {
    return null;
  }

  const playerById = new Map(players.map((player) => [player.id, player]));
  const pointsByResultId = new Map(eventPoints.map((eventPoint) => [eventPoint.eventResultId, eventPoint]));
  const winnerByPlayerId = new Map();

  for (const result of eventResults) {
    if (result.eventId !== event.id) {
      continue;
    }

    const currentWinner = winnerByPlayerId.get(result.playerId);
    if (!currentWinner || compareStrings(result.id, currentWinner.id) < 0) {
      winnerByPlayerId.set(result.playerId, result);
    }
  }

  const scoreboard = [...winnerByPlayerId.values()]
    .map((result) => {
      const points = pointsByResultId.get(result.id) || {};
      const player = playerById.get(result.playerId);

      return {
        playerId: result.playerId,
        playerName: player?.name || result.playerId,
        startingTag: result.startingTag,
        eventResult: result.finishPlace,
        attendance: normalizeScoreNumber(points.attendance),
        placement: normalizeScoreNumber(points.placement),
        startingTagBonus: normalizeScoreNumber(points.startingTagBonus),
        tagOneBonus: normalizeScoreNumber(points.tagOneBonus),
        beatYourTagBonus: normalizeScoreNumber(points.beatYourTagBonus),
        eventTotal: resolvePointsValue(points),
      };
    })
    .sort((a, b) => {
      if (b.eventTotal !== a.eventTotal) {
        return b.eventTotal - a.eventTotal;
      }

      if (a.playerName !== b.playerName) {
        return compareStrings(a.playerName, b.playerName);
      }

      return compareStrings(a.playerId, b.playerId);
    });

  return {
    slug: event.slug,
    name: event.name,
    eventDate: event.eventDate,
    scoreboard,
  };
}

module.exports = {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
};
