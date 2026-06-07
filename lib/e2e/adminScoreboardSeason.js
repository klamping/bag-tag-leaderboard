const PLAYWRIGHT_PLAYER_IDS_BY_NAME = {
  "Alice Example": "p1",
  "Bob Example": "p2",
  "Casey Example": "p3",
  "Dana Example": "p4",
};

function createFixtureEvent({ name, date, slug, participants, startingTagByName = {}, isMajor = false }) {
  return {
    name,
    date,
    slug,
    isMajor,
    participants,
    playerIdByName: PLAYWRIGHT_PLAYER_IDS_BY_NAME,
    startingTagByName,
  };
}

const PLAYWRIGHT_UDISC_FIXTURES_BY_SLUG = {
  "admin-scoreboard-spring-fling": createFixtureEvent({
    name: "Admin Scoreboard Spring Fling",
    date: "2026-04-18",
    slug: "admin-scoreboard-spring-fling",
    participants: [
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 1 },
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 2 },
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 3 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 4 },
    ],
  }),
  "admin-scoreboard-summer-sizzler": createFixtureEvent({
    name: "Admin Scoreboard Summer Sizzler",
    date: "2026-05-16",
    slug: "admin-scoreboard-summer-sizzler",
    startingTagByName: {
      "Alice Example": 1,
      "Bob Example": 2,
      "Casey Example": 3,
      "Dana Example": 4,
    },
    participants: [
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 1 },
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 2 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 3 },
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 4 },
    ],
  }),
  "admin-scoreboard-autumn-classic": createFixtureEvent({
    name: "Admin Scoreboard Autumn Classic",
    date: "2026-06-20",
    slug: "admin-scoreboard-autumn-classic",
    startingTagByName: {
      "Bob Example": 1,
      "Casey Example": 2,
      "Dana Example": 3,
      "Alice Example": 4,
    },
    participants: [
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 1 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 2 },
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 3 },
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 4 },
    ],
  }),
  "admin-scoreboard-finale": createFixtureEvent({
    name: "Admin Scoreboard Finale",
    date: "2026-07-18",
    slug: "admin-scoreboard-finale",
    startingTagByName: {
      "Casey Example": 1,
      "Dana Example": 2,
      "Alice Example": 3,
      "Bob Example": 4,
    },
    participants: [
      { playerName: "Alice Example", externalPlayerId: "fixture-player-1", finishPlace: 1 },
      { playerName: "Bob Example", externalPlayerId: "fixture-player-2", finishPlace: 2 },
      { playerName: "Casey Example", externalPlayerId: "fixture-player-3", finishPlace: 3 },
      { playerName: "Dana Example", externalPlayerId: "fixture-player-4", finishPlace: 4 },
    ],
  }),
};

function getAdminScoreboardSeasonFixture(leaderboardUrl) {
  const slugMatch = String(leaderboardUrl || "").match(/\/events\/([^/]+)\/leaderboard\/?/i);
  return slugMatch ? PLAYWRIGHT_UDISC_FIXTURES_BY_SLUG[slugMatch[1]] || null : null;
}

module.exports = {
  getAdminScoreboardSeasonFixture,
};
