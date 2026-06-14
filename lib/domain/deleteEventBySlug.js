const { rebuildEventOrdering } = require("../data/rebuildEventOrdering");

function deleteEventBySlug({ store, slug }) {
  const event = store.events.items.find((entry) => entry.slug === slug);

  if (!event) {
    throw new Error(`Event with slug \"${slug}\" was not found`);
  }

  const nextEvents = rebuildEventOrdering(
    store.events.items.filter((entry) => entry.id !== event.id)
  );
  const nextResults = store.results.items.filter((result) => result.eventId !== event.id);

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
    deletedSnapshotPaths: [event.importPath],
  };
}

module.exports = {
  deleteEventBySlug,
};
