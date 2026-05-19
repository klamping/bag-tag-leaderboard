const LEADERBOARD_SEASON = 2026;
const { isConfirmedEvent } = require("./isConfirmedEvent");
const { resolvePointsValue } = require("./resolvePointsValue");

function getSeasonLeaderboardRows({ players, events, eventResults, eventPoints }) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const confirmedSeasonEventIds = new Set(
    events
      .filter((event) => event.season === LEADERBOARD_SEASON && isConfirmedEvent(event))
      .map((event) => event.id)
  );
  const pointsByResultId = new Map(eventPoints.map((eventPoint) => [eventPoint.eventResultId, eventPoint]));

  const aggregates = new Map();
  const winnerByEventId = new Map();

  for (const result of eventResults) {
    if (!confirmedSeasonEventIds.has(result.eventId)) {
      continue;
    }

    const player = playerById.get(result.playerId);
    if (!player) {
      continue;
    }

    const winnersByPlayerId = winnerByEventId.get(result.eventId) || new Map();
    const currentWinner = winnersByPlayerId.get(result.playerId);

    if (!currentWinner || result.id.localeCompare(currentWinner.id) < 0) {
      winnersByPlayerId.set(result.playerId, result);
    }

    winnerByEventId.set(result.eventId, winnersByPlayerId);
  }

  for (const winnersByPlayerId of winnerByEventId.values()) {
    for (const result of winnersByPlayerId.values()) {
      const player = playerById.get(result.playerId);
      if (!player) {
        continue;
      }

      const row = aggregates.get(result.playerId) || {
        playerId: result.playerId,
        playerName: player.name,
        eventsPlayed: 0,
        seasonPoints: 0,
      };

      row.eventsPlayed += 1;
      row.seasonPoints += resolvePointsValue(pointsByResultId.get(result.id));
      aggregates.set(result.playerId, row);
    }
  }

  return [...aggregates.values()].sort((a, b) => {
    if (b.seasonPoints !== a.seasonPoints) {
      return b.seasonPoints - a.seasonPoints;
    }

    if (a.playerName !== b.playerName) {
      return a.playerName.localeCompare(b.playerName);
    }

    return a.playerId.localeCompare(b.playerId);
  });
}

module.exports = {
  LEADERBOARD_SEASON,
  getSeasonLeaderboardRows,
};
