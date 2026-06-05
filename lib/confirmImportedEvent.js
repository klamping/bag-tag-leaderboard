const { scoreEvent } = require("./scoreEvent");
const { LEADERBOARD_SEASON } = require("./leaderboardQuery");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_MATCH_STATUSES = new Set(["matched", "unmatched", "ambiguous"]);

function isValidDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false;
  }

  const [yearString, monthString, dayString] = dateValue.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function normalizePreview(preview) {
  const event = {
    slug: String(preview?.event?.slug || "").trim().toLowerCase(),
    name: String(preview?.event?.name || "").trim(),
    date: String(preview?.event?.date || "").trim(),
    isMajor: preview?.event?.isMajor === true || preview?.event?.isMajor === "true",
    notes: String(preview?.event?.notes || "").trim(),
  };

  const participants = Array.isArray(preview?.participants)
    ? preview.participants.map((participant) => ({
        playerName: String(participant?.playerName || "").trim(),
        externalPlayerId: String(participant?.externalPlayerId || "").trim(),
        finishPlace: participant?.finishPlace,
        matchStatus: String(participant?.matchStatus || "").trim(),
        matchedPlayerId: String(participant?.matchedPlayerId || "").trim(),
        matchedPlayerName: String(participant?.matchedPlayerName || "").trim(),
        startingTag: participant?.startingTag,
      }))
    : [];

  return { event, participants };
}

function getFieldErrors(normalized) {
  const fieldErrors = {};

  if (!normalized.event.slug) {
    fieldErrors.slug = "Slug is required";
  } else if (!SLUG_PATTERN.test(normalized.event.slug)) {
    fieldErrors.slug = "Slug format is invalid";
  }

  if (!normalized.event.name) {
    fieldErrors.name = "Name is required";
  }

  if (!normalized.event.date) {
    fieldErrors.date = "Date is required";
  } else if (!isValidDate(normalized.event.date)) {
    fieldErrors.date = "Date is invalid";
  }

  const indexesByStartingTag = new Map();

  normalized.participants.forEach((participant, index) => {
    if (!participant.playerName) {
      fieldErrors[`participants_${index}_playerName`] = "Player name is required";
    }

    if (!Number.isInteger(participant.finishPlace) || participant.finishPlace < 1) {
      fieldErrors[`participants_${index}_finishPlace`] =
        "Finish place must be an integer greater than or equal to 1";
    }

    if (!VALID_MATCH_STATUSES.has(participant.matchStatus)) {
      fieldErrors[`participants_${index}_matchStatus`] = "Match status is invalid";
      return;
    }

    if (participant.matchStatus === "matched") {
      if (!participant.matchedPlayerId) {
        fieldErrors[`participants_${index}_matchedPlayerId`] = "Matched player is required";
      }

      if (!Number.isInteger(participant.startingTag) || participant.startingTag < 1) {
        fieldErrors[`participants_${index}_startingTag`] =
          "Starting tag must be an integer greater than or equal to 1";
      } else {
        const indexes = indexesByStartingTag.get(participant.startingTag) || [];
        indexes.push(index);
        indexesByStartingTag.set(participant.startingTag, indexes);
      }
    }

    if (participant.matchStatus === "ambiguous") {
      fieldErrors[`participants_${index}_matchStatus`] =
        "Imported player could not be uniquely matched to a returning player";
    }
  });

  for (const indexes of indexesByStartingTag.values()) {
    if (indexes.length < 2) continue;
    indexes.forEach((index) => {
      fieldErrors[`participants_${index}_startingTag`] = "Starting tags must be unique";
    });
  }

  return fieldErrors;
}

async function attemptRollback(rollbackErrors, rollbackFn, ids) {
  if (typeof rollbackFn !== "function") {
    return;
  }

  for (let index = ids.length - 1; index >= 0; index -= 1) {
    try {
      await rollbackFn(ids[index]);
    } catch (error) {
      rollbackErrors.push({ id: ids[index], error });
    }
  }
}

