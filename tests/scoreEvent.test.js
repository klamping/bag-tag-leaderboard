const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreEvent } = require("../lib/scoreEvent");

test("Attendance: awards 2 points for attending an event", () => {
  const scored = scoreEvent({ participants: [{ playerId: "p1", finishPlace: 1 }] });
  assert.equal(scored[0].attendance, 2);
});

test("Event Placement: awards 1st-4th fixed points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
      { playerId: "p3", finishPlace: 3 },
      { playerId: "p4", finishPlace: 4 },
    ],
  });

  assert.deepEqual(scored.map((row) => row.placement), [8, 6, 5, 4]);
});

test("Event Placement: top 50% and top 75% use ceil cutoffs", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
      { playerId: "p3", finishPlace: 3 },
      { playerId: "p4", finishPlace: 4 },
      { playerId: "p5", finishPlace: 5 },
      { playerId: "p6", finishPlace: 6 },
      { playerId: "p7", finishPlace: 7 },
    ],
  });

  assert.deepEqual(scored.map((row) => row.placement), [8, 6, 5, 4, 1, 1, 0]);
});

test("Ties: tied players at placement cutoff share same tier points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
      { playerId: "p3", finishPlace: 3 },
      { playerId: "p4", finishPlace: 3 },
      { playerId: "p5", finishPlace: 5 },
      { playerId: "p6", finishPlace: 6 },
    ],
  });

  assert.equal(scored[2].placement, 5);
  assert.equal(scored[3].placement, 5);
  assert.equal(scored[4].placement, 1);
});

test("Starting Tag Bonus: counts worse tags and caps at 6", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 1 },
      { playerId: "p2", finishPlace: 2, startingTag: 2 },
      { playerId: "p3", finishPlace: 3, startingTag: 3 },
      { playerId: "p4", finishPlace: 4, startingTag: 4 },
      { playerId: "p5", finishPlace: 5, startingTag: 5 },
      { playerId: "p6", finishPlace: 6, startingTag: 6 },
      { playerId: "p7", finishPlace: 7, startingTag: 7 },
      { playerId: "p8", finishPlace: 8, startingTag: 8 },
    ],
  });

  assert.equal(scored[0].startingTagBonus, 6);
  assert.equal(scored[1].startingTagBonus, 6);
  assert.equal(scored[7].startingTagBonus, 0);
});

test("Tag #1 Bonus: applies only when player starts with tag #1", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 1 },
      { playerId: "p2", finishPlace: 2, startingTag: 2 },
    ],
  });

  assert.deepEqual(scored.map((row) => row.tagOneBonus), [2, 0]);
});

test("Beat Your Tag Bonus: +1/+2/+3 thresholds follow improvement bands", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 6 },
      { playerId: "p2", finishPlace: 2, startingTag: 5 },
      { playerId: "p3", finishPlace: 3, startingTag: 4 },
      { playerId: "p4", finishPlace: 4, startingTag: 3 },
      { playerId: "p5", finishPlace: 5, startingTag: 2 },
      { playerId: "p6", finishPlace: 6, startingTag: 1 },
    ],
  });

  assert.equal(scored[0].beatYourTagBonus, 3);
  assert.equal(scored[1].beatYourTagBonus, 2);
  assert.equal(scored[2].beatYourTagBonus, 1);
});

test("Starting tag ties: equal starting tags share starting rank", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 4 },
      { playerId: "p2", finishPlace: 3, startingTag: 4 },
      { playerId: "p3", finishPlace: 2, startingTag: 9 },
    ],
  });

  assert.equal(scored[0].beatYourTagBonus, 0);
  assert.equal(scored[1].beatYourTagBonus, 0);
  assert.equal(scored[2].beatYourTagBonus, 1);
});

