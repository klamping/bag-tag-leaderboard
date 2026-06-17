# Event Scoreboard Finish Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make event-page scoreboards display rows by finish place, with finishers first, `DNF` rows last, and tied finish places ordered alphabetically by player name.

**Architecture:** Keep the change in `lib/publicEventsQuery.js`, where event scoreboard rows are assembled and sorted before they reach `buildPublicModel()`. Add focused tests in `tests/publicEventsQuery.test.js` to lock the new ordering rules, then verify the full suite to confirm the event page and other public-event consumers still behave correctly.

**Tech Stack:** Node.js, CommonJS, `node:test`, `node:assert/strict`

---

## File Map

- Modify: `lib/publicEventsQuery.js`
  - Replace the current `eventTotal`-first scoreboard sort with finish-place-first ordering.
  - Keep deterministic fallbacks after `playerName`.
- Modify: `tests/publicEventsQuery.test.js`
  - Add a failing test that covers numeric finish ordering, tied finish-place alphabetical ordering, and `DNF` rows at the bottom.
  - Update any existing expectations that currently depend on `eventTotal`-first ordering.

### Task 1: Change event scoreboard ordering in the query layer

**Files:**
- Modify: `tests/publicEventsQuery.test.js`
- Modify: `lib/publicEventsQuery.js`
- Test: `tests/publicEventsQuery.test.js`

- [ ] **Step 1: Write the failing finish-order test**

Add this test in `tests/publicEventsQuery.test.js` near the existing `getPublicEventScoreboardBySlug` ordering tests:

```js
test("getPublicEventScoreboardBySlug sorts by finish place then player name with DNF last", () => {
  const event = getPublicEventScoreboardBySlug({
    slug: "finish-order",
    players: [
      { id: "p1", name: "Cara" },
      { id: "p2", name: "Ada" },
      { id: "p3", name: "Bert" },
      { id: "p4", name: "Zane" },
    ],
    events: [
      {
        id: "e1",
        slug: "finish-order",
        name: "Finish Order",
        eventDate: "2026-06-12",
        confirmed: true,
      },
    ],
    eventResults: [
      { id: "r1", eventId: "e1", playerId: "p1", startingTag: 4, finishPlace: 2 },
      { id: "r2", eventId: "e1", playerId: "p2", startingTag: 1, finishPlace: 1 },
      { id: "r3", eventId: "e1", playerId: "p3", startingTag: 2, finishPlace: 2 },
      { id: "r4", eventId: "e1", playerId: "p4", startingTag: 3, finishPlace: null },
    ],
    eventPoints: [
      { eventResultId: "r1", eventTotal: 20 },
      { eventResultId: "r2", eventTotal: 5 },
      { eventResultId: "r3", eventTotal: 30 },
      { eventResultId: "r4", eventTotal: 50 },
    ],
  });

  assert.deepEqual(
    event.scoreboard.map((row) => [row.playerName, row.eventResult]),
    [
      ["Ada", 1],
      ["Bert", 2],
      ["Cara", 2],
      ["Zane", null],
    ]
  );
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- tests/publicEventsQuery.test.js`
Expected: FAIL because the current scoreboard sort still prefers higher `eventTotal`, so `Zane` and `Bert` will not land in the requested display order.

- [ ] **Step 3: Write the minimal scoreboard sort implementation**

In `lib/publicEventsQuery.js`, replace the current `.sort((a, b) => { ... })` block inside `getPublicEventScoreboardBySlug()` with:

```js
    .sort((a, b) => {
      const aDidNotFinish = a.eventResult == null;
      const bDidNotFinish = b.eventResult == null;

      if (aDidNotFinish !== bDidNotFinish) {
        return aDidNotFinish ? 1 : -1;
      }

      if (!aDidNotFinish && a.eventResult !== b.eventResult) {
        return a.eventResult - b.eventResult;
      }

      if (a.playerName !== b.playerName) {
        return compareStrings(a.playerName, b.playerName);
      }

      return compareStrings(a.playerId, b.playerId);
    });
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- tests/publicEventsQuery.test.js`
Expected: PASS, including the new finish-order test and the existing deterministic-order tests.

- [ ] **Step 5: Commit**

```bash
git add lib/publicEventsQuery.js tests/publicEventsQuery.test.js
git commit -m "fix: sort event scoreboards by finish place"
```

### Task 2: Run full regression verification for the new scoreboard order

**Files:**
- Verify: `lib/publicEventsQuery.js`
- Verify: `tests/publicEventsQuery.test.js`

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: PASS with `0 fail` in the final summary.

- [ ] **Step 2: Confirm the acceptance criteria against the implementation and tests**

Check these directly before closing the task:

```text
- Event scoreboard sort now uses finish place before all other display tie-breakers.
- DNF/null finish rows sort after all numeric finish places.
- Shared finish places break ties alphabetically by playerName.
- The sort lives in lib/publicEventsQuery.js, not in site/events/event.njk.
- tests/publicEventsQuery.test.js explicitly covers the new ordering behavior.
```

- [ ] **Step 3: Commit verification-only changes if needed**

If no files changed during verification, do not create another commit.

If a verification fix was required, commit it with:

```bash
git add lib/publicEventsQuery.js tests/publicEventsQuery.test.js
git commit -m "test: verify event scoreboard display order"
```
