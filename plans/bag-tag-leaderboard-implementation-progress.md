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
- `[x]` Phase 6: Public Event Views (`/events`, `/events/:slug`)
- `[ ]` Phase 7: Post-Confirm Edits + Audit Trail
- `[ ]` Phase 8: Failure and Integrity Hardening

## Current Snapshot

- Active branch: `phase-2b-public-events`
- Phase 1 status: complete
- Phase 6 status: complete (routes, query hardening, and contract normalization verified)
- Recommended next step: begin Phase 7 planning/tasks

## Phase 6: Public Event Views (`/events`, `/events/:slug`)

### Task 6.1 - Public events query contract

- Status: `[x] Completed`
- Notes:
  - Added `lib/publicEventsQuery.js` with confirmed-only list and slug-based scoreboard query.
  - Added `tests/publicEventsQuery.test.js` for filtering, ordering, row shape, and null slug behavior.

### Task 6.2 - Render `/events` list page

- Status: `[x] Completed`
- Notes:
  - Added `app/events/page.js` with heading, event links, and empty state.
  - Preserves `?demo=1` in event links during demo browsing.

### Task 6.3 - Render `/events/:slug` scoreboard page

- Status: `[x] Completed`
- Notes:
  - Added `app/events/[slug]/page.js` with required scoring columns and not-found handling.
  - Added `Event Result` column to show finish place per player.
  - Added empty-scoreboard state.

### Task 6.4 - Demo data and tag-rule alignment

- Status: `[x] Completed`
- Notes:
  - Wired `/events` and `/events/:slug` to demo fixtures when `?demo=1` is set.
  - Fixed demo starting tag rendering and applied no `Tag #1 Bonus` in `initial-no-tags` event.
  - Added two demo events (`post-initial-weekly`, `post-major-weekly`) in requested order.
  - Updated fixture regressions to match expanded demo season outputs.

### Task 6.5 - P0 integrity hardening (TDD)

- Status: `[x] Completed`
- Notes:
  - `scoreEvent` now rejects duplicate `playerId` entries within a single event.
  - `scoreEvent` now rejects non-object participant rows and invalid `startingTag` values (`< 1`).
  - `leaderboardQuery` now defensively dedupes duplicate `(eventId, playerId)` result rows.
  - Added regression coverage for dedupe key safety when IDs contain `:` characters.
  - `publicEventsQuery` scoreboard path now dedupes duplicate rows per player defensively.

### Task 6.6 - P1 contract normalization (TDD)

- Status: `[x] Completed`
- Notes:
  - Added shared confirmed-event semantics via `lib/isConfirmedEvent.js` and applied to leaderboard/public queries.
  - Confirmed events now include both `confirmed === true` and `status === "confirmed"` shapes.
  - Added shared numeric-safe points resolver in `lib/resolvePointsValue.js`.
  - Leaderboard/public query points contracts now support precedence: `points` -> `eventTotal` -> `event_total_pts`.
  - Added targeted tests for status-based confirmation, points precedence, and numeric coercion safety.
