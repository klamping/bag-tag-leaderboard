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

- `[x]` Phase 3: Admin Access + Event Draft Creation
- `[ ]` Phase 4: UDisc Fetch + Draft Preview
- `[ ]` Phase 5: Starting Tag Entry + Validation
- `[x]` Phase 6: Confirm Import
- `[ ]` Phase 8: Post-Confirm Edits + Audit Trail
- `[ ]` Phase 9: Failure and Integrity Hardening

## Phase 3: Admin Access + Event Draft Creation

### Task 3.1 - Add admin access guard for protected routes

- Status: `[x] Completed`
- Notes:
  - Added server-side admin session guard for protected admin pages.
  - Unauthenticated requests are redirected to `/admin/login`.

### Task 3.2 - Implement admin login and session handling

- Status: `[x] Completed`
- Notes:
  - Added shared-secret login action with secure cookie handling.
  - Session token now includes per-session nonce and validation expiry checks.

### Task 3.3 - Implement draft event create flow with validation

- Status: `[x] Completed`
- Notes:
  - Added `/admin/events/new` draft creation action and field validation.
  - Enforced slug collision checks against draft and non-draft/public event paths.
  - Added/updated tests for auth, date validation, and slug collision behavior.

## Current Snapshot

- Active branch: `phase-6-confirm-import`
- Phase 1 status: complete
- Phase 2A status: complete
- Phase 2B status: complete (public event routes + hardening + normalization)
- Phase 3 status: complete (admin auth guard + login + draft event create flow)
- Phase 6 confirm-import status: complete (server-side confirm flow + admin confirm UX + query coverage)
- Recommended next step: begin Phase 8 planning/tasks

## Phase 2B: Public Event Views (`/events`, `/events/:slug`)

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

## Phase 6: Confirm Import

### Task 6.1 - Define confirm-import service contract

- Status: `[x] Completed`
- Notes:
  - Added `lib/confirmImportedEvent.js` as the server-side confirm-import workflow.
  - Kept validation, scoring preparation, persistence ordering, and rollback handling inside the service boundary.

### Task 6.2 - Validate reviewed preview and block invalid imports

- Status: `[x] Completed`
- Notes:
  - Re-validates event fields, participant rows, ambiguous matches, duplicate starting tags, and slug collisions before writes.
  - Returns structured `fieldErrors` for expected review/confirm failures.

### Task 6.3 - Create new player records for unmatched imports

- Status: `[x] Completed`
- Notes:
  - Unmatched reviewed rows create new player records during confirm.
  - Newly created player ids are threaded into subsequent scoring and persistence writes.

### Task 6.4 - Persist confirmed event and event results

- Status: `[x] Completed`
- Notes:
  - Confirm now writes a `confirmed` event plus per-player event results through the in-memory store helpers.
  - Later-write failures trigger rollback attempts for created points, results, events, and players.

### Task 6.5 - Score confirmed import and persist event points

- Status: `[x] Completed`
- Notes:
  - Confirmed imports are scored with `scoreEvent` before event/result/point persistence proceeds.
  - Persisted point rows now feed existing leaderboard and public event query paths.

### Task 6.6 - Wire admin confirm action and success/error UX

- Status: `[x] Completed`
- Notes:
  - Added confirm server action, malformed-payload redirect handling, and success redirect state with `confirmed_slug`.
  - Preview review UI now renders a confirm form only after the reviewed payload is valid.

### Task 6.7 - Add confirm-import verification coverage

- Status: `[x] Completed`
- Notes:
  - Confirm service, integration, and admin-route regression tests cover invalid previews, rollbacks, persistence, and confirm UX.
  - Final regression suite and production build passed in the Phase 6 worktree.
