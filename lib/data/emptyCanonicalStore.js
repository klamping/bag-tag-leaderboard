function createEmptyWrapper() {
  return {
    schemaVersion: 1,
    items: [],
  };
}

function emptyCanonicalStore() {
  return {
    players: createEmptyWrapper(),
    events: createEmptyWrapper(),
    results: createEmptyWrapper(),
  };
}

module.exports = {
  emptyCanonicalStore,
};
