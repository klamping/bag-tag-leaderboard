const { buildImportReviewState } = require("./domain/buildImportReviewState");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapUdiscEventToImportReview({ importedEvent, players = [] }) {
  const name = String(importedEvent?.name || importedEvent?.eventName || "").trim();
  const eventDate = String(importedEvent?.eventDate || importedEvent?.date || "").trim().slice(0, 10);
  const slug = slugify(importedEvent?.slug || name);

  const fieldErrors = {};
  if (!name) fieldErrors.name = "Event name is required";
  if (!slug) fieldErrors.slug = "Event slug is required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) fieldErrors.eventDate = "Event date is required";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    review: {
      event: {
        name,
        slug,
        eventDate,
        isMajor: importedEvent?.isMajor === true,
      },
      rows: buildImportReviewState({
        players,
        importedParticipants: importedEvent?.participants,
      }).rows,
    },
  };
}

module.exports = {
  mapUdiscEventToImportReview,
};
