const readline = require("node:readline/promises");

function formatRow(row) {
  return [
    row.playerName,
    row.matchStatus,
    row.importedResult,
    row.reviewDecision,
    row.finishPlace,
    row.startingTag,
  ].join(" | ");
}

function parseOptionalPositiveInteger(value, fallback = null) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  if (!/^\d+$/.test(normalized)) {
    return Number.NaN;
  }

  return Number(normalized);
}

async function reviewImportTable({ event, rows, session, input = process.stdin, output = process.stdout }) {
  let rl = null;
  const question = typeof session?.question === "function"
    ? (prompt) => session.question(prompt)
    : async (prompt) => {
        if (!rl) {
          rl = readline.createInterface({ input, output });
        }

        return rl.question(prompt);
      };

  output.write(`Reviewing import for ${event.name}\n`);
  const reviewedRows = [];

  try {
    for (const row of rows) {
      output.write(`${formatRow(row)}\n`);

      const decisionAnswer = (await question(`Decision [keep/dnf/remove] (${row.reviewDecision}): `)).trim().toLowerCase();
      const reviewDecision = decisionAnswer || row.reviewDecision;
      const reviewedRow = {
        ...row,
        reviewDecision,
      };

      if (reviewDecision === "keep") {
        const finishPlaceAnswer = await question(`Finish place [${row.finishPlace}]: `);
        reviewedRow.finishPlace = parseOptionalPositiveInteger(finishPlaceAnswer, row.finishPlace);
        const startingTagAnswer = await question(
          row.startingTag == null ? "Starting tag: " : `Starting tag [${row.startingTag}]: `
        );
        reviewedRow.startingTag = parseOptionalPositiveInteger(startingTagAnswer, row.startingTag);
      } else if (reviewDecision === "dnf") {
        reviewedRow.finishPlace = null;
        const startingTagAnswer = await question(
          row.startingTag == null ? "Starting tag: " : `Starting tag [${row.startingTag}]: `
        );
        reviewedRow.startingTag = parseOptionalPositiveInteger(startingTagAnswer, row.startingTag);
      } else if (reviewDecision === "remove") {
        reviewedRow.finishPlace = null;
        reviewedRow.startingTag = null;
      }

      reviewedRows.push(reviewedRow);
    }

    return reviewedRows;
  } finally {
    await rl?.close();
  }
}

module.exports = {
  reviewImportTable,
};
