# Admin Scoreboard Playwright E2E Design

## Context

This repository already has Playwright setup planning but does not yet have browser E2E specs. The current application behavior that matters most for browser coverage is the admin import flow at `/admin/login` and `/admin/events/new`, followed by the two public scoreboard surfaces:

- the season leaderboard at `/`
- the per-event scoreboard at `/events/[slug]`

The admin import path supports a UDisc-backed preview, a participant review step, confirmation into persisted in-memory event data, and then public rendering through `publicEventsQuery` and `leaderboardQuery`. The goal of this change is to design a stable, happy-path Playwright suite that proves scoreboard correctness after admin actions without depending on live UDisc network behavior.

## Goals

- Add a first Playwright E2E spec set centered on admin happy paths.
- Verify that confirmed imports render correctly on both the home leaderboard and event scoreboard pages.
- Cover a realistic multi-event season, not just a single import.
- Keep the suite deterministic by avoiding live UDisc dependencies.
- Prove major-event scoring is reflected correctly in public standings.

## Non-Goals

- Do not cover auth failures, invalid shared secret handling, or redirect edge cases.
- Do not cover malformed preview payloads, rollback paths, or upstream UDisc failures.
- Do not verify every possible scoring permutation in browser tests; unit and integration tests already cover core scoring logic.
- Do not introduce cross-browser coverage in the first pass.
- Do not make browser tests depend on production UDisc APIs.

## Approach Options Considered

### Recommended: Seeded app state plus mocked import flow

Run the real browser UI against the real app, seed or reset the in-memory stores for deterministic test state, and intercept the UDisc import path to return canned payloads.

Why this is recommended:

- It covers the actual admin and public browser flows that users see.
- It keeps the suite deterministic and fast enough for regular use.
- It avoids live-network flake while still verifying persistence and public rendering.
- It fits the app's current in-memory storage model well.

Tradeoffs:

- It requires a small test-only seam for resetting and seeding store state.
- It introduces a test fixture layer that must stay aligned with the import contract.

### Alternative: Fully mocked browser-only tests

Mock all app-side dependencies and assert only UI transitions in the browser.

Why not now:

- Confidence is lower because persisted scoreboard correctness would not be exercised end to end.
- It is easier for the mocked UI behavior to drift from the app's actual server action wiring.

### Alternative: Local fixture endpoint for import responses

Add a local test-mode endpoint or alternate fetch path that serves canned import payloads.

Why not now:

- It adds more application-side plumbing than necessary for the first pass.
- Browser-level interception is sufficient for happy-path coverage and keeps the app surface smaller.

## Recommended Design

### Coverage Shape

The first E2E pass should stay happy-path only and prove the full flow from admin sign-in to public scoreboard rendering.

The suite should include these specs:

- `admin can sign in and reach the event import page`
- `admin can import the kickoff event with 10 new players`
- `kickoff event scoreboard renders correctly without starting tags`
- `admin can import event two with 8 returning and 2 new players`
- `admin can import event three with 7 returning and 3 new players`
- `admin can import a major event and see multiplied scoring reflected publicly`
- `season leaderboard reflects all four events with correct totals, event counts, ties, and rank display`

This is intentionally slightly redundant across import and public-page checks. That redundancy is valuable because the main purpose of the suite is not just admin UI smoke coverage, but confidence that the scoreboard outputs remain correct after realistic inputs.

### Season Fixture Model

The fixture model should describe a four-event season.

#### Event One: Kickoff Event

- slug example: `kickoff-event`
- 10 participants
- all 10 participants are new players
- no players should match existing records
- no starting tags should be entered or required
- all tag-based scoring columns should resolve to zero

This event proves the season can bootstrap entirely from imported new players.

#### Event Two

- 10 participants total
- 8 returning players from event one
- 2 brand-new players
- starting-tag review is required for the 8 matched players
- unmatched players are created on confirm

This event proves the mixed import path of matched and unmatched players.

#### Event Three

- 10 participants total
- 7 returning players
- 2 of those returning players must be players who appeared in event one but skipped event two
- 3 brand-new players

This event proves matching is based on known player identity, not just participation in the immediately preceding event.

#### Event Four: Major Event

- slug example: `season-major`
- marked as `isMajor`
- participant mix should be mostly returning players so the assertions can focus on scoring effects
- expected multiplier is `2x` based on the current scoring rules in `lib/scoreEvent.js`

This event proves that major-event multiplier behavior propagates correctly through event-level and season-level public views.

By the end of event four, the season should contain 15 total players:

- 10 created in event one
- 2 created in event two
- 3 created in event three

### Test Data Structure

The E2E fixture data should live in a dedicated module and describe:

- event metadata
- ordered participant input
- which participant rows should match existing players during review
- which participant rows should be treated as new players
- starting-tag entries required during review
- expected event scoreboard assertions
- expected season leaderboard assertions after selected milestones

The fixture data should avoid opaque snapshots. Expected values should stay readable in code so failures explain what changed.

### Test Seams

The suite should use three small deterministic seams.

#### Reset And Seed Seam

Add a test-only way to reset the in-memory stores before each spec or before each grouped scenario. This seam should support:

- clearing `eventsData`
- clearing draft-event state if needed
- optionally pre-seeding known players when a scenario requires it

