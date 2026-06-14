const path = require("node:path");

function resolveBaseDirectory(options = {}) {
  return options.baseDirectory || process.cwd();
}

function getCanonicalDataFilePaths(options = {}) {
  const baseDirectory = resolveBaseDirectory(options);
  const dataDirectory = path.join(baseDirectory, "data");

  return {
    baseDirectory,
    dataDirectory,
    players: path.join(dataDirectory, "players.json"),
    events: path.join(dataDirectory, "events.json"),
    results: path.join(dataDirectory, "results.json"),
    importsDirectory: path.join(dataDirectory, "imports"),
  };
}

module.exports = {
  resolveBaseDirectory,
  getCanonicalDataFilePaths,
};
