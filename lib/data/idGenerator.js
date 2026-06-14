function nextId(items, prefix) {
  let maxNumber = 0;

  for (const item of items) {
    const match = typeof item?.id === "string"
      ? item.id.match(new RegExp(`^${prefix}_(\\d+)$`))
      : null;

    if (!match) {
      continue;
    }

    maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return `${prefix}_${String(maxNumber + 1).padStart(4, "0")}`;
}

function nextNumber(items, prefix) {
  return Number(nextId(items, prefix).slice(prefix.length + 1));
}

module.exports = {
  nextId,
  nextNumber,
};
