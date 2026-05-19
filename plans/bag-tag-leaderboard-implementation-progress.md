# Bag Tag Leaderboard Implementation Progress

Source plans:

- `plans/bag-tag-leaderboard-phase-1.md`
- `plans/bag-tag-phase-2-scoring.md`

## Status Key

- `[x]` Completed
- `[~]` In progress
- `[ ]` Not started

## Phase 1: Public Leaderboard Skeleton

### Task 1.1 - Bootstrap minimal app/runtime so `/` can be served

- Status: `[x] Completed`
- Notes:
  - Created minimal Next.js scaffold for App Router.
  - Added baseline project hygiene (`.gitignore` for Next/build/env artifacts).
  - Verified app builds and starts locally.

### Task 1.2 - Implement leaderboard query contract (season `2026`, confirmed-only)

- Status: `[x] Completed`
- Notes:
  - Added query contract for leaderboard aggregation.
  - Enforced `season=2026` and confirmed-event filtering.
  - Added tests for season scoping and confirmed-only behavior.

### Task 1.3 - Render `/` leaderboard table and empty state

- Status: `[x] Completed`
- Notes:
  - Implemented table columns: `Rank`, `Player`, `Events Played`, `Season Points`.
  - Added empty state rendering.
  - Added rendering tests (headers, empty state, populated rows).
  - Added `?demo=1` mode with visible `Demo Data` badge and dummy rows for UI validation.

### Task 1.4 - Implement shared-rank tie behavior (`1,2,2,4`)

- Status: `[x] Completed`
- Notes:
  - Non-demo mode now computes competition ranks from `seasonPoints`.
  - Demo mode preserves explicit demo ranks for visualization.
  - Added regression tests to ensure non-demo ignores any incoming `row.rank` values.

### Task 1.5 - Add basic automated verification coverage

- Status: `[x] Completed`
- Notes:
  - Route rendering tests and query-layer tests are in place.
  - Full test suite currently passes.

## Phase 2A: Scoring Engine + Demo Fixture Expansion

### Task 2A.1 - Scoring engine contract and core rules

- Status: `[x] Completed`
- Notes:
  - Added pure scoring function in `lib/scoreEvent.js`.
  - Includes full per-player category breakdown, subtotal, multiplier, and final event total.
  - Enforces deterministic integer output and strict required-field validation.

### Task 2A.2 - Placement, ties, and starting-tag logic

- Status: `[x] Completed`
- Notes:
  - Implemented competition ranking semantics and tie-aware placement cutoffs.
  - Implemented starting-tag bonus, tag #1 bonus, and beat-your-tag improvement bands.
  - Added reusable season tag assignment in `lib/tagAssignments.js` for new-player tag handling.

### Task 2A.3 - Demo fixture-backed leaderboard

- Status: `[x] Completed`
- Notes:
  - Replaced ad-hoc demo totals with multi-event scored fixtures via `lib/demoLeaderboard.js`.
  - Expanded demo player set and preserved `?demo=1` behavior with correct tie-rank display.
  - Ensured returning players have starting tags in later events.

### Task 2A.4 - Rule-linked tests and regression coverage

- Status: `[x] Completed`
- Notes:
  - Added rule-category scoring tests, fixture regression tests, and tag-assignment tests.
  - Homepage rendering tests updated for fixture-backed demo standings.
  - Full suite passing at merge time.

## Later Phases (Queued)

- `[ ]` Phase 2B: Public Event Views (`/events`, `/events/:slug`)
- `[ ]` Phase 3: Admin Access + Event Draft Creation
- `[ ]` Phase 4: UDisc Fetch + Draft Preview
- `[ ]` Phase 5: Starting Tag Entry + Validation
- `[ ]` Phase 6: Confirm Import
- `[ ]` Phase 8: Post-Confirm Edits + Audit Trail
- `[ ]` Phase 9: Failure and Integrity Hardening

## Current Snapshot

- Active branch: `master`
- Phase 1 status: complete
- Phase 2A status: complete
- Recommended next step: begin Phase 2B planning/tasks (`/events` and `/events/:slug`)
