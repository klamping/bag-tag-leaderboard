const { parseCompetitionPlaces } = require("./domain/parseCompetitionPlaces");

const PLACEMENT_POINTS = {
  1: 8,
  2: 6,
  3: 5,
  4: 4,
};

function getPlacementPoints(finishPlace, fieldSize) {
  if (PLACEMENT_POINTS[finishPlace]) {
    return PLACEMENT_POINTS[finishPlace];
  }

  const topHalfCutoff = Math.ceil(fieldSize * 0.5);
  if (finishPlace <= topHalfCutoff) {
    return 2;
  }

  const topThreeQuarterCutoff = Math.ceil(fieldSize * 0.75);
  if (finishPlace <= topThreeQuarterCutoff) {
    return 1;
  }

  return 0;
}

function getStartingRankByIndex(participants) {
  const withTag = participants
    .map((participant, index) => ({ participant, index }))
    .filter(({ participant }) => Number.isInteger(participant.startingTag));
  const sorted = [...withTag].sort((a, b) => {
    if (a.participant.startingTag !== b.participant.startingTag) {
      return a.participant.startingTag - b.participant.startingTag;
    }

    if (a.participant.playerId !== b.participant.playerId) {
      return a.participant.playerId.localeCompare(b.participant.playerId);
    }

    return a.index - b.index;
  });

  const rankByIndex = new Map();
  let currentRank = 0;
  let previousTag = null;

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    if (entry.participant.startingTag !== previousTag) {
      currentRank = index + 1;
      previousTag = entry.participant.startingTag;
    }

    rankByIndex.set(entry.index, currentRank);
  }

  return rankByIndex;
}

function getStartingTagBonusByIndex(participants) {
  const withTag = participants
    .map((participant, index) => ({ participant, index }))
    .filter(({ participant }) => Number.isInteger(participant.startingTag));

  const countByTag = new Map();
  for (const { participant } of withTag) {
    countByTag.set(participant.startingTag, (countByTag.get(participant.startingTag) ?? 0) + 1);
  }

  const sortedTags = [...countByTag.keys()].sort((a, b) => a - b);
  const totalWithTag = withTag.length;
  let seen = 0;
  const greaterCountByTag = new Map();

  for (const tag of sortedTags) {
    const tagCount = countByTag.get(tag);
    greaterCountByTag.set(tag, totalWithTag - seen - tagCount);
    seen += tagCount;
  }

  const bonusByIndex = new Map();
  for (const { participant, index } of withTag) {
    bonusByIndex.set(index, Math.min(6, greaterCountByTag.get(participant.startingTag) ?? 0));
  }

  return bonusByIndex;
}

function validateDuplicateStartingTags(participants) {
  const participantsByStartingTag = new Map();

  for (const participant of participants) {
    if (!Number.isInteger(participant.startingTag)) {
      continue;
    }

    const withSameTag = participantsByStartingTag.get(participant.startingTag) ?? [];
    withSameTag.push(participant);
    participantsByStartingTag.set(participant.startingTag, withSameTag);
  }

  for (const [startingTag, withSameTag] of participantsByStartingTag) {
    if (withSameTag.length < 2) {
      continue;
    }

    const allAllowDuplicateStartingTag = withSameTag.every(
      (participant) => participant.allowsDuplicateStartingTag === true
    );

    if (!allAllowDuplicateStartingTag) {
      throw new Error(`Duplicate startingTag ${startingTag} requires explicit allowance`);
    }
  }
}

function validateParticipants(participants) {
  const seenPlayerIds = new Set();

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];

    if (participant === null || typeof participant !== "object") {
      throw new Error(`Participant at index ${index} must be an object`);
    }

    if (typeof participant.playerId !== "string" || participant.playerId.length === 0) {
      throw new Error(`Participant at index ${index} is missing required playerId`);
    }

    if (
      participant.finishPlace !== null &&
      (!Number.isInteger(participant.finishPlace) || participant.finishPlace < 1)
    ) {
      throw new Error(
        `Participant ${participant.playerId} has invalid finishPlace; expected integer >= 1 or null`
      );
    }

    if (participant.startingTag !== undefined && participant.startingTag !== null) {
      if (!Number.isInteger(participant.startingTag) || participant.startingTag < 1) {
        throw new Error(
          `Participant ${participant.playerId} has invalid startingTag; expected integer >= 1`
        );
      }
    }

    if (seenPlayerIds.has(participant.playerId)) {
      throw new Error(`Duplicate playerId "${participant.playerId}" in event participants`);
    }

    seenPlayerIds.add(participant.playerId);
  }

  validateDuplicateStartingTags(participants);
  parseCompetitionPlaces(participants);
}

function getBeatYourTagBonus(startingRank, finishPlace) {
  const improvement = startingRank - finishPlace;

  if (improvement >= 5) {
    return 3;
  }

  if (improvement >= 3) {
    return 2;
  }

  if (improvement >= 1) {
    return 1;
  }

  return 0;
}

/**
 * @param {{isMajor?: boolean, participants: Array<{playerId: string, finishPlace: number | null, startingTag?: number, allowsDuplicateStartingTag?: boolean}>}} event
 * @returns {Array<{
 *   playerId: string,
 *   attendance: number,
 *   placement: number,
 *   startingTagBonus: number,
 *   tagOneBonus: number,
 *   beatYourTagBonus: number,
 *   subtotal: number,
 *   multiplier: number,
 *   eventTotal: number,
 * }>}
 */
function scoreEvent(event) {
  const participants = Array.isArray(event?.participants) ? event.participants : [];
  validateParticipants(participants);
  const multiplier = event?.isMajor ? 2 : 1;
  const fieldSize = participants.length;
  const startingRankByIndex = getStartingRankByIndex(participants);
  const startingTagBonusByIndex = getStartingTagBonusByIndex(participants);

  return participants.map((participant, index) => {
    const attendance = 2;
    const finished = Number.isInteger(participant.finishPlace);
    const placement = finished ? getPlacementPoints(participant.finishPlace, fieldSize) : 0;

    const hasStartingTag = Number.isInteger(participant.startingTag);
    const startingTagBonus = hasStartingTag ? (startingTagBonusByIndex.get(index) ?? 0) : 0;

    const tagOneBonus = participant.startingTag === 1 ? 2 : 0;

    const startingRank = startingRankByIndex.get(index);
    const beatYourTagBonus = finished && hasStartingTag && Number.isInteger(startingRank)
      ? getBeatYourTagBonus(startingRank, participant.finishPlace)
      : 0;

    const subtotal =
      attendance + placement + startingTagBonus + tagOneBonus + beatYourTagBonus;
    const eventTotal = subtotal * multiplier;

    return {
      playerId: participant.playerId,
      attendance,
      placement,
      startingTagBonus,
      tagOneBonus,
      beatYourTagBonus,
      subtotal,
      multiplier,
      eventTotal,
    };
  });
}

module.exports = {
  scoreEvent,
};
