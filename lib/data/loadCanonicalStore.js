const { getCanonicalDataFilePaths } = require("./filePaths");
const { readJsonFile } = require("./readJsonFile");
const { validateCanonicalStore } = require("./validateCanonicalStore");

async function loadCanonicalStore(options = {}) {
  const filePaths = getCanonicalDataFilePaths(options);
  const store = {
    players: await readJsonFile(filePaths.players),
    events: await readJsonFile(filePaths.events),
    results: await readJsonFile(filePaths.results),
  };

  validateCanonicalStore(store);
  return store;
}

module.exports = {
  loadCanonicalStore,
};
