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

test("example matrix: point-rules scenarios score exact expected rows", () => {
  const scenarios = [
    {
      name: "attendance and fixed placements",
      event: {
        participants: [
          { playerId: "p1", finishPlace: 1 },
          { playerId: "p2", finishPlace: 2 },
          { playerId: "p3", finishPlace: 3 },
          { playerId: "p4", finishPlace: 4 },
        ],
      },
      expected: [
        {
          playerId: "p1",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 10,
          multiplier: 1,
          eventTotal: 10,
        },
        {
          playerId: "p2",
          attendance: 2,
          placement: 6,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 8,
          multiplier: 1,
          eventTotal: 8,
        },
        {
          playerId: "p3",
          attendance: 2,
          placement: 5,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 7,
          multiplier: 1,
          eventTotal: 7,
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
      ],
    },
    {
      name: "placement cutoffs with seven attendees",
      event: {
        participants: [
          { playerId: "p1", finishPlace: 1 },
          { playerId: "p2", finishPlace: 2 },
          { playerId: "p3", finishPlace: 3 },
          { playerId: "p4", finishPlace: 4 },
          { playerId: "p5", finishPlace: 5 },
          { playerId: "p6", finishPlace: 6 },
          { playerId: "p7", finishPlace: 7 },
        ],
      },
      expected: [
        {
          playerId: "p1",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 10,
          multiplier: 1,
          eventTotal: 10,
        },
        {
          playerId: "p2",
          attendance: 2,
          placement: 6,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 8,
          multiplier: 1,
          eventTotal: 8,
        },
        {
          playerId: "p3",
          attendance: 2,
          placement: 5,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 7,
          multiplier: 1,
          eventTotal: 7,
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
        {
          playerId: "p5",
          attendance: 2,
          placement: 1,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 3,
          multiplier: 1,
          eventTotal: 3,
        },
        {
          playerId: "p6",
          attendance: 2,
          placement: 1,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 3,
          multiplier: 1,
          eventTotal: 3,
        },
        {
          playerId: "p7",
          attendance: 2,
          placement: 0,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 0,
          subtotal: 2,
          multiplier: 1,
          eventTotal: 2,
        },
      ],
    },
    {
      name: "dnf still gets attendance and tag bonuses",
      event: {
        participants: [
          { playerId: "p1", finishPlace: 1, startingTag: 2 },
          { playerId: "p2", finishPlace: null, startingTag: 1 },
        ],
      },
      expected: [
        {
          playerId: "p1",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 0,
          beatYourTagBonus: 1,
          subtotal: 11,
          multiplier: 1,
          eventTotal: 11,
        },
        {
          playerId: "p2",
          attendance: 2,
          placement: 0,
          startingTagBonus: 1,
          tagOneBonus: 2,
          beatYourTagBonus: 0,
          subtotal: 5,
          multiplier: 1,
          eventTotal: 5,
        },
      ],
    },
    {
      name: "major event doubles subtotal",
      event: {
        isMajor: true,
        participants: [{ playerId: "p1", finishPlace: 1, startingTag: 1 }],
      },
      expected: [
        {
          playerId: "p1",
          attendance: 2,
          placement: 8,
          startingTagBonus: 0,
          tagOneBonus: 2,
          beatYourTagBonus: 0,
          subtotal: 12,
          multiplier: 2,
          eventTotal: 24,
        },
      ],
    },
  ];

  for (const scenario of scenarios) {
    assert.deepEqual(scoreEvent(scenario.event), scenario.expected, scenario.name);
  }
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

test("example matrix: finishing ties at placement thresholds share exact points", () => {
  const scenarios = [
    {
      name: "top-half cutoff finishers tied at fifth both keep two-point placement",
      event: {
        participants: [
          { playerId: "p1", finishPlace: 1 },
          { playerId: "p2", finishPlace: 2 },
          { playerId: "p3", finishPlace: 3 },
          { playerId: "p4", finishPlace: 4 },
          { playerId: "p5", finishPlace: 5 },
          { playerId: "p6", finishPlace: 5 },
          { playerId: "p7", finishPlace: 7 },
          { playerId: "p8", finishPlace: 8 },
          { playerId: "p9", finishPlace: 9 },
          { playerId: "p10", finishPlace: 10 },
        ],
      },
      expected: [8, 6, 5, 4, 2, 2, 1, 1, 0, 0],
    },
    {
      name: "top-seventy-five-percent cutoff finishers tied at sixth both keep one-point placement",
      event: {
        participants: [
          { playerId: "p1", finishPlace: 1 },
          { playerId: "p2", finishPlace: 2 },
          { playerId: "p3", finishPlace: 3 },
          { playerId: "p4", finishPlace: 4 },
          { playerId: "p5", finishPlace: 5 },
          { playerId: "p6", finishPlace: 6 },
          { playerId: "p7", finishPlace: 6 },
          { playerId: "p8", finishPlace: 8 },
        ],
      },
      expected: [8, 6, 5, 4, 1, 1, 1, 0],
    },
  ];

  for (const scenario of scenarios) {
    const scored = scoreEvent(scenario.event);
    assert.deepEqual(
      scored.map((row) => row.placement),
      scenario.expected,
      scenario.name
    );
  }
});

test("DNF rows receive attendance and tag bonuses but no placement or beat-your-tag points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 2 },
      { playerId: "p2", finishPlace: null, startingTag: 1 },
    ],
  });

  assert.deepEqual(scored[1], {
    playerId: "p2",
    attendance: 2,
    placement: 0,
    startingTagBonus: 1,
    tagOneBonus: 2,
    beatYourTagBonus: 0,
    subtotal: 5,
    multiplier: 1,
    eventTotal: 5,
  });
});

