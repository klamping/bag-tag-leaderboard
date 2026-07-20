# Design: Homepage Season Standing Column

## Context

The homepage leaderboard currently shows season total points, player identity, and one overview column per confirmed season event. The rows are already sorted by season points descending, and the season leaderboard image export already derives tied ranks from those totals.

The requested change is to add a `Season Standing` column to the main homepage leaderboard so each player's current place is visible directly in the table.

## Goals

- Show each player's current season standing directly on the homepage leaderboard.
- Use shared-place ranking for ties, so equal season totals render as `1, 1, 3` rather than sequential positions.
- Keep the homepage template simple by rendering a display-ready field from the public model.
- Preserve the existing leaderboard order, breakdown interaction, and per-event overview columns.

## Non-Goals

- Changing how season points are calculated.
- Changing how homepage leaderboard rows are sorted.
- Changing event detail pages or the season image export layout.
- Adding any client-side JavaScript behavior.

## Chosen Approach

Add a `seasonStanding` field to each homepage leaderboard row during `buildPublicModel()` construction, then render that field as a new column in `site/index.njk`.

This keeps ranking logic in the same layer that already prepares display data for the homepage, avoids duplicating rank calculations in Nunjucks, and matches the existing concept already used by the season leaderboard image model.

## Implementation Shape

The homepage public model should continue exposing `leaderboardRows`, with each row gaining one additional display field:

- `seasonStanding`: integer standing derived from the sorted homepage leaderboard rows

The standing should be assigned after the homepage rows are sorted by the existing leaderboard rules. The first row always has standing `1`. Each later row should:

- reuse the previous standing when `seasonPoints` matches the prior row
- otherwise use its one-based row position in the sorted list

The homepage leaderboard table should add one new visible column:

1. season standing
2. season total
3. player
4. one column per `leaderboardEvents` entry

The breakdown row `colspan` must increase by one so the expanded breakdown still spans the full table width.

## Data Flow

The relevant homepage path after this change should be:

1. build the existing homepage leaderboard rows, event overview, and breakdown data
2. sort rows using the existing season-points and player-name rules
3. walk the sorted rows once to assign `seasonStanding`
4. pass display-ready rows to the homepage template
5. render the new season-standing cell ahead of the total-points cell

## Ranking Rules

The standing must follow shared-place ranking:

1. higher `seasonPoints` ranks ahead of lower `seasonPoints`
2. equal `seasonPoints` values share the same standing
3. the next non-tied player uses their absolute row position, producing gaps after ties

Examples:

- `30, 24, 18` becomes `1, 2, 3`
- `30, 30, 18` becomes `1, 1, 3`
- `30, 24, 24, 10` becomes `1, 2, 2, 4`

The existing name-based tie ordering should still control display order among tied players, but it must not affect the shared standing value.

## Rendering And Interaction

The homepage leaderboard should render a `Season Standing` column header and a corresponding data cell for each player row.

Rendering details:

- The new standing column should display the integer standing only.
- The new column should appear before the season-total column so the user can scan place first, then points.
- The player disclosure and breakdown interaction should remain unchanged.
- The detailed breakdown row should still align with the full table by using an updated `colspan`.

No additional visual treatment is required beyond fitting into the existing table layout and alignment conventions.

## Error Handling And Edge Cases

- If the homepage leaderboard is empty, the existing empty-state behavior should remain unchanged.
- A row must always receive a standing when it exists in `leaderboardRows`.
- Tied players must share the same standing even if their names differ or sort differently by decoded display name.
- The standing should be derived from final displayed `seasonPoints`, not from any intermediate total before homepage row enrichment.

## Testing And Verification

Follow strict TDD:

1. add a failing homepage public-model test asserting `seasonStanding` values on leaderboard rows
2. run the focused test and confirm it fails because the field is missing or incorrect
3. implement the minimal model change to assign standings
4. add a failing homepage render test asserting the `Season Standing` header and row cells
5. implement the minimal template change, including the updated breakdown `colspan`
6. rerun focused tests until green
7. rerun the full automated suite

Required coverage:

- `buildPublicModel()` exposes `seasonStanding` on homepage leaderboard rows
- standings increment normally when totals are distinct
- tied `seasonPoints` share the same standing with skipped positions after the tie
- generated homepage HTML contains the `Season Standing` header
- generated homepage HTML renders standing values in each leaderboard row
- generated homepage HTML keeps the breakdown row aligned after the extra column is added

Required verification:

- run focused leaderboard/homepage coverage in `tests/siteBuildCommand.test.js`
- run any focused leaderboard query or homepage model tests that cover the new ranking field
- run the full `npm test` suite

## Acceptance Criteria

1. The homepage leaderboard includes a `Season Standing` column.
2. Each leaderboard row shows the player's current place in the season.
3. Players tied on season points share the same standing.
4. The next player after a tie uses shared-place ranking with skipped positions.
5. Existing leaderboard totals, player disclosure, and event overview columns continue to render correctly.
6. The expanded breakdown row still spans the full table width.
7. Automated tests cover both the public-model standing field and rendered homepage output.
