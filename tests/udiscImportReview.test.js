const test = require("node:test");
const assert = require("node:assert/strict");

const { mapUdiscEventToImportReview } = require("../lib/udiscToImportReview.js");
const { buildImportReviewState } = require("../lib/domain/buildImportReviewState.js");
const { validateEventReviewRows } = require("../lib/domain/validateEventReviewRows.js");
const { createImportSnapshot } = require("../lib/domain/createImportSnapshot.js");

test("buildImportReviewState marks existing/new players by normalized name and defaults review decisions", () => {
  const reviewState = buildImportReviewState({
    players: [
      { id: "player_0001", name: "Jane Smith" },
      { id: "player_0002", name: "  Returning   Player  " },
    ],
    importedParticipants: [
      { playerName: "  jane   smith ", finishPlace: 1, didNotFinish: false },
      { playerName: "Returning Player", finishPlace: null, didNotFinish: true },
      { playerName: "Brand New", finishPlace: 3, didNotFinish: false },
    ],
  });

  assert.deepEqual(reviewState.rows, [
    {
      playerName: "jane   smith",
      matchStatus: "existing",
      importedResult: 1,
      reviewDecision: "keep",
      finishPlace: 1,
      startingTag: null,
      didNotFinish: false,
    },
    {
      playerName: "Returning Player",
      matchStatus: "existing",
      importedResult: "DNF",
      reviewDecision: "dnf",
      finishPlace: null,
      startingTag: null,
      didNotFinish: true,
    },
    {
      playerName: "Brand New",
      matchStatus: "new",
      importedResult: 3,
      reviewDecision: "keep",
      finishPlace: 3,
      startingTag: null,
      didNotFinish: false,
    },
  ]);
});

test("mapUdiscEventToImportReview normalizes event fields and attaches review rows", () => {
  const result = mapUdiscEventToImportReview({
    importedEvent: {
      name: "Spring Showdown",
      date: "2026-04-12",
      slug: "spring-showdown",
      isMajor: true,
      participants: [
        { playerName: "Jane Smith", finishPlace: 1, didNotFinish: false },
        { playerName: "John Doe", finishPlace: null, didNotFinish: true },
      ],
    },
    players: [{ id: "player_0001", name: "Jane Smith" }],
  });

  assert.deepEqual(result, {
    ok: true,
    review: {
      event: {
        name: "Spring Showdown",
        slug: "spring-showdown",
        eventDate: "2026-04-12",
        isMajor: true,
      },
      rows: [
        {
          playerName: "Jane Smith",
          matchStatus: "existing",
          importedResult: 1,
          reviewDecision: "keep",
          finishPlace: 1,
          startingTag: null,
          didNotFinish: false,
        },
        {
          playerName: "John Doe",
          matchStatus: "new",
          importedResult: "DNF",
          reviewDecision: "dnf",
          finishPlace: null,
          startingTag: null,
          didNotFinish: true,
        },
      ],
    },
  });
});

