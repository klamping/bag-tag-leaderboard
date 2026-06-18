module.exports = {
  permalink: ({ publicModel }) => {
    if (!publicModel.seasonLeaderboardImage) {
      return false;
    }

    return "season-leaderboard-image/index.html";
  },
};
