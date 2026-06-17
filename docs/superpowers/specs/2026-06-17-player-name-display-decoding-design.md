# Design: Player Name Display Decoding

## Context

Imported UDisc data can contain HTML entities inside player names, such as `Troy &quot;NoGripp&quot; Hauck`.

The current public-site pipeline carries `playerName` values straight through to the rendered templates, so those encoded entities appear literally in the generated HTML.

The requested behavior is to preserve imported data exactly as stored while decoding player names only at display time.

## Goals

- Preserve canonical player and import data unchanged.
- Decode HTML entities in player names only in the public display path.
- Ensure rendered public output shows `Troy "NoGripp" Hauck` instead of the encoded source value.
- Keep the fix small and local to the public-model layer.

## Non-Goals

- Rewriting imported JSON or canonical store records.
- Introducing a broad sanitization layer for all fields.
- Changing event ordering, scoring, or site styling.
- Decoding names during import or persistence.

## Chosen Approach

Decode player-name display values in `buildPublicModel()` before they reach the site templates.

This keeps the change inside the public presentation pipeline and avoids mutating imported records or mixing presentation cleanup into persistence. It also keeps templates simple because they continue rendering `playerName` normally.

## Implementation Shape

Add a small helper that decodes HTML entities in display strings used by the public model.

Apply that helper to public-facing `playerName` fields produced for:

- homepage leaderboard rows
- event-page scoreboard rows

The helper should be limited to display-time use. Query helpers and stored data should continue returning raw values.

## Data Flow

The relevant path after this change should be:

1. load canonical store and imported event data unchanged
2. assemble public rows as usual
3. decode player-name display strings while building the public model
4. render templates using the decoded display values

## Error Handling

- If a player name contains no HTML entities, it should pass through unchanged.
- If a player name is missing, existing fallback behavior should remain unchanged.
- The decode step should not throw for ordinary string input.

## Testing and Verification

Follow strict TDD:

1. add a failing test that proves encoded player names are decoded in public output
2. run the focused test and confirm it fails for the expected reason
3. implement the minimal display-time decode change
4. rerun the focused test until green
5. rerun the relevant broader test set

Required coverage:

- `buildPublicModel()` decodes encoded player names for event-page scoreboard rows
- if homepage rows can surface encoded names from canonical player records, public-model coverage should also assert homepage decoding
- rendered site output contains the decoded name rather than the encoded source string

Required verification:

- run the focused public-model/site-build tests
- run the broader automated suite relevant to the touched files

## Acceptance Criteria

1. Stored import data still contains the original encoded player name.
2. Public model output exposes decoded player names for rendered site views.
3. Generated public HTML displays `Troy "NoGripp" Hauck`.
4. No template-specific manual decoding logic is required.
5. Automated tests explicitly cover the display-time decoding behavior.