For this specific four-event season, the normal baseline should be empty store state before the kickoff event.

#### Admin Auth Seam

Use a deterministic test shared secret and drive the real `/admin/login` form in the browser.

Why this is preferred:

- it covers the real sign-in flow once
- it avoids hidden storage-state magic in the first pass
- it keeps the tests readable

If repeated login becomes too expensive later, a shared authenticated storage state can be added as a follow-up optimization.

#### Mocked UDisc Import Seam

Intercept the import fetch path and return canned payloads for each fixture event.

Requirements:

- no external network dependency
- payloads must match the app's current preview contract
- one fixture should map to one deterministic import scenario

The tests should not attempt to verify UDisc itself. They should verify how this app handles imported data once it arrives.

### Helper Functions

Keep helpers minimal and focused on repeated browser actions:

- `loginAsAdmin(page)`
- `importFixtureEvent(page, fixture)`
- `reviewMatchedPlayers(page, fixture)`
- `confirmImport(page)`
- `assertEventScoreboard(page, expected)`
- `assertHomeLeaderboard(page, expected)`

These helpers should avoid burying assertions in too many abstractions. The final specs should still read like clear scenarios.

## Assertion Strategy

### Admin Flow Assertions

Each import spec should assert:

- successful login reaches `/admin/events/new`
- preview content shows the expected event name and date
- matched participants are labeled as matched
- unmatched participants are labeled as new players
- starting-tag fields appear only for matched participants
- confirm success message includes the confirmed slug

For kickoff specifically, the review step should show no matched-player starting-tag fields because all players are new.

### Event Scoreboard Assertions

The event page assertions should be stronger than a smoke test because they are the clearest public output of the scoring logic.

For each checked event page, assert:

- the correct event title renders
- the expected number of participant rows renders
- row ordering matches `eventTotal` descending, with deterministic tie handling inherited from the app
- each asserted row contains the expected values for:
  - player name
  - starting tag
  - attendance
  - event result
  - placement
  - starting tag bonus
  - tag #1 bonus
  - beat your tag bonus
  - event total

For kickoff, explicitly assert that players without starting tags render empty starting-tag cells and zero tag-based bonus columns.

For the major event, explicitly assert a targeted set of rows whose totals make the `2x` multiplier obvious, such as:

- the winner
- a mid-pack finisher
- a low finisher

### Season Leaderboard Assertions

The home page assertions should focus on leaderboard correctness and readability.

Assert:

- displayed rank
- player name
- events played
- season points

The suite should verify the leaderboard after all four events, and it may also verify selected intermediate states after event two or event three if that makes failures easier to localize.

Important checks:

- `Events Played` increments correctly across skipped events
- final player pool contains 15 season players
- standings reshuffle as later events and the major are imported
- shared-rank display is correct where point totals tie

## Data Flow And Runtime Behavior

1. Reset application stores to a known empty baseline.
2. Open `/admin/login` and sign in with the deterministic test secret.
3. Open the admin new-event page.
4. Trigger the import flow for a fixture event.
5. Intercept the UDisc-backed preview request and return the fixture payload.
6. Complete participant review, including starting-tag entry where required.
7. Confirm the import.
8. Navigate to `/events/[slug]` and verify the public event scoreboard.
9. Navigate to `/` and verify leaderboard state after the imported events.

This flow should repeat across the four-event season in a way that preserves continuity of accumulated state where needed.

## Scope And Isolation

There are two valid ways to structure continuity:

- one spec that imports multiple events sequentially and verifies cumulative outcomes
- a small number of specs that each seed the exact prior state they require

The recommended structure is mixed:

- keep login coverage independent
- let the season progression specs build on sequential imports within a single scenario where continuity matters
- keep at least one public rendering spec separated enough to localize failures cleanly

This balances reliability with debuggability. Purely isolated per-event browser specs would require heavier reseeding logic, while one giant end-to-end spec would be harder to diagnose.

## Error Handling

The first pass does not add negative-path browser coverage. If a happy-path Playwright test fails, the useful failure modes should come from:

- preview not rendering as expected
- review form state not matching fixture expectations
- confirm import not persisting the expected event
- public scoreboards rendering different totals, order, or counts than expected

Playwright traces and screenshots should be sufficient for diagnosis. No custom browser-test error UI is required for this phase.

## Verification Plan

Verification for this E2E addition should cover:

- Playwright can run the new specs against the local app server
- the test reset seam produces deterministic state between runs
- the mocked import seam avoids external network access
- kickoff import succeeds with 10 entirely new players
- event two and event three preserve correct matching behavior
- major-event totals are doubled as expected
- the final season leaderboard reflects all four confirmed events correctly

The existing `npm test` suite should continue to pass unchanged. The browser tests remain a separate execution path.

## Success Criteria

- The repo has Playwright happy-path coverage for admin sign-in and event import.
- The suite verifies both public scoreboard surfaces.
- The season fixture covers four events, including a kickoff, mixed returning/new events, and a major.
- Kickoff coverage proves imports without starting tags work correctly.
- Later event coverage proves matched-player review and new-player creation both work correctly.
- Event three proves returning-player matching still works after a skipped event.
- Major-event coverage proves the `2x` multiplier is reflected on event and season scoreboards.
- Final leaderboard coverage proves totals, event counts, ties, and rank display remain correct after multiple imports.
