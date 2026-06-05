const test = require("node:test");
const assert = require("node:assert/strict");
const { reviewUdiscDraftPreview } = require("../lib/reviewUdiscDraftPreview.js");

test("reviewUdiscDraftPreview matches normalized returning players and accepts valid starting tags", () => {
  const result = reviewUdiscDraftPreview({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
      participants: [{ playerName: "  Alice   Smith ", externalPlayerId: "u1", finishPlace: 1 }],
    },
    knownPlayers: [{ id: "player_1", name: "alice smith" }],
    startingTagsByIndex: { 0: "7" },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.fieldErrors, {});
  assert.deepEqual(result.preview.participants, [
    {
      playerName: "Alice   Smith",
      externalPlayerId: "u1",
      finishPlace: 1,
      matchStatus: "matched",
      matchedPlayerId: "player_1",
      matchedPlayerName: "alice smith",
      startingTag: 7,
    },
  ]);
});

test("reviewUdiscDraftPreview leaves unmatched players without a tag requirement", () => {
  const result = reviewUdiscDraftPreview({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
      participants: [{ playerName: "New Person", externalPlayerId: "u2", finishPlace: 2 }],
    },
    knownPlayers: [{ id: "player_1", name: "Alice Smith" }],
    startingTagsByIndex: {},
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.preview.participants, [
    {
      playerName: "New Person",
      externalPlayerId: "u2",
      finishPlace: 2,
      matchStatus: "unmatched",
    },
  ]);
});

test("reviewUdiscDraftPreview fails closed on ambiguous player matches", () => {
  const result = reviewUdiscDraftPreview({
    preview: {
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
      participants: [{ playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1 }],
    },
    knownPlayers: [
      { id: "player_1", name: "Alice Smith" },
      { id: "player_2", name: "  alice   smith  " },
    ],
    startingTagsByIndex: {},
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.fieldErrors.participants_0_matchStatus,
    "Imported player could not be uniquely matched to a returning player"
  );
  assert.equal(result.preview.participants[0].matchStatus, "ambiguous");
});

test("reviewUdiscDraftPreview validates missing, invalid, and duplicate starting tags for matched players", () => {
  const preview = {
    event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
    participants: [
      { playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1 },
      { playerName: "Bob Jones", externalPlayerId: "u2", finishPlace: 2 },
      { playerName: "Cara Lane", externalPlayerId: "u3", finishPlace: 3 },
    ],
  };
  const knownPlayers = [
    { id: "player_1", name: "Alice Smith" },
    { id: "player_2", name: "Bob Jones" },
    { id: "player_3", name: "Cara Lane" },
  ];

  const missing = reviewUdiscDraftPreview({
    preview,
    knownPlayers,
    startingTagsByIndex: { 1: "4", 2: "5" },
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.fieldErrors.participants_0_startingTag, "Starting tag is required");

  const invalid = reviewUdiscDraftPreview({
    preview,
    knownPlayers,
    startingTagsByIndex: { 0: "abc", 1: "0", 2: "5" },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.fieldErrors.participants_0_startingTag, "Starting tag must be an integer");
  assert.equal(invalid.fieldErrors.participants_1_startingTag, "Starting tag must be at least 1");

  const duplicate = reviewUdiscDraftPreview({
    preview,
    knownPlayers,
    startingTagsByIndex: { 0: "7", 1: "7", 2: "9" },
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.fieldErrors.participants_0_startingTag, "Starting tags must be unique");
  assert.equal(duplicate.fieldErrors.participants_1_startingTag, "Starting tags must be unique");
});
