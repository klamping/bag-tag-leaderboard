function normalizePlayerName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePreviewParticipant(participant) {
  return {
    playerName: String(participant?.playerName || "").trim(),
    externalPlayerId: String(participant?.externalPlayerId || "").trim(),
    finishPlace: participant?.finishPlace,
  };
}

function parseStartingTag(value) {
  const text = String(value || "").trim();

  if (!text) return { ok: false, message: "Starting tag is required" };
  if (!/^\d+$/.test(text)) return { ok: false, message: "Starting tag must be an integer" };

  const number = Number(text);
  if (number < 1) return { ok: false, message: "Starting tag must be at least 1" };

  return { ok: true, value: number };
}

function reviewUdiscDraftPreview({
  preview,
  knownPlayers = [],
  startingTagsByIndex = {},
  validateStartingTags = true,
}) {
  const fieldErrors = {};
  const matchesByNormalizedName = new Map();

  for (const player of knownPlayers) {
    const normalizedName = normalizePlayerName(player?.name);
    if (!normalizedName) continue;

    const matches = matchesByNormalizedName.get(normalizedName) || [];
    matches.push({
      id: player.id,
      name: String(player?.name || "").trim(),
    });
    matchesByNormalizedName.set(normalizedName, matches);
  }

  const participants = Array.isArray(preview?.participants) ? preview.participants : [];
  const reviewedParticipants = participants.map((participant, index) => {
    const reviewedParticipant = normalizePreviewParticipant(participant);
    const matches = matchesByNormalizedName.get(normalizePlayerName(reviewedParticipant.playerName)) || [];

    if (matches.length > 1) {
      fieldErrors[`participants_${index}_matchStatus`] =
        "Imported player could not be uniquely matched to a returning player";

      return {
        ...reviewedParticipant,
        matchStatus: "ambiguous",
      };
    }

    if (matches.length === 0) {
      return {
        ...reviewedParticipant,
        matchStatus: "unmatched",
      };
    }

    const startingTagValue = startingTagsByIndex[index] ?? participant?.startingTag;
    const startingTag = validateStartingTags
      ? parseStartingTag(startingTagValue)
      : { ok: false, value: startingTagValue ?? "" };

    if (validateStartingTags && !startingTag.ok) {
      fieldErrors[`participants_${index}_startingTag`] = startingTag.message;
    }

    return {
      ...reviewedParticipant,
      matchStatus: "matched",
      matchedPlayerId: matches[0].id,
      matchedPlayerName: matches[0].name,
      startingTag: startingTag.ok ? startingTag.value : String(startingTag.value || "").trim(),
    };
  });

  const indexesByStartingTag = new Map();
  reviewedParticipants.forEach((participant, index) => {
    if (participant.matchStatus !== "matched" || !Number.isInteger(participant.startingTag)) {
      return;
    }

    const indexes = indexesByStartingTag.get(participant.startingTag) || [];
    indexes.push(index);
    indexesByStartingTag.set(participant.startingTag, indexes);
  });

  for (const indexes of indexesByStartingTag.values()) {
    if (indexes.length < 2) continue;
    indexes.forEach((index) => {
      fieldErrors[`participants_${index}_startingTag`] = "Starting tags must be unique";
    });
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    preview: {
      event: preview?.event || {},
      participants: reviewedParticipants,
    },
  };
}

module.exports = {
  normalizePlayerName,
  reviewUdiscDraftPreview,
};
