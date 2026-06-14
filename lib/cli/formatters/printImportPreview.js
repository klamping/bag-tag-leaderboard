function printImportPreview({ event, rows, existingEvent }) {
  const action = existingEvent ? "Replace" : "Create";
  return [
    `${action} event: ${event.name}`,
    `Slug: ${event.slug}`,
    `Date: ${event.eventDate}`,
    `Major: ${event.isMajor ? "yes" : "no"}`,
    `Rows to save: ${rows.filter((row) => row.reviewDecision !== "remove").length}`,
  ].join("\n");
}

module.exports = {
  printImportPreview,
};
