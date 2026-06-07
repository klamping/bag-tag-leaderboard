const { isConfirmedEvent } = require("./isConfirmedEvent");

function compareStrings(a, b) {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

function normalizeConfirmedEvent(event) {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: event.eventDate,
    status: "confirmed",
    sourceType: "confirmed",
  };
}

function normalizeDraftEvent(event) {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: event.date,
    status: "draft",
    sourceType: "draft",
  };
}

function compareAdminEvents(a, b) {
  const dateSort = compareStrings(b.date, a.date);
  if (dateSort !== 0) {
    return dateSort;
  }

  const slugSort = compareStrings(a.slug, b.slug);
  if (slugSort !== 0) {
    return slugSort;
  }

  const sourceTypeSort = compareStrings(
    a.sourceType === "draft" ? "0" : "1",
    b.sourceType === "draft" ? "0" : "1"
  );
  if (sourceTypeSort !== 0) {
    return sourceTypeSort;
  }

  return compareStrings(a.id, b.id);
}

function listAdminEvents({ events, drafts }) {
  return [
    ...drafts.map(normalizeDraftEvent),
    ...events.filter(isConfirmedEvent).map(normalizeConfirmedEvent),
  ].sort(compareAdminEvents);
}

function getAdminEventBySlug({ slug, events, drafts }) {
  const draft = drafts.find((event) => event.slug === slug);
  if (draft) {
    return normalizeDraftEvent(draft);
  }

  const confirmed = events.find((event) => event.slug === slug && isConfirmedEvent(event));
  if (confirmed) {
    return normalizeConfirmedEvent(confirmed);
  }

  return null;
}

module.exports = {
  listAdminEvents,
  getAdminEventBySlug,
};
