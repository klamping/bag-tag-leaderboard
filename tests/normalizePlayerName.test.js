const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizePlayerName } = require("../lib/data/normalizePlayerName");

test("data normalizePlayerName trims, lowercases, and collapses whitespace", () => {
  assert.equal(normalizePlayerName("  Alice   SMITH  "), "alice smith");
});
