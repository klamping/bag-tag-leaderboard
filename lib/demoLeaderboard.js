const { scoreEvent } = require("./scoreEvent");
const { assignStartingTagsForSeason } = require("./tagAssignments");

const DEMO_PLAYERS = [
  { id: "p1", name: "Alex" },
  { id: "p2", name: "Blair" },
  { id: "p3", name: "Casey" },
  { id: "p4", name: "Devon" },
  { id: "p5", name: "Elliot" },
  { id: "p6", name: "Frankie" },
  { id: "p7", name: "Gray" },
  { id: "p8", name: "Harper" },
  { id: "p9", name: "Indy" },
  { id: "p10", name: "Jules" },
];

const DEMO_FIXTURE_EVENTS = [
  {
    id: "e1",
    label: "initial-no-tags",
    isMajor: false,
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
      { playerId: "p3", finishPlace: 3 },
      { playerId: "p4", finishPlace: 4 },
      { playerId: "p5", finishPlace: 5 },
      { playerId: "p6", finishPlace: 6 },
      { playerId: "p7", finishPlace: 7 },
    ],
  },
  {
    id: "e1b",
    label: "post-initial-weekly",
    isMajor: false,
    participants: [
      { playerId: "p1", finishPlace: 2 },
      { playerId: "p2", finishPlace: 1 },
      { playerId: "p3", finishPlace: 4 },
      { playerId: "p4", finishPlace: 3 },
      { playerId: "p5", finishPlace: 5 },
      { playerId: "p6", finishPlace: 6 },
      { playerId: "p7", finishPlace: 7 },
    ],
  },
  {
    id: "e2",
    label: "major-doubled",
    isMajor: true,
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 4 },
      { playerId: "p2", finishPlace: 3, startingTag: 1 },
      { playerId: "p3", finishPlace: 2, startingTag: 2 },
      { playerId: "p4", finishPlace: 4, startingTag: 3 },
      { playerId: "p5", finishPlace: 5, startingTag: 5 },
      { playerId: "p6", finishPlace: 6, startingTag: 6 },
      { playerId: "p7", finishPlace: 7, startingTag: 7 },
    ],
  },
  {
    id: "e2b",
    label: "post-major-weekly",
    isMajor: false,
    participants: [
      { playerId: "p2", finishPlace: 1, startingTag: 1 },
      { playerId: "p1", finishPlace: 2, startingTag: 2 },
      { playerId: "p3", finishPlace: 3, startingTag: 3 },
      { playerId: "p4", finishPlace: 4, startingTag: 4 },
      { playerId: "p5", finishPlace: 5, startingTag: 5 },
      { playerId: "p6", finishPlace: 6, startingTag: 6 },
      { playerId: "p7", finishPlace: 7, startingTag: 7 },
    ],
  },
  {
    id: "e3",
    label: "normal-mixed-participation",
    isMajor: false,
    participants: [
      { playerId: "p3", finishPlace: 1, startingTag: 1 },
      { playerId: "p1", finishPlace: 2, startingTag: 2 },
      { playerId: "p2", finishPlace: 4, startingTag: 3 },
      { playerId: "p4", finishPlace: 4, startingTag: 4 },
      { playerId: "p5", finishPlace: 3, startingTag: 5 },
      { playerId: "p8", finishPlace: 5 },
      { playerId: "p9", finishPlace: 6 },
      { playerId: "p10", finishPlace: 7 },
    ],
  },
];

function scoreDemoSeason() {
  const nameById = new Map(DEMO_PLAYERS.map((player) => [player.id, player.name]));
  const aggregateByPlayerId = new Map();

  const seasonEvents = assignStartingTagsForSeason(DEMO_FIXTURE_EVENTS);

  const scoredEvents = seasonEvents.map((event, index) => {
    const rows = scoreEvent({ isMajor: event.isMajor, participants: event.participants });
    const originalEvent = DEMO_FIXTURE_EVENTS[index];
    const hasExplicitStartingTags = originalEvent.participants.some(
      (participant) => Number.isInteger(participant.startingTag) && participant.startingTag >= 1
    );
    const normalizedRows = hasExplicitStartingTags
      ? rows
      : rows.map((row) => {
          const subtotal = row.subtotal - row.tagOneBonus;
          return {
            ...row,
            tagOneBonus: 0,
            subtotal,
            eventTotal: subtotal * row.multiplier,
          };
        });
    const startingTagByPlayerId = new Map(
      event.participants.map((participant) => [participant.playerId, participant.startingTag])
    );
    const finishPlaceByPlayerId = new Map(
      event.participants.map((participant) => [participant.playerId, participant.finishPlace])
    );

    for (const row of normalizedRows) {
      const aggregate = aggregateByPlayerId.get(row.playerId) || {
        playerId: row.playerId,
        playerName: nameById.get(row.playerId) || row.playerId,
        eventsPlayed: 0,
        seasonPoints: 0,
      };
      aggregate.eventsPlayed += 1;
      aggregate.seasonPoints += row.eventTotal;
      aggregateByPlayerId.set(row.playerId, aggregate);
    }

    return {
      id: event.id,
      label: event.label,
      rows: normalizedRows,
      startingTagByPlayerId,
      finishPlaceByPlayerId,
    };
  });

  const leaderboardRows = [...aggregateByPlayerId.values()].sort((a, b) => {
    if (b.seasonPoints !== a.seasonPoints) {
      return b.seasonPoints - a.seasonPoints;
    }
    if (a.playerName !== b.playerName) {
      return a.playerName.localeCompare(b.playerName);
    }
    return a.playerId.localeCompare(b.playerId);
  });

  return { scoredEvents, leaderboardRows };
}

module.exports = {
  DEMO_PLAYERS,
  DEMO_FIXTURE_EVENTS,
  scoreDemoSeason,
};
