function assertWrapper(wrapper, key) {
  if (!wrapper || typeof wrapper !== "object" || Array.isArray(wrapper)) {
    throw new Error(`${key} must be an object wrapper`);
  }

  if (wrapper.schemaVersion !== 1) {
    throw new Error(`${key} must have schemaVersion 1`);
  }

  if (!Array.isArray(wrapper.items)) {
    throw new Error(`${key} must have an items array`);
  }

  for (const [index, item] of wrapper.items.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${key} item ${index} must be an object`);
    }

    if (typeof item.id !== "string" || item.id.length === 0) {
      throw new Error(`${key} item ${index} id must be a string`);
    }
  }

  const seenIds = new Set();

  for (const item of wrapper.items) {
    if (seenIds.has(item.id)) {
      throw new Error(`${key} contains duplicate id ${item.id}`);
    }

    seenIds.add(item.id);
  }
}

function assertNonEmptyString(value, message) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }
}

function assertFiniteNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
}

function assertPositiveIntegerOrNull(value, message) {
  if (value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(message);
  }
}

function assertPositiveInteger(value, message) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(message);
  }
}

function compareEventsByDateAndSlug(a, b) {
  if (a.eventDate !== b.eventDate) {
    return a.eventDate.localeCompare(b.eventDate);
  }

  return a.slug.localeCompare(b.slug);
}

function validatePlayer(player) {
  assertNonEmptyString(player.name, `players item ${player.id} name must be a non-empty string`);
  assertNonEmptyString(player.createdAt, `players item ${player.id} createdAt must be a non-empty string`);
  assertNonEmptyString(player.updatedAt, `players item ${player.id} updatedAt must be a non-empty string`);
}

function validateEvent(event) {
  assertNonEmptyString(event.slug, `events item ${event.id} slug must be a non-empty string`);
  assertNonEmptyString(event.name, `events item ${event.id} name must be a non-empty string`);
  assertNonEmptyString(event.eventDate, `events item ${event.id} eventDate must be a non-empty string`);

  if (typeof event.isMajor !== "boolean") {
    throw new Error(`events item ${event.id} isMajor must be a boolean`);
  }

  assertNonEmptyString(event.udiscUrl, `events item ${event.id} udiscUrl must be a non-empty string`);
  assertNonEmptyString(event.importPath, `events item ${event.id} importPath must be a non-empty string`);

  if (!Array.isArray(event.resultIds)) {
    throw new Error(`events item ${event.id} resultIds must be an array`);
  }

  const seenResultIds = new Set();

  for (const resultId of event.resultIds) {
    assertNonEmptyString(resultId, `events item ${event.id} resultIds entries must be non-empty strings`);

    if (seenResultIds.has(resultId)) {
      throw new Error(`Event ${event.id} contains duplicate resultId ${resultId}`);
    }

    seenResultIds.add(resultId);
  }

  assertNonEmptyString(event.createdAt, `events item ${event.id} createdAt must be a non-empty string`);
  assertNonEmptyString(event.updatedAt, `events item ${event.id} updatedAt must be a non-empty string`);
}

function validateResult(result, { allowNullStartingTag = false } = {}) {
  assertNonEmptyString(result.playerId, `Result ${result.id} playerId must be a string`);
  assertNonEmptyString(result.eventId, `Result ${result.id} eventId must be a string`);
  assertPositiveIntegerOrNull(result.finishPlace, `Result ${result.id} finishPlace must be an integer >= 1 or null`);

  if (allowNullStartingTag && result.startingTag === null) {
    // Bootstrap event: no prior tags exist yet.
  } else {
    assertPositiveInteger(result.startingTag, `Result ${result.id} startingTag must be an integer >= 1`);
  }

  assertFiniteNumber(result.attendancePoints, `Result ${result.id} attendancePoints must be a finite number`);
  assertFiniteNumber(result.placementPoints, `Result ${result.id} placementPoints must be a finite number`);
  assertFiniteNumber(result.startingTagBonusPoints, `Result ${result.id} startingTagBonusPoints must be a finite number`);
  assertFiniteNumber(result.tagOneBonusPoints, `Result ${result.id} tagOneBonusPoints must be a finite number`);
  assertFiniteNumber(result.beatYourTagBonusPoints, `Result ${result.id} beatYourTagBonusPoints must be a finite number`);
  assertFiniteNumber(result.eventTotalPoints, `Result ${result.id} eventTotalPoints must be a finite number`);
  assertNonEmptyString(result.createdAt, `Result ${result.id} createdAt must be a non-empty string`);
  assertNonEmptyString(result.updatedAt, `Result ${result.id} updatedAt must be a non-empty string`);
}

function validateCanonicalStore(store) {
  if (!store || typeof store !== "object" || Array.isArray(store)) {
    throw new Error("canonical store must be an object");
  }

  assertWrapper(store.players, "players");
  assertWrapper(store.events, "events");
  assertWrapper(store.results, "results");

  for (const player of store.players.items) {
    validatePlayer(player);
  }

  for (const event of store.events.items) {
    validateEvent(event);
  }

  const earliestEvent = [...store.events.items].sort(compareEventsByDateAndSlug)[0] || null;
  const earliestEventId = earliestEvent?.id || null;

  const seenEventSlugs = new Set();
  for (const event of store.events.items) {
    if (seenEventSlugs.has(event.slug)) {
      throw new Error(`events contains duplicate slug ${event.slug}`);
    }

    seenEventSlugs.add(event.slug);
  }

  for (const result of store.results.items) {
    validateResult(result, { allowNullStartingTag: result.eventId === earliestEventId });
  }

  const playerIds = new Set(store.players.items.map((player) => player?.id));
  const eventIds = new Set(store.events.items.map((event) => event?.id));
  const resultIds = new Set(store.results.items.map((result) => result?.id));
  const resultsById = new Map(store.results.items.map((result) => [result.id, result]));
  const eventResultIdsByEventId = new Map(store.events.items.map((event) => [event.id, new Set(event.resultIds)]));

  for (const event of store.events.items) {
    for (const resultId of event.resultIds) {
      if (!resultIds.has(resultId)) {
        throw new Error(`Event ${event.id} references missing result ${resultId}`);
      }

      const result = resultsById.get(resultId);
      if (result.eventId !== event.id) {
        throw new Error(`Event ${event.id} lists result ${resultId} but it belongs to event ${result.eventId}`);
      }
    }
  }

  for (const result of store.results.items) {
    if (!playerIds.has(result?.playerId)) {
      throw new Error(`Result ${result?.id || "<unknown>"} references missing player ${result?.playerId}`);
    }

    if (!eventIds.has(result?.eventId)) {
      throw new Error(`Result ${result?.id || "<unknown>"} references missing event ${result?.eventId}`);
    }

    if (!eventResultIdsByEventId.get(result.eventId)?.has(result.id)) {
      throw new Error(`Result ${result.id} references event ${result.eventId} but is missing from that event's resultIds`);
    }
  }
}

module.exports = {
  validateCanonicalStore,
};
