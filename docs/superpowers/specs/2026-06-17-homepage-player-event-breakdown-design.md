# Design: Homepage Player Event Breakdown

## Context

The homepage currently renders each leaderboard player as a simple summary row with name, events played, and season points.

The requested change is to let a visitor expand a player row on the homepage and see that player's per-event scoring history, including a final totals row.

## Goals

- Keep the current homepage leaderboard summary visible in the collapsed state.
- Let the whole player row act as the expand/collapse trigger.
- Show an expanded per-player scoring table on the homepage.
- Include linked event names plus the selected scoring columns for each event.
- Add a final totals row that sums each numeric scoring column.
- Keep the change localized to the public-model and homepage rendering layers.

## Non-Goals

- Changing event scoring rules or leaderboard ranking rules.
- Changing the existing event detail page scoreboard layout.
- Adding a separate JavaScript-heavy interaction model unless native markup cannot satisfy the behavior.
- Showing event dates in the expanded homepage table.
- Reworking unrelated homepage sections.

## Chosen Approach

Extend `buildPublicModel()` so each homepage leaderboard row includes a display-ready per-player event breakdown and precomputed totals, then render that data inside an expandable disclosure on the homepage.

This keeps the scoring assembly and totals logic in the same public-model boundary that already prepares leaderboard rows and event-page scoreboards. It also keeps `site/index.njk` focused on rendering rather than joining event/result data or calculating totals inside the template.

## Implementation Shape

Add two new display fields to each homepage leaderboard row:

- `eventBreakdown`: ordered array of the player's public event scoring rows
- `totals`: object containing summed numeric scoring values for the expanded totals row

Each `eventBreakdown` row should include:

- `eventName`
- `eventSlug`
- `attendance`
- `placement`
- `startingTagBonus`
- `tagOneBonus`
- `beatYourTagBonus`
- `eventTotal`

`totals` should include summed values for:

- `attendance`
- `placement`
- `startingTagBonus`
- `tagOneBonus`
- `beatYourTagBonus`
- `eventTotal`

The homepage template should render each leaderboard item as an expandable player card that preserves the current summary content in its collapsed header area and reveals the event table only when expanded.

## Data Flow

The relevant public-site path after this change should be:

1. load players, public events, public event results, and public event points from the canonical store
2. build the existing homepage leaderboard rows
3. for each leaderboard row, collect that player's event-scoring rows across public events
4. normalize each row to the homepage table shape, including linked event metadata
5. compute numeric totals once in the public-model layer
6. render the homepage template from the display-ready data

## Ordering Rules

The expanded event table should use a deterministic public-event order that matches the site's existing event listing expectations.

The simplest consistent rule is:

1. order rows by event date ascending using the public events order already exposed by the model
2. break same-date ties by event slug, matching existing public event sorting behavior

This means the totals row always appears after all event rows.

## Interaction And Rendering

- The whole leaderboard row should be clickable to expand or collapse the detail panel.
- The collapsed view should continue showing player name, events played, and season points.
- The expanded view should render a table with these columns:
  - Event
  - Attendance
  - Placement
  - Starting Tag Bonus
  - Tag 1 Bonus
  - Beat Your Tag Bonus
  - Total
- The Event column should link to `/events/{slug}/`.
- The final row label should be `Totals` and should sum every numeric column.
- On small screens, the expanded table should allow horizontal scrolling rather than collapsing into stacked key/value rows.

## Error Handling And Edge Cases

- Homepage breakdown values should follow the same public display rules already used by event-page scoreboards.
- If a player has a result row with no numeric finish place, their homepage event row should still display the available scoring values.
- Bootstrap-event sanitizing should apply consistently so hidden bootstrap tag-derived values remain zeroed in the homepage breakdown just as they are on event pages.
- A player shown on the leaderboard should always have at least one event breakdown row.
- If a future data issue produces an empty breakdown for a leaderboard row, the template should fail soft by rendering no table rows rather than throwing.

## Testing And Verification

Follow strict TDD:

1. add failing public-model assertions for homepage `eventBreakdown` and `totals`
2. run the focused test and confirm the failure is for missing homepage breakdown data
3. implement the minimal public-model and template changes
4. rerun the focused tests until green
5. rerun the broader automated suite relevant to homepage public rendering

Required coverage:

- `buildPublicModel()` adds per-player `eventBreakdown` rows to homepage leaderboard rows
- `buildPublicModel()` computes homepage totals correctly for each numeric scoring column
- homepage event breakdown rows include linked event metadata via `eventName` and `eventSlug`
- bootstrap-event rows stay sanitized in the homepage breakdown
- generated homepage HTML contains expandable player-row markup and the expanded scoring table content
- generated homepage HTML contains the totals row and event links

Required verification:

- run the focused `tests/siteBuildCommand.test.js` coverage for public model and homepage output
- run the full automated test suite

## Acceptance Criteria

1. Clicking a homepage player row expands and collapses that player's scoring detail.
2. Expanded content shows one row per attended event.
3. Each expanded row includes the event link plus attendance, placement, starting-tag bonus, tag-1 bonus, beat-your-tag bonus, and total points.
4. The final table row is `Totals` and sums every numeric scoring column.
5. Bootstrap-event display values remain sanitized the same way they are on event pages.
6. Automated tests explicitly cover the new homepage public-model data and rendered output.
