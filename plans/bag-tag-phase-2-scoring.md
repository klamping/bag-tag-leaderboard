# Plan: Bag Tag Phase 2 - Scoring Engine

> Source PRD: `docs/superpowers/specs/2026-05-08-bag-tag-website-design.md`
> Source rules: `point-rules.md`

## Architectural decisions

Durable decisions for this phase:

- **Scope boundary**: Implement a pure scoring engine + rich demo fixtures; no DB wiring or admin/import UI in this phase.
- **Routes**: Existing `/` route remains the demo validation surface; no new public/admin routes introduced in this phase.
- **Scoring model**: Per-player category breakdown (`attendance`, `placement`, `starting tag bonus`, `tag #1 bonus`, `beat your tag bonus`), subtotal, multiplier, and final total.
- **Major events**: Event-level multiplier applies to full subtotal (`2x` major, `1x` normal).
- **Starting tags**: Optional per participant. Missing tags produce zero for tag-dependent categories.
- **Duplicate starting tags**: Allowed. Starting-rank is competition ranking by tag value; equal tags share rank with no tiebreak.
- **Finish ranks**: Competition ranking semantics (`1,2,2,4`) for tie-sensitive calculations.
- **Validation**: Strict failures for invalid required fields (e.g., missing `playerId`, missing/invalid `finishPlace`), while starting tag remains optional.
- **Traceability**: Tests must reference rule definitions directly from `point-rules.md` labels.

---

## Phase 2.1: Scoring Engine Contract and Core Rules

**User stories**:

- As a maintainer, I can calculate event points from a single deterministic scoring function.
- As a maintainer, I can inspect per-category point breakdowns and totals per player.

### What to build

Create a pure scoring module that accepts an event with participants and returns per-player scoring breakdowns and totals. Implement rule order and integer math exactly per `point-rules.md`: attendance, placement, starting-tag bonus, tag #1 bonus, beat-your-tag bonus, subtotal, multiplier, final total.

### Acceptance criteria

- [x] A pure scoring function exists with clear input/output contract for event scoring.
- [x] Output includes all point categories plus subtotal, multiplier, and event total.
- [x] Major event multiplier doubles full subtotal only after category calculations.
- [x] All point outputs are integers and deterministic for identical inputs.

---

## Phase 2.2: Placement and Tie Semantics

**User stories**:

- As a league operator, I can trust placement and tie scoring to follow documented rules.
- As a maintainer, I can reason about cutoff behavior for top-50% and top-75% placement points.

### What to build

Implement placement scoring with tie-aware logic: fixed points for 1st-4th, then top-50%/top-75% tiers using `ceil` cutoffs and inclusion of all ties at the cutoff place. Ensure finishing-rank semantics are competition ranking.

### Acceptance criteria

- [x] Placement points for 1st-4th are applied exactly.
- [x] Top-50% and top-75% cutoffs use `ceil(fieldSize * threshold)`.
- [x] Tied players at cutoff are included in the same placement tier.
- [x] Competition ranking semantics are used for finish-rank dependent calculations.

---

## Phase 2.3: Starting Tag and Improvement Logic

**User stories**:

- As a league operator, first events without starting tags can still be scored safely.
- As a league operator, new players sharing a starting tag are handled fairly.

### What to build

Implement starting-tag-dependent categories with robust edge handling. Missing starting tags produce zero for starting-tag bonus, tag #1 bonus, and beat-your-tag bonus. Where starting tags are present, compute starting ranks via competition ranking on tag values (equal tags share rank) and calculate improvement bands for beat-your-tag bonus.

### Acceptance criteria

- [x] Missing starting tags do not block scoring and yield zero for tag-dependent categories.
- [x] Starting tag bonus counts worse tags and caps at 6.
- [x] Tag #1 bonus applies only when starting tag is 1.
- [x] Beat-your-tag bonus thresholds (+1/+2/+3) match documented improvement bands.
- [x] Equal starting tags share starting rank (no secondary tiebreak).

---

## Phase 2.4: Demo Fixture Expansion (Multi-Event)

**User stories**:

- As a developer, I can validate homepage HTML/CSS with realistic multi-event fake data.
- As a stakeholder, I can see season standings affected by varied event types and participation.

### What to build

Expand demo data into a small fixture set of multiple fake events scored through the engine: initial event without starting tags, major doubled event, and normal events with mixed participation. Update demo mode aggregation to produce leaderboard rows from fixture-backed scored outputs.

### Acceptance criteria

- [x] Demo fixture set includes initial-no-tags, major-doubled, and normal mixed-participation events.
- [x] Demo leaderboard aggregates from scored event fixture outputs (not ad-hoc hardcoded totals).
- [x] Demo mode remains URL-driven (`?demo=1`) and clearly labeled.
- [x] Tie-rank display remains correct in demo leaderboard output.

---

## Phase 2.5: Rule-Linked Test Suite

**User stories**:

- As a maintainer, I can trust scoring changes because tests map directly to formal point rules.
- As a reviewer, I can verify behavior from rule name to test case without ambiguity.

### What to build

Add a solid unit/integration test suite linked directly to `point-rules.md` category definitions and tie semantics. Include category-level tests, validation tests, scenario tests, and regression fixture assertions for expected per-player breakdowns and season aggregates.

### Acceptance criteria

- [x] Tests are named and grouped by rule categories from `point-rules.md`.
- [x] Category-level tests cover attendance, placement, starting-tag bonus, tag #1 bonus, beat-your-tag bonus, and ties.
- [x] Validation tests cover required-field failures and accepted optional starting-tag behavior.
- [x] Scenario tests cover all required fake event types and shared starting-tag cases.
- [x] Regression assertions verify both per-event breakdowns and season aggregate outputs.
