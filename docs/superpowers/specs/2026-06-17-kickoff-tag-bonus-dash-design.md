# Design: Kickoff Tag Bonus Dash Display

## Context

The public site currently sanitizes the first event so kickoff rows do not expose starting tags or earned tag-based bonuses as real scoring values.

That sanitized kickoff data still renders numeric `0` values in the tag-based bonus columns. The requested behavior is to show `-` instead of `0` anywhere those kickoff tag-based bonus values are displayed.

## Goals

- Show `-` for kickoff-only tag-based bonus display values that are currently rendered as `0`.
- Keep scoring and totals numeric behind the scenes.
- Keep the change localized to public-model display shaping and rendering.

## Non-Goals

- Changing scoring rules or stored points.
- Replacing non-kickoff zero bonus values with dashes.
- Recomputing totals or changing season standings.

## Chosen Approach

Add kickoff-specific display fields in the public model for `startingTagBonus`, `tagOneBonus`, and `beatYourTagBonus`, and have templates render those display fields instead of the raw numeric values.

This preserves the existing numeric bonus fields for any totals or future calculations while keeping kickoff presentation logic centralized in the public-model layer rather than duplicated across templates.

## Implementation Shape

For kickoff scoreboard rows and homepage event-breakdown rows, add three display-ready fields:

- `startingTagBonusDisplay`
- `tagOneBonusDisplay`
- `beatYourTagBonusDisplay`

Rules:

1. For the kickoff event only, when the corresponding numeric bonus value is `0`, the display field should be `-`.
2. For the kickoff event only, if a corresponding numeric bonus value is ever non-zero, render the numeric value as-is.
3. For every non-kickoff event, the display field should mirror the numeric value.
4. Totals rows remain numeric and unchanged.

## Data Flow

1. Build event scoreboards as today.
2. Sanitize the bootstrap kickoff scoreboard as today so tag-derived numeric values remain zeroed.
3. Derive display fields from each scoreboard row based on whether the row belongs to the kickoff event.
4. Reuse those display-ready fields in homepage event-breakdown rows.
5. Render templates from the display-ready fields while continuing to use numeric fields for totals.

## Rendering Scope

The dash rule should apply anywhere the public site renders kickoff tag-based bonus columns from this public-model path, including:

- event detail scoreboard rows
- homepage player event-breakdown rows

The rule does not apply to totals cells or any non-tag-based columns.

## Error Handling And Edge Cases

- If a kickoff row somehow contains a non-zero tag-based bonus value, render that value rather than forcing a dash.
- If a non-kickoff row has a zero tag-based bonus, continue rendering `0`.
- If a display field is missing unexpectedly, templates should still have the numeric field available as the source of truth during implementation.

## Testing And Verification

Follow TDD:

1. add a failing test that asserts kickoff tag-based bonus displays use `-`
2. verify the test fails for the expected rendering reason
3. implement the minimal public-model and template changes
4. rerun the focused tests until green
5. rerun the broader relevant suite

Required coverage:

- kickoff event scoreboards render `-` for the three tag-based bonus columns
- homepage kickoff event-breakdown rows render `-` for the same columns
- non-kickoff bonus displays still render numeric values
- totals remain numeric and unchanged

## Acceptance Criteria

1. On the kickoff event, `startingTagBonus`, `tagOneBonus`, and `beatYourTagBonus` display as `-` instead of `0` anywhere those columns are shown publicly.
2. Non-kickoff events continue showing numeric values, including `0`.
3. Kickoff totals and all other numeric scoring values remain unchanged.
4. Automated tests cover kickoff and non-kickoff rendering behavior.
