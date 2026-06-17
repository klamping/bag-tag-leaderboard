# Design: Scoring Accuracy Against Point Rules

## Context

The project already has a production scoring function in `lib/scoreEvent.js` and a meaningful baseline test file in `tests/scoreEvent.test.js`. The league rules are documented in `point-rules.md`.

The immediate goal is to make the scoring algorithm fully trustworthy against that rules document, with enough unit-test coverage that rule regressions are obvious and easy to diagnose.

During brainstorming, one rule was clarified further:

- duplicate starting tags should be rejected unless they are explicitly marked as allowed
- when duplicate starting tags are present without that explicit allowance, scoring should throw and refuse to score the event

## Goals

- Make `scoreEvent()` behavior align exactly with `point-rules.md`.
- Add a large set of explicit scoring examples that validate rule behavior end to end.
- Enforce duplicate starting-tag legality as part of the scoring contract.
- Prefer exact expected row assertions over partial assertions when feasible.
- Preserve a single production scoring implementation.

## Non-Goals

- Rewriting scoring into a new architecture.
- Introducing a second production scorer.
- Property-based or generated test infrastructure.
- Adding warning-only behavior for invalid duplicate starting tags.

## Chosen Approach

Use an example-matrix testing strategy.

Instead of relying mainly on abstract helper assertions or a separate test-only reference model, the test suite should define many concrete event scenarios and compare the exact scored output to expected results. Each scenario should map directly to one or more clauses in `point-rules.md`.

This approach favors readability and trust. When a test fails, the failing scenario should describe a real event shape and a real rules expectation rather than an indirectly derived property.

## Architecture

### 1) Keep `scoreEvent()` as the scoring boundary

`lib/scoreEvent.js` remains the sole production implementation for event scoring.

The work should improve confidence by:

- tightening validation where the current rules require it
- correcting any rule mismatches discovered through tests
- expanding scenario coverage substantially

### 2) Extend the scoring input contract for duplicate-tag legality

The current scorer can calculate a starting rank when multiple players share the same `startingTag`, but it does not know whether those duplicates are allowed by league policy or are invalid data-entry mistakes.

To make the rules enforceable in code, participant input should carry explicit metadata that marks when a duplicate starting tag is allowed.

The implementation detail can be finalized during planning, but the contract must support this distinction:

- duplicate starting tags without explicit allowance are invalid
- duplicate starting tags with explicit allowance are valid
- valid duplicates share the same starting rank for beat-your-tag calculations
- no secondary tie-break should be introduced for starting-rank calculation among equal starting tags

### 3) Center verification around explicit scenario fixtures

The main testing surface should be a scenario matrix made of hand-authored event examples.

Each scenario should contain:

- a short descriptive name
- the event input
- the exact expected scored rows, or the exact expected thrown error

The matrix should be organized by rules topic so it is easy to audit against `point-rules.md`.

## Rules Coverage

The example matrix should explicitly cover every scoring rule in `point-rules.md`.

### Attendance

- every participant receives `2` attendance points for attending the event
- DNF participants still receive attendance points

### Event placement

- 1st place receives `8`
- 2nd receives `6`
- 3rd receives `5`
- 4th receives `4`
- top 50% of field receives `2`
- top 75% of field receives `1`
- placement cutoffs should be verified with explicit field sizes that exercise ceiling behavior

### Finishing ties

- tied players share the same finishing place and therefore the same placement points
- scenarios should verify ties at important thresholds such as 3rd/4th and 50%/75% cutoffs

### Starting tag bonus

- players receive `+1` for each attendee with a worse starting tag
- the category is capped at `6`
- scenarios should cover no-tag participants, low field sizes, and cap behavior

### Tag #1 bonus

- starting with tag `#1` gives `+2`
- the bonus is independent of finish outcome except that the participant must still be an attendee row in the event

### Beat your tag bonus

- starting rank is based only on tagged attendees
- finishing rank is the competition-ranked finishing place
- improvement equals `starting rank - finishing rank`
- improvement by `1-2` gives `+1`
- improvement by `3-4` gives `+2`
- improvement by `5+` gives `+3`
- non-finishers do not receive beat-your-tag points

### Major event multiplier

- major events double the full subtotal after all categories are summed
- tests should assert both `subtotal` and `eventTotal`

### Duplicate starting-tag rules

- duplicate starting tags that are not explicitly allowed should throw and prevent scoring
- duplicate starting tags that are explicitly allowed should score successfully
- allowed duplicates should share the same starting rank
- no secondary tie-break should be applied when duplicate starting tags are allowed

## Data Flow

The scoring path should remain simple:

1. accept event input
2. validate participant shape and finishing-place structure
3. validate duplicate starting-tag legality
4. derive starting-rank and starting-tag bonus data
5. compute per-player scoring categories
6. return exact row breakdowns

The expected output row shape should remain the current public contract unless a rule mismatch requires adjustment:

- `playerId`
- `attendance`
- `placement`
- `startingTagBonus`
- `tagOneBonus`
- `beatYourTagBonus`
- `subtotal`
- `multiplier`
- `eventTotal`

## Error Handling

- invalid participant shapes should continue throwing precise validation errors
- invalid finishing places should continue throwing
- duplicate player IDs should continue throwing
- duplicate starting tags without explicit allowance should throw a precise error that identifies the duplicated tag or otherwise makes the conflict obvious

The scorer should fail closed instead of producing partial scores when duplicate-tag legality is violated.

## Testing Strategy

### Example matrix first

The main body of new test coverage should be a set of explicit scenarios rather than small isolated arithmetic checks.

Each scenario should prefer asserting exact full rows. Partial assertions are acceptable only when they keep a scenario smaller without reducing clarity.

### TDD workflow

Every scoring behavior change should follow strict TDD:

1. add one failing test scenario
2. run the targeted test and confirm it fails for the expected reason
3. make the minimal production change
4. rerun the targeted test until green
5. rerun the broader scoring test suite

### Scenario organization

The scenario set should be grouped so the rules document can be audited line by line:

- attendance scenarios
- placement-tier scenarios
- finishing-tie scenarios
- DNF scenarios
- starting-tag-bonus scenarios
- tag-1 scenarios
- beat-your-tag threshold scenarios
- major-event scenarios
- duplicate-starting-tag allowed scenarios
- duplicate-starting-tag rejected scenarios

### Confidence target

The test suite should make it easy to answer yes to these questions:

- is every rule in `point-rules.md` represented by at least one concrete scenario?
- do the most important scenarios assert exact full outputs?
- will a future scoring-rule regression fail loudly and locally?

## Acceptance Criteria

1. `scoreEvent()` behavior matches the scoring rules in `point-rules.md`.
2. Duplicate starting tags without explicit allowance cause scoring to throw.
3. Explicitly allowed duplicate starting tags score successfully and share starting rank.
4. The scoring tests include a large explicit example matrix that covers all scoring rule families.
5. High-value scenarios assert exact per-player breakdowns, not just final totals.
6. The implementation remains centered on a single production scoring function.
