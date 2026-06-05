# Phase 5 Design: Starting Tag Entry + Validation

## Context

Phase 4 now imports UDisc leaderboard preview data from a public UDisc leaderboard URL into the admin draft event flow. The next step is to enrich that preview with season-aware starting tag entry for returning players before the later confirm-import phase writes any persistent event results.

The league rule expectation for this phase is:

- only returning players need explicit starting tag entry
- new/unmatched players should remain in the preview without a required starting tag yet
- ambiguous player identity should fail closed rather than silently guessing

This phase should preserve the existing draft-preview flow while adding deterministic player matching and row-level validation.

## Goals

- Match imported preview participants against known season players.
- Require starting tag entry only for matched returning players.
- Preserve unmatched participants as new-player candidates without blocking on tag entry.
- Fail closed on ambiguous matches.
- Produce a validated, enriched preview state that Phase 6 can consume for confirm-import.

## Non-Goals

- Manual ambiguity-resolution UI.
- Final event confirmation/import persistence.
- Post-confirm edits or audit history.
- New-player tag assignment rules beyond carrying those players forward as unmatched preview rows.

## Recommended Approach

Extend the current `/admin/events/new` preview workflow rather than introducing a separate page. After Phase 4 preview succeeds, enrich preview participants with deterministic match metadata and render a participant review section on the same admin page. Matched returning players receive required starting-tag inputs; unmatched players are displayed as new-player candidates without tag inputs.

This keeps the workflow minimal, reuses the existing redirect/form patterns, and avoids introducing additional preview state transitions before Phase 6.

## Architecture

### 1) Preview boundary stays unchanged

- `lib/udiscClient.js` continues scraping leaderboard data.
- `lib/udiscToDraftPreview.js` continues mapping raw scraped data into the app-owned preview contract.
- Phase 5 begins after preview data already exists.

### 2) New participant review boundary

Introduce a dedicated helper for preview participant review state, responsible for:

- loading known players from existing app data
- matching preview participant names to known players
- classifying each participant row
- validating starting tag inputs for matched rows
- returning an enriched preview object suitable for later confirm-import

This logic should live outside the page component so it can be reused by Phase 6 instead of recomputing or reinterpreting admin input in multiple places.

### 3) Admin page integration

`/admin/events/new` should:

- continue accepting the UDisc leaderboard URL
- render preview event details as it does now
- render participant review rows once preview exists
- accept starting-tag inputs for matched returning players
- surface row-level validation errors when tags are missing/invalid/duplicate

## Matching Rules

### Matching source

- Use existing player data already available through the app's current event/player data access layer.
- Match by deterministic player-name normalization.

### Name normalization

Canonical matching should use a single normalization strategy applied consistently to imported participant names and known player names:

- trim leading/trailing whitespace
- lowercase
- collapse internal whitespace

Do not add fuzzy matching, nickname heuristics, or punctuation-stripping in this phase. Fail closed rather than introducing clever-but-unreliable matching behavior.

### Match outcomes

Each preview participant must be classified as exactly one of:

- `matched`: exactly one known player matches the normalized imported name
- `unmatched`: no known player matches; treat as new player for now
- `ambiguous`: more than one known player matches the normalized name

### Ambiguity behavior

- `ambiguous` rows block advancing to the validated preview state.
- The UI should surface a clear participant-level error explaining that the imported player could not be uniquely matched.
- Manual resolution is deferred to a later phase; this phase should not guess.

## Starting Tag Rules

### Required rows

Only `matched` returning-player rows require explicit `startingTag` input.

### Unmatched rows

`unmatched` rows:

- remain visible in the review UI
- are labeled as new players
- do not require a tag in this phase

### Validation rules

For each `matched` row, `startingTag` must be:

- present
- parseable as an integer
- greater than or equal to `1`

Additionally, the validated participant set should reject duplicate starting tags among matched returning players for the same event. While lower-level scoring logic tolerates equal tags, the admin workflow should protect live event integrity by treating duplicate entered starting tags as invalid input.

## Preview Contract Extension

Extend preview participant rows with review metadata owned by the app. Each participant row should support fields equivalent to:

- `playerName`
- `externalPlayerId?`
- `finishPlace`
- `matchStatus` (`matched`, `unmatched`, `ambiguous`)
- `matchedPlayerId?`
- `matchedPlayerName?`
- `startingTag?`

The enriched preview state should preserve imported leaderboard order so the admin reviews the same player ordering seen from UDisc.

## UI Behavior

After preview fetch succeeds on `/admin/events/new`:

- show the preview event summary
- render participant review rows below it

For `matched` rows, display:

- imported participant name
- matched known player name
- required `startingTag` input

For `unmatched` rows, display:

- imported participant name
- status label such as `New player`
- no tag input

For `ambiguous` rows, display:

- imported participant name
- ambiguous-match status/error
- no successful advance until resolved in a later phase

## State and Persistence

Phase 5 should remain preview-oriented. It should not create confirmed event results or mutate season standings.

The output of this phase is a validated preview state that includes:

- event metadata
- imported participants
- match classifications
- entered starting tags for matched returning players

Phase 6 should consume this enriched preview state directly rather than re-matching from scratch.

## Error Handling

- Missing or invalid starting tags should surface as participant-row field errors.
- Duplicate entered starting tags should surface as participant-row or form-level validation errors.
- Ambiguous player matches should surface clearly and block progress.
- Unmatched/new-player rows should not be treated as validation failures by themselves.

## Testing Strategy

### Matching tests

Add focused tests for the new participant review helper covering:

- exact normalized match to one known player
- no match -> `unmatched`
- duplicate normalized known-player names -> `ambiguous`
- deterministic normalization behavior

### Validation tests

Add tests covering:

- matched row missing `startingTag`
- non-integer `startingTag`
- `startingTag < 1`
- duplicate starting tags across matched returning players
- unmatched row requiring no tag

### Admin page/action tests

Add tests covering:

- preview rendering with participant review rows
- matched rows rendering required tag inputs
- unmatched rows rendering as new-player labels only
- validation failures surfacing row-level errors
- successful validated-preview submission carrying enriched participant data forward

## Acceptance Criteria

1. Imported preview participants are classified deterministically as `matched`, `unmatched`, or `ambiguous`.
2. Only matched returning players require starting-tag entry.
3. Unmatched/new players remain in preview without tag-entry requirement.
4. Ambiguous matches fail closed and block advancement.
5. Starting-tag validation rejects missing, non-integer, `< 1`, and duplicate entered tags for matched rows.
6. The admin workflow produces a validated enriched preview state for Phase 6 without confirming event results yet.
