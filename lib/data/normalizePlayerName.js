function normalizePlayerName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = {
  normalizePlayerName,
};
