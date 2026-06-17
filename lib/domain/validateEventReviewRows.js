const { parseCompetitionPlaces } = require("./parseCompetitionPlaces");

const VALID_REVIEW_DECISIONS = new Set(["keep", "dnf", "remove"]);

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value >= 1;
}

function validateEventReviewRows({ rows = [], bootstrap = false }) {
  const fieldErrors = {};
  const tagIndexes = new Map();
  const keepParticipants = [];

  rows.forEach((row, index) => {
    if (!VALID_REVIEW_DECISIONS.has(row?.reviewDecision)) {
      fieldErrors[`rows_${index}_reviewDecision`] = "Review decision is invalid";
      return;
    }

    if (row?.reviewDecision === "keep") {
      if (!isPositiveInteger(row?.finishPlace)) {
        fieldErrors[`rows_${index}_finishPlace`] =
          "Finish place must be an integer greater than or equal to 1";
      }

      if (bootstrap) {
        if (!isBlank(row?.startingTag)) {
          fieldErrors[`rows_${index}_startingTag`] =
            "Bootstrap rows must not include a starting tag";
        }
      } else if (!isPositiveInteger(row?.startingTag)) {
        fieldErrors[`rows_${index}_startingTag`] =
          "Starting tag must be an integer greater than or equal to 1";
      }

      if (!bootstrap && isPositiveInteger(row?.startingTag)) {
        const indexes = tagIndexes.get(row.startingTag) || [];
        indexes.push(index);
        tagIndexes.set(row.startingTag, indexes);
      }

      if (isPositiveInteger(row?.finishPlace)) {
        keepParticipants.push({ playerId: `row_${index}`, finishPlace: row.finishPlace });
      }
    }

    if (row?.reviewDecision === "dnf") {
      if (row?.finishPlace !== null) {
        fieldErrors[`rows_${index}_finishPlace`] = "DNF rows must not include a numeric finish place";
      }

      if (bootstrap) {
        if (!isBlank(row?.startingTag)) {
          fieldErrors[`rows_${index}_startingTag`] =
            "Bootstrap rows must not include a starting tag";
        }
      } else if (!isPositiveInteger(row?.startingTag)) {
        fieldErrors[`rows_${index}_startingTag`] =
          "Starting tag must be an integer greater than or equal to 1";
      } else {
        const indexes = tagIndexes.get(row.startingTag) || [];
        indexes.push(index);
        tagIndexes.set(row.startingTag, indexes);
      }
    }

    if (row?.reviewDecision === "remove") {
      if (row?.finishPlace !== null) {
        fieldErrors[`rows_${index}_finishPlace`] = "Removed rows must not include a finish place";
      }
      if (!isBlank(row?.startingTag)) {
        fieldErrors[`rows_${index}_startingTag`] = "Removed rows must not keep a starting tag";
      }
    }
  });

  for (const indexes of tagIndexes.values()) {
    if (indexes.length < 2) continue;
    indexes.forEach((index) => {
      fieldErrors[`rows_${index}_startingTag`] = "Starting tags must be unique across kept rows";
    });
  }

  if (keepParticipants.length === 0) {
    fieldErrors.rows_keep = "At least one kept row is required";
  } else {
    try {
      parseCompetitionPlaces(keepParticipants);
    } catch {
      fieldErrors.rows_competitionRanking = "Kept finish places must follow competition ranking";
    }
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

module.exports = {
  validateEventReviewRows,
};
