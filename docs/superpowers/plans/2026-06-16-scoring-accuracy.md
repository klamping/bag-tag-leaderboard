# Scoring Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `lib/scoreEvent.js` enforce duplicate starting-tag legality and expand unit coverage so the scoring behavior is explicitly verified against `point-rules.md` with concrete example scenarios.

**Architecture:** Keep `scoreEvent()` as the single production scorer. Add one small participant-level flag that allows specific duplicate starting tags, fail closed when duplicate tags appear without that allowance, and reorganize scoring tests around a larger scenario matrix that asserts exact score rows for canonical events.

**Tech Stack:** Node.js, `node:test`, `node:assert/strict`

---

## File Map

- Modify: `lib/scoreEvent.js`
  - Add duplicate-starting-tag validation that requires explicit allowance metadata.
  - Preserve existing scoring flow and output shape.
- Modify: `tests/scoreEvent.test.js`
  - Add failing tests first for duplicate-tag rejection and allowed-duplicate handling.
  - Expand the scenario matrix to cover the full rules document with explicit expected rows.

### Task 1: Reject duplicate starting tags unless explicitly allowed

**Files:**
- Modify: `tests/scoreEvent.test.js`
- Modify: `lib/scoreEvent.js`
- Test: `tests/scoreEvent.test.js`

- [ ] **Step 1: Write the failing tests**

Add these tests near the existing validation section in `tests/scoreEvent.test.js`:

```js
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

  assert.deepEqual(scored, [
    {
      playerId: "p1",
      attendance: 2,
      placement: 8,
      startingTagBonus: 1,
      tagOneBonus: 0,
      beatYourTagBonus: 0,
      subtotal: 11,
      multiplier: 1,
      eventTotal: 11,
    },
    {
      playerId: "p2",
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
      playerId: "p3",
      attendance: 2,
      placement: 6,
      startingTagBonus: 0,
      tagOneBonus: 0,
      beatYourTagBonus: 1,
      subtotal: 9,
      multiplier: 1,
      eventTotal: 9,
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: FAIL because duplicate starting tags are not rejected yet and the new participant flag is ignored.

- [ ] **Step 3: Write minimal implementation**

Add a helper in `lib/scoreEvent.js` and call it from `validateParticipants(participants)` before `parseCompetitionPlaces(participants)`:

```js
function validateDuplicateStartingTags(participants) {
  const participantsByTag = new Map();

  for (const participant of participants) {
    if (!Number.isInteger(participant.startingTag)) {
      continue;
    }

    const entries = participantsByTag.get(participant.startingTag) ?? [];
    entries.push(participant);
    participantsByTag.set(participant.startingTag, entries);
  }

  for (const [startingTag, taggedParticipants] of participantsByTag.entries()) {
    if (taggedParticipants.length < 2) {
      continue;
    }

    const allExplicitlyAllowed = taggedParticipants.every(
      (participant) => participant.allowsDuplicateStartingTag === true
    );

    if (!allExplicitlyAllowed) {
      throw new Error(`Duplicate startingTag ${startingTag} requires explicit allowance`);
    }
  }
}
```

And inside `validateParticipants(participants)`:

```js
  validateDuplicateStartingTags(participants);
  parseCompetitionPlaces(participants);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: PASS for the two new tests and no regressions in the rest of the file.

- [ ] **Step 5: Commit**

```bash
git add lib/scoreEvent.js tests/scoreEvent.test.js
git commit -m "fix: enforce duplicate starting tag scoring rules"
```

### Task 2: Add explicit scenario-matrix coverage for point rules

**Files:**
- Modify: `tests/scoreEvent.test.js`
- Test: `tests/scoreEvent.test.js`

- [ ] **Step 1: Write the failing scenario-matrix test**

Add a table-driven test that exercises canonical examples from `point-rules.md` and asserts exact score rows. Structure it like this:

