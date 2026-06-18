function inferSeasonLabel(leaderboardEvents) {
  const firstEvent = leaderboardEvents[0];

  if (!firstEvent || !firstEvent.eventDate) {
    return "Season";
  }

  return `${firstEvent.eventDate.slice(0, 4)} Season`;
}

function buildSeasonLeaderboardImageModel(publicModel) {
  const homepage = publicModel.homepage || {};
  const leaderboardRows = homepage.leaderboardRows || [];
  const leaderboardEvents = homepage.leaderboardEvents || [];

  if (leaderboardRows.length === 0) {
    return null;
  }

  let previousSeasonPoints = null;
  let currentRank = 0;

  return {
    title: publicModel.siteTitle || "Bag Tag Leaderboard",
    subtitle: "Season Leaderboard",
    seasonLabel: inferSeasonLabel(leaderboardEvents),
    filename: "season-leaderboard.png",
    width: 1080,
    height: 1350,
    eventHeaders: leaderboardEvents.map((event) => ({
      eventSlug: event.slug,
      shortDate: event.shortDate,
    })),
    rows: leaderboardRows.map((row, index) => {
      if (row.seasonPoints !== previousSeasonPoints) {
        currentRank = index + 1;
        previousSeasonPoints = row.seasonPoints;
      }

      return {
        rank: currentRank,
        playerName: row.playerName,
        seasonPoints: row.seasonPoints,
        eventOverview: row.eventOverview.map((event) => ({
          eventSlug: event.eventSlug,
          points: event.points,
          played: event.played,
        })),
      };
    }),
  };
}

module.exports = {
  inferSeasonLabel,
  buildSeasonLeaderboardImageModel,
};
