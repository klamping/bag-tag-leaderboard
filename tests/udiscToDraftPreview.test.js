const test = require("node:test");
const assert = require("node:assert/strict");
const { mapUdiscEventToDraftPreview } = require("../lib/udiscToDraftPreview.js");

test("mapUdiscEventToDraftPreview normalizes valid payload", () => {
  const result = mapUdiscEventToDraftPreview({
    name: "Spring Showdown",
    startDate: "2026-04-12T10:00:00Z",
    participants: [{ name: "Alice", id: "p1", place: 1 }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.preview.event.slug, "spring-showdown");
  assert.equal(result.preview.event.date, "2026-04-12");
});

test("mapUdiscEventToDraftPreview returns deterministic field errors", () => {
  const result = mapUdiscEventToDraftPreview({ participants: [{ id: "p1", place: 0 }] });
  assert.equal(result.ok, false);
  assert.equal(result.fieldErrors.name, "Event name is required");
  assert.equal(result.fieldErrors.date, "Event date is required");
  assert.equal(result.fieldErrors.participants_0_playerName, "Participant name is required");
  assert.equal(result.fieldErrors.participants_0_finishPlace, "Participant place is required");
});