test("placement thresholds use the full attendee count including DNF participants", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1 },
      { playerId: "p2", finishPlace: 2 },
      { playerId: "p3", finishPlace: 3 },
      { playerId: "p4", finishPlace: 4 },
      { playerId: "p5", finishPlace: null },
      { playerId: "p6", finishPlace: null },
    ],
  });

  assert.deepEqual(scored.map((row) => row.placement), [8, 6, 5, 4, 0, 0]);
});

test("beat-your-tag compares against all tagged attendees but only finishers receive those points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 1, startingTag: 4 },
      { playerId: "p2", finishPlace: 2, startingTag: 5 },
      { playerId: "p3", finishPlace: 3, startingTag: 1 },
      { playerId: "p4", finishPlace: null, startingTag: 2 },
      { playerId: "p5", finishPlace: null, startingTag: 3 },
    ],
  });

  assert.equal(scored[0].beatYourTagBonus, 2);
  assert.equal(scored[1].beatYourTagBonus, 2);
  assert.equal(scored[3].beatYourTagBonus, 0);
  assert.equal(scored[4].beatYourTagBonus, 0);
});

test("non-null finish places must follow competition ranking", () => {
  assert.throws(
    () =>
      scoreEvent({
        participants: [
          { playerId: "p1", finishPlace: 1, startingTag: 1 },
          { playerId: "p2", finishPlace: 2, startingTag: 2 },
          { playerId: "p3", finishPlace: 2, startingTag: 3 },
          { playerId: "p4", finishPlace: 3, startingTag: 4 },
        ],
      }),
    /competition ranking/i
  );
});

