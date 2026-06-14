function compareEvents(a, b) {
  if (a.eventDate !== b.eventDate) {
    return b.eventDate.localeCompare(a.eventDate);
  }

  return a.slug.localeCompare(b.slug);
}

function rebuildEventOrdering(events) {
  return [...events].sort(compareEvents);
}

module.exports = {
  rebuildEventOrdering,
};