async function confirmImportedEvent({
  preview,
  findExistingEventBySlug,
  insertPlayer,
  rollbackPlayer,
  insertConfirmedEvent,
  rollbackConfirmedEvent,
  insertEventResult,
  rollbackEventResult,
  insertEventPoint,
  rollbackEventPoint,
  scoreEventFn = scoreEvent,
}) {
  const normalized = normalizePreview(preview);
  const fieldErrors = getFieldErrors(normalized);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const existing = await findExistingEventBySlug(normalized.event.slug);
  if (existing) {
    return {
      ok: false,
      fieldErrors: {
        slug: "Slug is already in use",
      },
    };
  }

  const provisionalParticipants = normalized.participants.map((participant, index) => {
    if (participant.matchStatus === "matched") {
      return {
        playerName: participant.playerName,
        externalPlayerId: participant.externalPlayerId,
        finishPlace: participant.finishPlace,
        matchStatus: participant.matchStatus,
        matchedPlayerId: participant.matchedPlayerId,
        matchedPlayerName: participant.matchedPlayerName,
        startingTag: participant.startingTag,
        playerId: participant.matchedPlayerId,
      };
    }

    return {
      playerName: participant.playerName,
      externalPlayerId: participant.externalPlayerId,
      finishPlace: participant.finishPlace,
      matchStatus: participant.matchStatus,
      playerId: `new_player_${index}`,
    };
  });

  const scoringParticipants = provisionalParticipants.map((participant) => {
    const scoringParticipant = {
      playerId: participant.playerId,
      finishPlace: participant.finishPlace,
    };

    if (participant.matchStatus === "matched") {
      scoringParticipant.startingTag = participant.startingTag;
    }

    return scoringParticipant;
  });

  const scoredRows = await scoreEventFn({
    isMajor: normalized.event.isMajor,
    participants: scoringParticipants,
  });

  const actualPlayerIdByProvisionalId = new Map();
  const resolvedParticipants = [];
  const insertedPlayerIds = [];
  const insertedResultIds = [];
  const insertedPointIds = [];
  let insertedEvent = null;

  try {
    for (const participant of provisionalParticipants) {
      if (participant.matchStatus === "matched") {
        actualPlayerIdByProvisionalId.set(participant.playerId, participant.playerId);
        resolvedParticipants.push(participant);
        continue;
      }

      const insertedPlayer = await insertPlayer({ name: participant.playerName });
      insertedPlayerIds.push(insertedPlayer.id);
      actualPlayerIdByProvisionalId.set(participant.playerId, insertedPlayer.id);
      resolvedParticipants.push({
        ...participant,
        playerId: insertedPlayer.id,
      });
    }

    insertedEvent = await insertConfirmedEvent({
      slug: normalized.event.slug,
      name: normalized.event.name,
      eventDate: normalized.event.date,
      isMajor: normalized.event.isMajor,
      notes: normalized.event.notes,
      status: "confirmed",
      season: LEADERBOARD_SEASON,
    });

    const resultIdByPlayerId = new Map();
    for (const participant of resolvedParticipants) {
      const insertedResult = await insertEventResult({
        eventId: insertedEvent.id,
        playerId: participant.playerId,
        finishPlace: participant.finishPlace,
        startingTag: participant.matchStatus === "matched" ? participant.startingTag : undefined,
      });
      insertedResultIds.push(insertedResult.id);
      resultIdByPlayerId.set(participant.playerId, insertedResult.id);
    }

    for (const scoredRow of scoredRows) {
      const actualPlayerId = actualPlayerIdByProvisionalId.get(scoredRow.playerId);
      const insertedPoint = await insertEventPoint({
        eventId: insertedEvent.id,
        eventResultId: resultIdByPlayerId.get(actualPlayerId),
        ...scoredRow,
        playerId: actualPlayerId,
      });

      if (insertedPoint?.id) {
        insertedPointIds.push(insertedPoint.id);
      }
    }
  } catch (error) {
    const rollbackErrors = [];

    await attemptRollback(rollbackErrors, rollbackEventPoint, insertedPointIds);
    await attemptRollback(rollbackErrors, rollbackEventResult, insertedResultIds);

    if (insertedEvent) {
      await attemptRollback(rollbackErrors, rollbackConfirmedEvent, [insertedEvent.id]);
    }

    await attemptRollback(rollbackErrors, rollbackPlayer, insertedPlayerIds);

    if (rollbackErrors.length > 0) {
      error.rollbackErrors = rollbackErrors;
    }

    throw error;
  }

  return {
    ok: true,
    event: insertedEvent,
    participants: resolvedParticipants,
  };
}

module.exports = {
  confirmImportedEvent,
};