test("finish-place validation applies only to non-null places", () => {
  assert.doesNotThrow(() =>
    scoreEvent({
      participants: [
        { playerId: "p1", finishPlace: 1, startingTag: 1 },
        { playerId: "p2", finishPlace: null, startingTag: 2 },
      ],
    })
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

test("example matrix: beat-your-tag thresholds award 1, 2, and 3 points", () => {
  const scored = scoreEvent({
    participants: [
      { playerId: "p1", finishPlace: 4, startingTag: 1 },
      { playerId: "p2", finishPlace: 1, startingTag: 2 },
      { playerId: "p3", finishPlace: 5, startingTag: 3 },
      { playerId: "p4", finishPlace: 6, startingTag: 4 },
      { playerId: "p5", finishPlace: 2, startingTag: 5 },
      { playerId: "p6", finishPlace: 7, startingTag: 6 },
      { playerId: "p7", finishPlace: 8, startingTag: 7 },
      { playerId: "p8", finishPlace: 3, startingTag: 8 },
    ],
  });

  assert.deepEqual(
    scored.map((row) => ({
      playerId: row.playerId,
      beatYourTagBonus: row.beatYourTagBonus,
      eventTotal: row.eventTotal,
    })),
    [
      { playerId: "p1", beatYourTagBonus: 0, eventTotal: 14 },
      { playerId: "p2", beatYourTagBonus: 1, eventTotal: 17 },
      { playerId: "p3", beatYourTagBonus: 0, eventTotal: 8 },
      { playerId: "p4", beatYourTagBonus: 0, eventTotal: 7 },
      { playerId: "p5", beatYourTagBonus: 2, eventTotal: 13 },
      { playerId: "p6", beatYourTagBonus: 0, eventTotal: 4 },
      { playerId: "p7", beatYourTagBonus: 0, eventTotal: 3 },
      { playerId: "p8", beatYourTagBonus: 3, eventTotal: 10 },
    ]
  );
});

test("throws for duplicate startingTag without explicit allowance", () => {
  assert.throws(
    () =>
      scoreEvent({
        participants: [
          { playerId: "p1", finishPlace: 1, startingTag: 7 },
          { playerId: "p2", finishPlace: 2, startingTag: 7 },
        ],
      }),
    /Duplicate startingTag 7 requires explicit allowance/
  );
});

test("allowed duplicate starting tags share starting rank and still score", () => {
  const scored = scoreEvent({
    participants: [
      {
        playerId: "p1",
        finishPlace: 1,
        startingTag: 7,
        allowsDuplicateStartingTag: true,
      },
      {
        playerId: "p2",
        finishPlace: 2,
        startingTag: 7,
        allowsDuplicateStartingTag: true,
      },
      { playerId: "p3", finishPlace: 3, startingTag: 9 },
    ],
  });

  assert.deepEqual(scored.map((row) => row.placement), [8, 6, 5]);
  assert.equal(scored[1].beatYourTagBonus, 0);
  assert.equal(scored[2].beatYourTagBonus, 0);
  assert.deepEqual(scored.map((row) => row.startingTagBonus), [1, 1, 0]);
  assert.deepEqual(scored.map((row) => row.eventTotal), [11, 9, 7]);
});

test("Starting tag ties: equal starting tags share starting rank", () => {
  const scored = scoreEvent({
    participants: [
      {
        playerId: "p1",
        finishPlace: 1,
        startingTag: 4,
        allowsDuplicateStartingTag: true,
      },
      {
        playerId: "p2",
        finishPlace: 3,
        startingTag: 4,
        allowsDuplicateStartingTag: true,
      },
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
});

test("throws for non-object participant entries", () => {
  assert.throws(
    () => scoreEvent({ participants: [null] }),
    /Participant at index 0 must be an object/
  );
  assert.throws(
    () => scoreEvent({ participants: ["p1"] }),
    /Participant at index 0 must be an object/
  );
});

test("throws for invalid startingTag values", () => {
  assert.throws(
    () => scoreEvent({ participants: [{ playerId: "p1", finishPlace: 1, startingTag: 0 }] }),
    /Participant p1 has invalid startingTag; expected integer >= 1/
  );
  assert.throws(
    () => scoreEvent({ participants: [{ playerId: "p1", finishPlace: 1, startingTag: -2 }] }),
    /Participant p1 has invalid startingTag; expected integer >= 1/
  );
});

test("throws for duplicate playerId within a single event", () => {
  assert.throws(
    () =>
      scoreEvent({
        participants: [
          { playerId: "dup", finishPlace: 1, startingTag: 9 },
          { playerId: "dup", finishPlace: 2, startingTag: 1 },
          { playerId: "p3", finishPlace: 3, startingTag: 5 },
        ],
      }),
    /Duplicate playerId "dup" in event participants/
  );
});
