const { normalizePlayerName } = require("../data/normalizePlayerName");

function buildImportReviewState({ players = [], importedParticipants = [] }) {
  const knownPlayerNames = new Set(
    players.map((player) => normalizePlayerName(player?.name)).filter(Boolean)
  );

  return {
    rows: importedParticipants.map((participant) => {
      const playerName = String(participant?.playerName || "").trim();
      const didNotFinish = participant?.didNotFinish === true;

      return {
        playerName,
        matchStatus: knownPlayerNames.has(normalizePlayerName(playerName)) ? "existing" : "new",
        importedResult: didNotFinish ? "DNF" : participant?.finishPlace,
        reviewDecision: didNotFinish ? "dnf" : "keep",
        finishPlace: didNotFinish ? null : participant?.finishPlace,
        startingTag: null,
        didNotFinish,
      };
    }),
  };
}

module.exports = {
  buildImportReviewState,
};
