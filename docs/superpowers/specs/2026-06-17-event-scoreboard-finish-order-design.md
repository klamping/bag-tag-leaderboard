# Design: Event Scoreboard Finish Order

## Context

The event page template renders `eventPage.scoreboard` in the order provided by the public-model layer. Today, the ordering is not explicitly aligned to finish placement display on the event page.

The requested change is to make the event scoreboard read like a standings table: players who finished better should appear first.

## Goals

- Show event-page scoreboard rows in ascending finish-place order.
- Put `DNF` rows after all numeric finish places.
- Keep the ordering deterministic when multiple players share the same finish place.
- Make the change in the data/query layer rather than the template.

## Non-Goals

- Changing the event scoring rules.
- Changing homepage leaderboard ordering.
- Reworking event-page markup or styling.
- Changing how bootstrap-event sanitizing zeroes tag-derived fields.

## Chosen Approach

Sort the event scoreboard rows in the public event query path before they are consumed by `buildPublicModel()`.

This keeps the event scoreboard display order close to the logic that already assembles and normalizes event rows. It also avoids pushing ordering rules into `site/events/event.njk`, where they would be less testable and easier to miss in other consumers.

## Ordering Rules

The event scoreboard should sort rows using these rules in order:

1. Rows with numeric `eventResult` sort before rows where `eventResult` is `null`.
2. Numeric `eventResult` values sort ascending, so `1` appears before `2`.
3. When two rows share the same `eventResult`, sort alphabetically by `playerName`.
4. If a further deterministic tie-break is needed after `playerName`, preserve the existing stable fallback behavior already used by the scoreboard query.

This means `DNF` rows always appear at the bottom of the scoreboard.

## Implementation Shape

The change should live in the public event scoreboard query logic, where rows are already assembled into the `scoreboard` array.

`buildPublicModel()` should continue to pass the ordered scoreboard through unchanged, except for the existing bootstrap-event sanitizing step. That sanitizing should preserve the already-computed row order.

`site/events/event.njk` should remain unchanged because it already renders rows in the provided order.

## Testing and Verification

Update unit coverage for the public event scoreboard query to assert the new ordering directly.

Required test coverage:

- numeric finish spots sort ascending
- shared finish spots break ties alphabetically by `playerName`
- `DNF` rows sort after all numeric finish spots

Required verification:

- run the focused public event scoreboard tests
- run the full automated test suite

## Acceptance Criteria

1. Event-page scoreboards display finishers in ascending finish-place order.
2. `DNF` rows appear after all finishers.
3. Rows tied on finish place are ordered alphabetically by player name.
4. The change is implemented in the query/data layer, not in the Nunjucks template.
5. Automated tests explicitly cover the new ordering behavior.
