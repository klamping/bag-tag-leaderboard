const { getSeasonLeaderboardRows } = require("../leaderboardQuery");
const {
  listPublicEvents,
  getPublicEventScoreboardBySlug,
} = require("../publicEventsQuery");

function toPublicEvents(events) {
  return events.map((event) => ({
    ...event,
    confirmed: true,
    season: Number.parseInt(String(event.eventDate).slice(0, 4), 10),
  }));
}

function toPublicEventResults(results) {
  return results.map((result) => ({
    id: result.id,
    eventId: result.eventId,
    playerId: result.playerId,
    finishPlace: result.finishPlace,
    startingTag: result.startingTag,
  }));
}

function toPublicEventPoints(results) {
  return results.map((result) => ({
    eventResultId: result.id,
    attendance: result.attendancePoints,
    placement: result.placementPoints,
    startingTagBonus: result.startingTagBonusPoints,
    tagOneBonus: result.tagOneBonusPoints,
    beatYourTagBonus: result.beatYourTagBonusPoints,
    eventTotal: result.eventTotalPoints,
    points: result.eventTotalPoints,
  }));
}

function buildPublicModel(store) {
  const events = toPublicEvents(store.events.items);
  const eventResults = toPublicEventResults(store.results.items);
  const eventPoints = toPublicEventPoints(store.results.items);

  return {
    siteTitle: "Bag Tag Leaderboard",
    homepage: {
      leaderboardRows: getSeasonLeaderboardRows({
        players: store.players.items,
        events,
        eventResults,
        eventPoints,
      }),
      events: listPublicEvents({ events }),
    },
    eventPages: events.map((event) => {
      const page = getPublicEventScoreboardBySlug({
        slug: event.slug,
        players: store.players.items,
        events,
        eventResults,
        eventPoints,
      });

      return {
        ...page,
        isMajor: event.isMajor,
        udiscUrl: event.udiscUrl,
      };
    }),
  };
}

module.exports = {
  buildPublicModel,
};
