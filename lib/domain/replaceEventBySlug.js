const { scoreEvent } = require("../scoreEvent");
const { nextId } = require("../data/idGenerator");
const { rebuildEventOrdering } = require("../data/rebuildEventOrdering");

function assertCanonicalStartingTags(reviewedRows) {
  for (const reviewedRow of reviewedRows) {
    if (!Number.isInteger(reviewedRow.startingTag) || reviewedRow.startingTag < 1) {
      throw new Error(`Reviewed row for player ${reviewedRow.playerId} must include startingTag >= 1`);
    }
  }
}

function assertKnownPlayers(reviewedRows, players) {
  const playerIds = new Set(players.map((player) => player.id));

  for (const reviewedRow of reviewedRows) {
    if (!playerIds.has(reviewedRow.playerId)) {
      throw new Error(`Reviewed row playerId ${reviewedRow.playerId} does not exist in canonical players`);
    }
  }
}

function createResultRecords({ eventId, reviewedRows, existingResults, players, now, isMajor }) {
  assertCanonicalStartingTags(reviewedRows);
  assertKnownPlayers(reviewedRows, players);

  const scoredRows = scoreEvent({
    isMajor,
    participants: reviewedRows,
  });
  const idPool = existingResults.map((result) => ({ id: result.id }));
  const results = [];

  for (let index = 0; index < reviewedRows.length; index += 1) {
    const reviewedRow = reviewedRows[index];
    const scoredRow = scoredRows[index];
    const id = nextId(idPool, "result");
    idPool.push({ id });

    results.push({
      id,
      eventId,
      playerId: reviewedRow.playerId,
      finishPlace: reviewedRow.finishPlace,
      startingTag: reviewedRow.startingTag,
      attendancePoints: scoredRow.attendance,
      placementPoints: scoredRow.placement,
      startingTagBonusPoints: scoredRow.startingTagBonus,
      tagOneBonusPoints: scoredRow.tagOneBonus,
      beatYourTagBonusPoints: scoredRow.beatYourTagBonus,
      eventTotalPoints: scoredRow.eventTotal,
      createdAt: now,
      updatedAt: now,
    });
  }

  return results;
}

function replaceEventBySlug({ store, slug, eventInput, reviewedRows, now }) {
  const existingEvent = store.events.items.find((event) => event.slug === slug);

  if (!existingEvent) {
    throw new Error(`Event with slug \"${slug}\" was not found`);
  }

  const remainingResults = store.results.items.filter((result) => result.eventId !== existingEvent.id);
  const nextEventResults = createResultRecords({
    eventId: existingEvent.id,
    reviewedRows,
    existingResults: store.results.items,
    players: store.players.items,
    now,
    isMajor: eventInput.isMajor,
  });
  const nextEvent = {
    ...existingEvent,
    ...eventInput,
    id: existingEvent.id,
    slug: existingEvent.slug,
    createdAt: existingEvent.createdAt,
    updatedAt: now,
    resultIds: nextEventResults.map((result) => result.id),
  };
  const nextEvents = rebuildEventOrdering(
    store.events.items.map((event) => (event.id === existingEvent.id ? nextEvent : event))
  );
  const nextResults = [...remainingResults, ...nextEventResults];

  return {
    store: {
      players: store.players,
      events: {
        ...store.events,
        items: nextEvents,
      },
      results: {
        ...store.results,
        items: nextResults,
      },
    },
    event: nextEvent,
    resultIds: nextEvent.resultIds,
  };
}

module.exports = {
  replaceEventBySlug,
};
