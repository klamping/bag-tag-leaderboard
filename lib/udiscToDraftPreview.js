function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapUdiscEventToDraftPreview(raw) {
  const eventName = String(raw?.name || raw?.eventName || "").trim();
  const date = String(raw?.startDate || raw?.date || "").trim().slice(0, 10);
  const slug = slugify(raw?.slug || eventName);

  const fieldErrors = {};
  if (!eventName) fieldErrors.name = "Event name is required";
  if (!slug) fieldErrors.slug = "Event slug is required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fieldErrors.date = "Event date is required";

  const participants = Array.isArray(raw?.participants) ? raw.participants : [];
  const normalizedParticipants = participants.map((p) => ({
    playerName: String(p?.playerName || p?.name || "").trim(),
    externalPlayerId: String(p?.externalPlayerId || p?.playerId || p?.id || "").trim(),
    finishPlace: Number(p?.finishPlace || p?.place || 0),
  }));

  normalizedParticipants.forEach((participant, index) => {
    if (!participant.playerName) {
      fieldErrors[`participants_${index}_playerName`] = "Participant name is required";
    }
    if (!Number.isInteger(participant.finishPlace) || participant.finishPlace <= 0) {
      fieldErrors[`participants_${index}_finishPlace`] = "Participant place is required";
    }
  });

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    preview: {
      event: {
        name: eventName,
        slug,
        date,
        isMajor: Boolean(raw?.isMajor || raw?.major),
        notes: "",
      },
      participants: normalizedParticipants,
    },
  };
}

module.exports = {
  mapUdiscEventToDraftPreview,
};
