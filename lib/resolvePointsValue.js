function toFiniteNumber(value) {
  if (value == null) {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}

function resolvePointsValue(eventPoint) {
  if (!eventPoint) {
    return 0;
  }

  const resolved =
    eventPoint.points ??
    eventPoint.eventTotal ??
    eventPoint.event_total_pts;

  return toFiniteNumber(resolved) ?? 0;
}

module.exports = {
  resolvePointsValue,
};
