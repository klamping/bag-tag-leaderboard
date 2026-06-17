# Design: Homepage Event Point Overview

## Context

The homepage leaderboard currently renders each player as an expandable card. The card summary shows player name, events played, and season points, and the expanded content shows a per-event scoring breakdown table.

The requested change is to make each player's event-point history visible directly in the leaderboard row itself. The new layout should always show total points on the left, player name plus the existing breakdown control in the next column, and one short-date event column per season event on the right.

## Goals

- Show a per-event point overview inline on the homepage leaderboard.
- Keep total season points visible at the far left of each row.
- Keep the player name and existing `Show Breakdown` control visible in the player column.
- Use short `M/D` event-date headers such as `4/29`.
- Let the leaderboard grow horizontally as additional season events are added.
- Keep the existing per-player detailed breakdown available.

## Non-Goals

- Changing scoring rules, leaderboard ordering, or event visibility rules.
- Removing the existing detailed player breakdown.
- Adding a separate JavaScript interaction layer.
- Reworking event detail pages.

## Chosen Approach

Replace the homepage card-style leaderboard list with a horizontally scrollable table that has shared event-date headers across all players.

This matches the requested layout directly, keeps columns aligned across all players, and avoids trying to simulate table behavior with independent disclosure cards. The existing detailed breakdown remains available from the player column, but it no longer defines the outer leaderboard layout.

## Implementation Shape

The homepage public model should expose two coordinated structures for the leaderboard:

- `leaderboardEvents`: ordered array of season events used to render the shared event-date headers
- `leaderboardRows`: existing player rows plus an `eventOverview` collection aligned to `leaderboardEvents`

Each `leaderboardEvents` entry should include:

- `slug`
- `eventDate`
- `shortDate`

Each `leaderboardRows` entry should continue including:

- `playerId`
- `playerName`
- `eventsPlayed`
- `seasonPoints`
- `eventBreakdown`
- `totals`

Each row should also add:

- `eventOverview`: ordered array with one entry per `leaderboardEvents` item

Each `eventOverview` entry should include:

- `eventSlug`
- `shortDate`
- `points`
- `played`

If the player attended the event, `played` is `true` and `points` is the displayed point total for that event. If the player did not attend the event, `played` is `false` and `points` is `null` so the template can render an empty cell.

## Data Flow

The relevant homepage path after this change should be:

1. load public season events in deterministic display order
2. build the existing homepage leaderboard rows and existing per-player `eventBreakdown` data
3. derive `leaderboardEvents` from the same ordered season-event set used for the homepage
4. for each player row, map season events to either that player's event total or an empty state
5. render the homepage leaderboard table from the display-ready structures

## Ordering Rules

The shared event columns should use the same deterministic ordering as the homepage's public event list:

1. sort by event date ascending
2. break same-date ties by event slug

The player rows should continue using the existing leaderboard sorting rules:

1. season points descending
2. decoded player name ascending for ties
3. player id as the final tie-breaker

## Rendering And Interaction

The homepage leaderboard should render as a single table inside a horizontally scrollable container.

The table should use this column order:

1. total points
2. player
3. one column per `leaderboardEvents` entry

Rendering details:

- The total-points column should preserve the stacked visual treatment, with the numeric total above `pts`.
- The player column should show the decoded player name and keep the existing `Show Breakdown` control.
- Each event header should render `shortDate` only.
- Each event cell should render the player's displayed event total when `played` is `true`.
- Each event cell should render blank when `played` is `false`.
- The scroll container should wrap the entire leaderboard table so headers and rows stay aligned while scrolling.

The existing detailed player breakdown should remain available as disclosure content attached to each player. The simplest acceptable version is a second table row directly after the player row that spans the full table width and contains the existing breakdown table when the player disclosure is open.

## Error Handling And Edge Cases

- Hidden bootstrap-event tag-derived values should stay sanitized exactly as they already are in `eventBreakdown` and event-page scoreboards.
- If a player has no row for a given season event, the corresponding overview cell should be empty rather than `0`.
- If a player has an event row with a displayed total of `0`, that `0` should render explicitly.
- If there are no homepage season events, the homepage should continue using the existing empty-state behavior.
- If future data creates a mismatch between `leaderboardEvents` and a player's event map, the template should fail soft by rendering an empty cell for the missing value.

## Testing And Verification

Follow strict TDD:

1. add failing public-model assertions for `leaderboardEvents` and per-player `eventOverview`
2. run the focused test and confirm the failure is for missing overview data
3. implement the minimal public-model change
4. add failing homepage rendering assertions for the new leaderboard table structure and short-date headers
5. implement the minimal template and CSS changes
6. rerun focused tests until green
7. rerun the full automated suite

Required coverage:

- `buildPublicModel()` exposes ordered homepage `leaderboardEvents`
- `buildPublicModel()` adds aligned `eventOverview` cells for each leaderboard player
- non-participation renders as empty overview cells rather than zeroes
- played events with zero visible total still render `0`
- generated homepage HTML contains the shared short-date headers
- generated homepage HTML contains the inline per-player event totals
- generated homepage HTML keeps the breakdown control available
- generated homepage HTML remains horizontally scrollable as one table unit

Required verification:

- run focused homepage/public-model coverage in `tests/siteBuildCommand.test.js`
- run the full `npm test` suite

## Acceptance Criteria

1. The homepage leaderboard shows total points, player info, and season-event point columns in one shared table.
2. Event headers display short `M/D` dates only.
3. The leaderboard can grow horizontally to include every season event.
4. Players who attended an event show their displayed event total in that event's column.
5. Players who did not attend an event show a blank cell in that event's column.
6. The existing per-player breakdown control remains available.
7. Automated tests cover both the new homepage data shape and rendered output.
