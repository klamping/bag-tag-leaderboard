# Bag Tag Leaderboard Implementation Progress

Source plan: `plans/bag-tag-leaderboard-phase-1.md`

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

## Later Phases (Queued)

- `[ ]` Phase 2: Admin Access + Event Draft Creation
- `[ ]` Phase 3: UDisc Fetch + Draft Preview
- `[ ]` Phase 4: Starting Tag Entry + Validation
- `[ ]` Phase 5: Points Breakdown + Confirm Import
- `[ ]` Phase 6: Public Event Views (`/events`, `/events/:slug`)
- `[ ]` Phase 7: Post-Confirm Edits + Audit Trail
- `[ ]` Phase 8: Failure and Integrity Hardening

## Current Snapshot

- Active branch: `master`
- Phase 1 status: complete
- Recommended next step: begin Phase 2 planning/tasks