test("validateEventReviewRows enforces decision-specific row rules and keep-only competition ranking", () => {
  const invalid = validateEventReviewRows({
    rows: [
      { playerName: "Keep Missing Tag", reviewDecision: "keep", finishPlace: 1, startingTag: null },
      { playerName: "DNF Bad Finish", reviewDecision: "dnf", finishPlace: 2, startingTag: 5 },
      { playerName: "Remove With Tag", reviewDecision: "remove", finishPlace: null, startingTag: 9 },
      { playerName: "Keep Duplicate Tag", reviewDecision: "keep", finishPlace: 2, startingTag: 7 },
      { playerName: "DNF Duplicate Tag", reviewDecision: "dnf", finishPlace: null, startingTag: 7 },
      { playerName: "Keep Ranking Gap", reviewDecision: "keep", finishPlace: 4, startingTag: 8 },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.fieldErrors, {
    rows_0_startingTag: "Starting tag must be an integer greater than or equal to 1",
    rows_1_finishPlace: "DNF rows must not include a numeric finish place",
    rows_2_startingTag: "Removed rows must not keep a starting tag",
    rows_3_startingTag: "Starting tags must be unique across kept rows",
    rows_4_startingTag: "Starting tags must be unique across kept rows",
    rows_competitionRanking: "Kept finish places must follow competition ranking",
  });

  const valid = validateEventReviewRows({
    rows: [
      { playerName: "Winner", reviewDecision: "keep", finishPlace: 1, startingTag: 2 },
      { playerName: "Second", reviewDecision: "keep", finishPlace: 2, startingTag: 4 },
      { playerName: "DNF", reviewDecision: "dnf", finishPlace: null, startingTag: 1 },
      { playerName: "Removed", reviewDecision: "remove", finishPlace: null, startingTag: "" },
    ],
  });

  assert.deepEqual(valid, { ok: true, fieldErrors: {} });
});

test("validateEventReviewRows requires at least one kept row", () => {
  const result = validateEventReviewRows({
    rows: [
      { playerName: "DNF", reviewDecision: "dnf", finishPlace: null, startingTag: 9 },
      { playerName: "Removed", reviewDecision: "remove", finishPlace: null, startingTag: null },
    ],
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      rows_keep: "At least one kept row is required",
    },
  });
});

test("validateEventReviewRows rejects unknown review decisions", () => {
  const result = validateEventReviewRows({
    rows: [
      { playerName: "Mystery", reviewDecision: "maybe", finishPlace: 1, startingTag: 2 },
      { playerName: "Winner", reviewDecision: "keep", finishPlace: 1, startingTag: 1 },
    ],
  });

  assert.deepEqual(result, {
    ok: false,
    fieldErrors: {
      rows_0_reviewDecision: "Review decision is invalid",
    },
  });
});

test("createImportSnapshot emits the reviewed snapshot wrapper shape", () => {
  const snapshot = createImportSnapshot({
    slug: "spring-showdown",
    sourceUrl: "https://udisc.com/events/spring-showdown/leaderboard",
    fetchedAt: "2026-06-12T12:00:00.000Z",
    event: {
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      isMajor: false,
    },
    reviewedRows: [
      { playerName: "Jane Smith", finishPlace: 1, didNotFinish: false, reviewDecision: "keep" },
      { playerName: "John Doe", finishPlace: null, didNotFinish: true, reviewDecision: "dnf" },
      { playerName: "Removed Player", finishPlace: 7, didNotFinish: false, reviewDecision: "remove" },
    ],
  });

  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    data: {
      slug: "spring-showdown",
      source: {
        type: "udisc",
        url: "https://udisc.com/events/spring-showdown/leaderboard",
        fetchedAt: "2026-06-12T12:00:00.000Z",
      },
      event: {
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        isMajor: false,
      },
      participants: [
        { playerName: "Jane Smith", finishPlace: 1, didNotFinish: false, reviewDecision: "keep" },
        { playerName: "John Doe", finishPlace: null, didNotFinish: true, reviewDecision: "dnf" },
        { playerName: "Removed Player", finishPlace: null, didNotFinish: false, reviewDecision: "remove" },
      ],
    },
  });
});

test("createImportSnapshot rejects rows with unknown review decisions", () => {
  assert.throws(
    () =>
      createImportSnapshot({
        slug: "spring-showdown",
        sourceUrl: "https://udisc.com/events/spring-showdown/leaderboard",
        fetchedAt: "2026-06-12T12:00:00.000Z",
        event: {
          name: "Spring Showdown",
          eventDate: "2026-04-12",
          isMajor: false,
        },
        reviewedRows: [
          { playerName: "Jane Smith", finishPlace: 1, didNotFinish: false, reviewDecision: "keep" },
          { playerName: "Mystery", finishPlace: null, didNotFinish: false, reviewDecision: "maybe" },
        ],
      }),
    /review decision/i
  );
});
