# Bag Tag Leaderboard Website Design

## Overview

Build a 2026 season website for bag tag points tracking with:

- Public read-only views for current leaderboard and event scoreboards
- Private admin area for event imports, starting tag entry, and corrections
- UDisc leaderboard scraping for event results (manual trigger)

This design prioritizes scoring correctness, auditable edits, and a tight MVP scope.

## Goals

- Publish a public leaderboard for 2026 season points
- Publish per-event scoreboards with point component transparency
- Support admin-managed event ingestion from UDisc URLs
- Support manual starting tag entry per event
- Allow post-confirmation corrections with audit history

## Non-Goals (MVP)

- No automatic/current tag ownership tracking across events
- No multi-season UI filtering (UI fixed to 2026)
- No charts or analytics dashboards
- No multi-round or multi-division imports
- No scheduled imports

## Product Scope

### Public

- `/` shows current season leaderboard (2026)
- `/events` shows event list, newest first
- `/events/:slug` shows event scoreboard with points breakdown

### Admin

- Password-protected `/admin/*`
- Create/select event and attach UDisc URL
- Fetch and parse single-round leaderboard from UDisc
- Enter/edit starting tags in a grid
- Preview computed points before confirmation
- Confirm import to publish event data
- Edit confirmed event rows and recalculate points
- Audit trail for all material changes

## Hosting and Stack

- Hosting: Netlify
- App framework: Next.js
- Database: hosted Postgres (e.g., Supabase or Neon)
- Server-side logic: Next.js server routes/functions for parsing and scoring

## Architecture

### Boundaries

- Public pages read only `confirmed` events
- Admin pages can mutate event data through protected server endpoints
- Parser/scoring pipeline runs server-side only

### Event Lifecycle

1. Admin creates event record with UDisc URL
2. Admin fetches/parses UDisc data into preview
3. Admin enters/validates starting tags
4. System computes scoring breakdown
5. Admin confirms import
6. Event becomes publicly visible
7. Optional post-confirm edits are allowed and audited

## Data Model

### `players`

- `id` (PK)
- `display_name` (exact canonical name used for matching)
- `name_normalized` (helper key for trim/lower safety)
- timestamps

### `events`

- `id` (PK)
- `name`
- `slug` (unique)
- `event_date` (from UDisc; required)
- `udisc_url`
- `season` (default `2026`)
- `status` (`draft` | `confirmed`)
- timestamps

### `event_results`

- `id` (PK)
- `event_id` (FK -> events)
- `player_id` (FK -> players)
- `finish_place`
- `is_tied`
- `starting_tag`
- raw source fields for traceability
- timestamps

### `event_points`

- `id` (PK)
- `event_result_id` (FK -> event_results)
- `attendance_pts`
- `placement_pts`
- `starting_tag_bonus_pts`
- `tag_one_bonus_pts`
- `beat_tag_bonus_pts`
- `event_total_pts`
- timestamps

### `audit_log`

- `id` (PK)
- `entity_type`
- `entity_id`
- `action` (`create` | `update` | `confirm`)
- `before_json`
- `after_json`
- timestamp

## Scoring Rules

Rules implemented exactly from `point-rules.md`:

- Attendance: +2 for attending event
- Event placement:
  - 1st: 8
  - 2nd: 6
  - 3rd: 5
  - 4th: 4
  - Top 50%: 2
  - Top 75%: 1
- Starting tag bonus: +1 per attendee with worse (higher number) tag; cap 6
- Tag #1 bonus: +2 if starting tag is 1
- Beat your tag bonus:
  - Determine starting rank among attendees by starting tag
  - Determine finishing rank by event results
  - Improvement = starting rank - finishing rank
  - Improvement 1-2: +1
  - Improvement 3-4: +2
  - Improvement >=5: +3
- Ties: tied players share placement and corresponding points

`event_total_pts` is the sum of all component points.

Season leaderboard is computed as sum of `event_total_pts` across confirmed events.

Season ties are preserved as true ties (displayed ranks like `1, 2, 2, 4`).

## UDisc Import Behavior

- Input: event leaderboard URL (single-round/single leaderboard only)
- Action: admin triggers fetch manually
- Output: parsed participant list and placements for preview
- Confirm step required before persistence/publication
- Parser failure is a hard stop (no partial import)
- If event date cannot be parsed, confirmation is blocked

## Player Identity Strategy (MVP)

- Exact name-based identity is used for matching
- Unknown names are auto-created on confirm
- Preview explicitly lists new players that will be created

## Admin UX Requirements

- Starting tag entry via manual editable table
- Validation before confirm:
  - every participant has a starting tag
  - no duplicate starting tags within an event
- Preview table includes:
  - player
  - starting tag
  - attendance
  - placement
  - starting tag bonus
  - tag #1 bonus
  - beat your tag bonus
  - event total
- Post-confirm edits trigger recalculation and audit logging

## Public UI Requirements

### `/`

Leaderboard columns:

- Rank
- Player
- Events Played
- Season Points

### `/events`

- Event list ordered by `event_date` descending

### `/events/:slug`

Event scoreboard columns:

- Player
- Starting Tag
- Attendance
- Placement
- Starting Tag Bonus
- Tag #1 Bonus
- Beat Your Tag Bonus
- Event Total

Only confirmed events are publicly visible.

## Security

- Single shared admin password gate for `/admin/*`
- Password stored in Netlify environment variables
- Server-side route protection for admin endpoints
- Basic login rate limiting in admin auth flow

## Error Handling

- Parser failures return actionable errors (field-level cause when possible)
- No partial writes on import failure
- Data validation errors block confirmation until resolved

## Acceptance Criteria

1. Admin can create an event, fetch UDisc results, enter starting tags, preview points, and confirm import.
2. Unknown imported names are auto-created as players on confirm.
3. Public leaderboard updates based only on confirmed events.
4. Event page shows full scoring component breakdown per player.
5. Tie handling matches point rules for both event scoring and season ranking display.
6. Admin can edit confirmed event data and recalculation is reflected publicly.
7. All post-confirm changes are recorded in audit log.
8. Parser failures do not modify persisted/public data.

## Future Extensions

- Automatic tag ownership rollover across events
- Multi-season UI and filtering
- Scheduled import automation
- Multi-round and multi-division support
- Data visualizations
