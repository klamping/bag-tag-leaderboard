# Phase 2B: Public Event Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement public event list and event detail pages (`/events`, `/events/:slug`) driven by confirmed event data only.

**Architecture:** Add a small query layer for public event data and render two read-only routes. `/events` lists confirmed events ordered by date descending; `/events/:slug` renders per-player scoreboard rows (starting tag + point category columns + event total). Keep data-source boundaries injectable so this phase works with fixtures now and database wiring later.

**Tech Stack:** Next.js App Router, existing query-module pattern, Node test runner.

---

## File Structure

- Create: `lib/publicEventsQuery.js` - public query contract for event list and event scoreboard.
- Create: `app/events/page.js` - events index page.
- Create: `app/events/[slug]/page.js` - event detail scoreboard page.
- Create: `tests/publicEventsQuery.test.js` - query contract tests.
- Create: `tests/eventsPages.test.mjs` - route rendering tests.
- Modify: `plans/bag-tag-leaderboard-implementation-progress.md` - phase completion tracking.

---

## Task 1: Define public events query contract

**Files:**
- Create: `lib/publicEventsQuery.js`
- Create: `tests/publicEventsQuery.test.js`

- [x] Define two public query entry points:
  - list confirmed events in descending date order.
  - return scoreboard data for one confirmed event slug.
- [x] Write failing tests for contract behavior before implementation.
- [x] Implement minimal query logic to satisfy tests.
- [x] Add tests for row shape completeness (all scoreboard point columns present).
- [x] Run targeted query tests, then commit.

**Pseudo-flow:**

```text
list events:
  filter confirmed events
  sort by event date descending
  project to public fields

get event by slug:
  find confirmed event by slug
  if not found -> null
  join participants/results/points
  return event metadata + sorted scoreboard rows
```

---

## Task 2: Build `/events` page

**Files:**
- Create: `app/events/page.js`
- Modify: `tests/eventsPages.test.mjs`

- [x] Add failing page tests for heading, links, and empty state.
- [x] Implement read-only events list rendering.
- [x] Ensure each event links to `/events/:slug`.
- [x] Ensure empty state appears when no confirmed events exist.
- [x] Run route tests, then commit.

**Pseudo-flow:**

```text
load events from injected/default loader
if empty -> show empty message
else -> render list with link per event
```

---

## Task 3: Build `/events/:slug` scoreboard page

**Files:**
- Create: `app/events/[slug]/page.js`
- Modify: `tests/eventsPages.test.mjs`

- [x] Add failing tests for required scoreboard columns.
- [x] Add failing test for not-found behavior when slug is missing/unconfirmed.
- [x] Implement event detail rendering with scoreboard table.
- [x] Render the required columns:
  - Player
  - Starting Tag
  - Attendance
  - Placement
  - Starting Tag Bonus
  - Tag #1 Bonus
  - Beat Your Tag Bonus
  - Event Total
- [x] Add empty-scoreboard state.
- [x] Run route tests, then commit.

**Pseudo-flow:**

```text
load scoreboard by slug
if null -> render not found state
else:
  render event metadata
  render scoreboard table and rows
```

---

## Task 4: Wire pages to query contract defaults

**Files:**
- Modify: `app/events/page.js`
- Modify: `app/events/[slug]/page.js`
- Modify: `tests/eventsPages.test.mjs`

- [x] Add tests proving page loaders are called through clear boundaries.
- [x] Set default loaders to call the public query contract.
- [x] Keep loader injection support for testability.
- [x] Run targeted route tests and full test suite, then commit.

---

## Task 5: Verify and update implementation progress

**Files:**
- Modify: `plans/bag-tag-leaderboard-implementation-progress.md`

- [x] Mark Phase 2B complete with summary notes.
- [x] Run full verification (tests + build).
- [x] Commit progress document update.

---

## Acceptance Checklist

- [x] `/events` shows confirmed events only, newest first.
- [x] `/events/:slug` is available for confirmed slugs only.
- [x] Event scoreboard includes all required point columns.
- [x] Not-found and empty states are covered.
- [x] Query layer has focused tests for filtering, ordering, and slug behavior.
- [x] Route rendering tests verify visible contract and states.

---

## Self-Review

- This version intentionally removes language-specific implementation code.
- Steps are outline-oriented and execution-ready.
- Pseudocode is included only for behavioral clarity.
