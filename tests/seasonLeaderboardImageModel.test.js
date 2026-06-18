const test = require("node:test");
const assert = require("node:assert/strict");

const { buildPublicModel } = require("../lib/domain/buildPublicModel");
const {
  buildSeasonLeaderboardImageModel,
} = require("../lib/domain/buildSeasonLeaderboardImageModel");

function createStore() {
  return {
    players: {
      schemaVersion: 1,
      items: [
        {
          id: "player_0001",
          name: "Alice Smith",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "player_0002",
          name: "Bob Jones",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
    events: {
      schemaVersion: 1,
      items: [
        {
          id: "event_0001",
          slug: "spring-showdown",
          name: "Spring Showdown",
          eventDate: "2026-04-12",
          isMajor: false,
          udiscUrl: "https://udisc.com/events/spring-showdown",
          importPath: "data/imports/spring-showdown.json",
          resultIds: ["result_0001", "result_0002"],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
    results: {
      schemaVersion: 1,
      items: [
        {
          id: "result_0001",
          eventId: "event_0001",
          playerId: "player_0001",
          finishPlace: 1,
          startingTag: 2,
          attendancePoints: 2,
          placementPoints: 8,
          startingTagBonusPoints: 0,
          tagOneBonusPoints: 0,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 10,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "result_0002",
          eventId: "event_0001",
          playerId: "player_0002",
          finishPlace: null,
          startingTag: 1,
          attendancePoints: 2,
          placementPoints: 0,
          startingTagBonusPoints: 1,
          tagOneBonusPoints: 2,
          beatYourTagBonusPoints: 0,
          eventTotalPoints: 5,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    },
  };
}

test("buildSeasonLeaderboardImageModel maps the homepage leaderboard into the export view model", () => {
  const publicModel = buildPublicModel(createStore());

  assert.deepEqual(buildSeasonLeaderboardImageModel(publicModel), {
    title: "Bag Tag Leaderboard",
    subtitle: "Season Leaderboard",
    seasonLabel: "2026 Season",
    filename: "season-leaderboard.png",
    width: 960,
    height: 1350,
    eventHeaders: [{ eventSlug: "spring-showdown", shortDate: "4/12" }],
    rows: [
      {
        rank: 1,
        playerName: "Alice Smith",
        seasonPoints: 10,
        eventOverview: [{ eventSlug: "spring-showdown", points: 10, played: true }],
      },
      {
        rank: 2,
        playerName: "Bob Jones",
        seasonPoints: 2,
        eventOverview: [{ eventSlug: "spring-showdown", points: 2, played: true }],
      },
    ],
  });
});

test("buildSeasonLeaderboardImageModel returns null when the homepage leaderboard is empty", () => {
  const publicModel = buildPublicModel(createStore());

  publicModel.homepage.leaderboardRows = [];

  assert.equal(buildSeasonLeaderboardImageModel(publicModel), null);
});

test("buildSeasonLeaderboardImageModel assigns the same rank to tied season totals", () => {
  const publicModel = buildPublicModel(createStore());

  publicModel.homepage.leaderboardRows[1].seasonPoints = 10;

  const imageModel = buildSeasonLeaderboardImageModel(publicModel);

  assert.equal(imageModel.rows[0].seasonPoints, 10);
  assert.equal(imageModel.rows[1].seasonPoints, 10);
  assert.equal(imageModel.rows[0].rank, 1);
  assert.equal(imageModel.rows[1].rank, 1);
});