```js
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
        { playerId: "p1", attendance: 2, placement: 8, startingTagBonus: 0, tagOneBonus: 0, beatYourTagBonus: 0, subtotal: 10, multiplier: 1, eventTotal: 10 },
        { playerId: "p2", attendance: 2, placement: 6, startingTagBonus: 0, tagOneBonus: 0, beatYourTagBonus: 0, subtotal: 8, multiplier: 1, eventTotal: 8 },
        { playerId: "p3", attendance: 2, placement: 5, startingTagBonus: 0, tagOneBonus: 0, beatYourTagBonus: 0, subtotal: 7, multiplier: 1, eventTotal: 7 },
        { playerId: "p4", attendance: 2, placement: 4, startingTagBonus: 0, tagOneBonus: 0, beatYourTagBonus: 0, subtotal: 6, multiplier: 1, eventTotal: 6 },
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
      expectedPlacements: [8, 6, 5, 4, 1, 1, 0],
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
        { playerId: "p1", attendance: 2, placement: 8, startingTagBonus: 0, tagOneBonus: 0, beatYourTagBonus: 0, subtotal: 10, multiplier: 1, eventTotal: 10 },
        { playerId: "p2", attendance: 2, placement: 0, startingTagBonus: 1, tagOneBonus: 2, beatYourTagBonus: 0, subtotal: 5, multiplier: 1, eventTotal: 5 },
      ],
    },
    {
      name: "major event doubles subtotal",
      event: {
        isMajor: true,
        participants: [{ playerId: "p1", finishPlace: 1, startingTag: 1 }],
      },
      expected: [
        { playerId: "p1", attendance: 2, placement: 8, startingTagBonus: 0, tagOneBonus: 2, beatYourTagBonus: 0, subtotal: 12, multiplier: 2, eventTotal: 24 },
      ],
    },
  ];

  for (const scenario of scenarios) {
    const scored = scoreEvent(scenario.event);

    if (scenario.expected) {
      assert.deepEqual(scored, scenario.expected, scenario.name);
      continue;
    }

    if (scenario.expectedPlacements) {
      assert.deepEqual(
        scored.map((row) => row.placement),
        scenario.expectedPlacements,
        scenario.name
      );
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: FAIL if any current rule interpretation does not match the explicit examples.

- [ ] **Step 3: Write minimal implementation or expected-output corrections**

If the failure exposes a real scorer bug, fix only the relevant logic in `lib/scoreEvent.js`. If the scorer is already correct, keep production code unchanged and correct the expected scenario data so it matches the published rules and existing validated behavior.

When touching production code, keep changes minimal and local to the failing rule.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: PASS for the example-matrix test and the rest of the scoring tests.

- [ ] **Step 5: Commit**

```bash
git add tests/scoreEvent.test.js lib/scoreEvent.js
git commit -m "test: add scoring rule example matrix"
```

### Task 3: Fill coverage gaps for finishing ties and beat-your-tag thresholds

**Files:**
- Modify: `tests/scoreEvent.test.js`
- Test: `tests/scoreEvent.test.js`

- [ ] **Step 1: Write the failing tests**

Add exact-scenario tests for:

```js
test("example matrix: finishing ties at placement thresholds share exact points", () => {
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

  assert.deepEqual(scored.map((row) => row.placement), [8, 6, 5, 5, 1, 0]);
});

test("example matrix: beat-your-tag thresholds award 1 2 and 3 points", () => {
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

  assert.deepEqual(scored.map((row) => row.beatYourTagBonus), [3, 2, 1, 0, 0, 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: FAIL if either threshold interpretation is incorrect.

- [ ] **Step 3: Write minimal implementation**

Only if needed, update the smallest relevant branch in `getPlacementPoints()` or `getBeatYourTagBonus()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/scoreEvent.test.js lib/scoreEvent.js
git commit -m "test: lock scoring tie and beat-your-tag scenarios"
```

### Task 4: Verify the full test suite and build

**Files:**
- Modify: none required
- Test: `tests/scoreEvent.test.js`

- [ ] **Step 1: Run the focused scoring tests**

Run: `npm test -- tests/scoreEvent.test.js`
Expected: PASS with zero failing scoring tests.

- [ ] **Step 2: Run the full automated test suite**

Run: `npm test`
Expected: PASS with zero failing tests.

- [ ] **Step 3: Run the site build**

Run: `npm run build`
Expected: successful site build with exit code `0`.

- [ ] **Step 4: Review spec coverage before claiming completion**

Check that the implemented tests cover:

- attendance
- event placement tiers
- finishing ties
- DNF handling
- starting-tag bonus and cap
- tag #1 bonus
- beat-your-tag thresholds
- major multiplier
- duplicate-tag allowed and rejected paths

- [ ] **Step 5: Commit**

```bash
git add lib/scoreEvent.js tests/scoreEvent.test.js
git commit -m "test: verify scoring rules against point rules"
```