test("returns per-player category breakdowns plus subtotal, multiplier, and total", () => {
  const scored = scoreEvent({
    isMajor: false,
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 3 },
      { playerId: "p2", finishPlace: 2, startingTag: 1 },
      { playerId: "p3", finishPlace: 3, startingTag: 5 },
      { playerId: "p4", finishPlace: 4, startingTag: 7 },
    ],
  });

  assert.deepEqual(scored, [
    {
      playerId: "p1",
      attendance: 2,
      placement: 8,
      startingTagBonus: 2,
      tagOneBonus: 0,
      beatYourTagBonus: 1,
      subtotal: 13,
      multiplier: 1,
      eventTotal: 13,
    },
    {
      playerId: "p2",
      attendance: 2,
      placement: 6,
      startingTagBonus: 3,
      tagOneBonus: 2,
      beatYourTagBonus: 0,
      subtotal: 13,
      multiplier: 1,
      eventTotal: 13,
    },
    {
      playerId: "p3",
      attendance: 2,
      placement: 5,
      startingTagBonus: 1,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      subtotal: 8,
      multiplier: 1,
      eventTotal: 8,
    },
    {
      playerId: "p4",
      attendance: 2,
      placement: 4,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      subtotal: 6,
      multiplier: 1,
      eventTotal: 6,
    },
  ]);
});

test("major events double the full subtotal after category calculations", () => {
  const scored = scoreEvent({
    isMajor: true,
    participants: [{ playerId: "p1", finishPlace: 1, startingTag: 1 }],
  });

  assert.deepEqual(scored[0], {
    playerId: "p1",
    attendance: 2,
    placement: 8,
    startingTagBonus: 0,
    tagOneBonus: 2,
    beatYourTagBonus: 0,
    subtotal: 12,
    multiplier: 2,
    eventTotal: 24,
  });
});

test("missing starting tags yield zero for all tag-dependent categories", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
    ],
  });

  assert.deepEqual(scored.map((row) => row.startingTagBonus), [0, 0]);
  assert.deepEqual(scored.map((row) => row.tagOneBonus), [0, 0]);
  assert.deepEqual(scored.map((row) => row.beatYourTagBonus), [0, 0]);
});

test("returns deterministic integer outputs for identical inputs", () => {
  const input = {
    isMajor: false,
    participants: [
      { playerId: "p1", finishPlace: 2, startingTag: 8 },
      { playerId: "p2", finishPlace: 1, startingTag: 9 },
      { playerId: "p3", finishPlace: 3, startingTag: 10 },
    ],
  };

  const first = scoreEvent(input);
  const second = scoreEvent(input);

  assert.deepEqual(first, second);

  for (const row of first) {
    for (const key of [
      "attendance",
      "placement",
      "startingTagBonus",
      "tagOneBonus",
      "beatYourTagBonus",
      "subtotal",
      "multiplier",
      "eventTotal",
    ]) {
      assert.equal(Number.isInteger(row[key]), true);
    }
  }
});

test("does not mutate event input or participant objects", () => {
  const input = {
    isMajor: true,
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 2 },
      { playerId: "p2", finishPlace: 2, startingTag: 1 },
    ],
  };

  const snapshot = structuredClone(input);

  scoreEvent(input);

  assert.deepEqual(input, snapshot);
});

test("throws for missing playerId", () => {
  assert.throws(
    () => scoreEvent({ participants: [{ finishPlace: 1, startingTag: 1 }] }),
    /playerId/
  );
});

test("throws for missing or invalid finishPlace", () => {
  assert.throws(
    () => scoreEvent({ participants: [{ playerId: "p1", startingTag: 1 }] }),
    /finishPlace/
  );
  assert.throws(
    () => scoreEvent({ participants: [{ playerId: "p1", finishPlace: 0, startingTag: 1 }] }),
    /finishPlace/
  );
  assert.throws(
    () => scoreEvent({ participants: [{ playerId: "p1", finishPlace: 1.5, startingTag: 1 }] }),
    /finishPlace/
  );
});

test("duplicate playerId rows score independently and deterministically", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "dup", finishPlace: 1, startingTag: 9 },
      { playerId: "dup", finishPlace: 2, startingTag: 1 },
      { playerId: "p3", finishPlace: 3, startingTag: 5 },
    ],
  });

  assert.equal(scored[0].beatYourTagBonus, 1);
  assert.equal(scored[1].beatYourTagBonus, 0);
});
