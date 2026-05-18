const LEADERBOARD_SEASON = 2026;

function getSeasonLeaderboardRows({ players, events, eventResults, eventPoints }) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const confirmedSeasonEventIds = new Set(
    events
      .filter((event) => event.season === LEADERBOARD_SEASON && event.confirmed === true)
      .map((event) => event.id)
  );
  const pointsByResultId = new Map(
    eventPoints.map((eventPoint) => [eventPoint.eventResultId, eventPoint.points])
  );

  const aggregates = new Map();

  for (const result of eventResults) {
    if (!confirmedSeasonEventIds.has(result.eventId)) {
      continue;
    }

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
    row.seasonPoints += pointsByResultId.get(result.id) || 0;
    aggregates.set(result.playerId, row);
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
