const { validateEventReviewRows } = require("./validateEventReviewRows");

function createImportSnapshot({ slug, sourceUrl, fetchedAt, event, reviewedRows = [] }) {
  const validation = validateEventReviewRows({ rows: reviewedRows });
  if (!validation.ok) {
    const hasDecisionError = Object.keys(validation.fieldErrors).some((key) => key.endsWith("_reviewDecision"));
    if (hasDecisionError) {
      throw new Error("Import snapshot requires a valid review decision for every row");
    }
  }

  return {
    schemaVersion: 1,
    data: {
      slug,
      source: {
        type: "udisc",
        url: sourceUrl,
        fetchedAt,
      },
      event: {
        name: event?.name,
        eventDate: event?.eventDate,
        isMajor: event?.isMajor === true,
      },
      participants: reviewedRows.map((row) => ({
        playerName: row?.playerName,
        finishPlace: row?.reviewDecision === "keep" ? row?.finishPlace : null,
        didNotFinish: row?.reviewDecision === "dnf",
        reviewDecision: row?.reviewDecision,
      })),
    },
  };
}

module.exports = {
  createImportSnapshot,
};
