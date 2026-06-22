# Design: Season Leaderboard Export Layout Adjustment

## Context

The season leaderboard image export now exists and generates a single poster-style PNG during the site build. The current export layout still includes a `Season Leaderboard` subheading, places the `Player` column before `Total`, and renders at `1080x1350`.

The requested change is a narrow, presentation-only revision to that export:

- remove the `Season Leaderboard` subheading from the exported image
- move the `Total` column to the left of the `Player` column
- reduce the actual exported image width from `1080` to `960` while keeping the height at `1350`

This is a refinement of the current export artifact, not a redesign of the leaderboard feature or a change to the public homepage.

## Goals

- Produce a `960x1350` portrait export instead of `1080x1350`
- Remove the extra export subheading from the image header
- Reorder the export table columns to `Rank`, `Total`, `Player`, then event columns
- Preserve the existing build-time export workflow and overflow protection

## Non-Goals

- Changing the public homepage leaderboard
- Changing season scoring, ordering, or the export data source
- Replacing the table-based export with a new visual format
- Adding new export sizes or multiple image variants

## Chosen Approach

Apply a minimal presentation update to the existing export template, CSS, and capture contract.

This keeps the current export architecture intact while directly addressing the requested visual changes. The export model does not need new fields for this revision because the existing `seasonPoints` data already supports moving the `Total` column earlier in the table.

## Export Contract Changes

The build-time export artifact changes from:

- `1080x1350`

to:

- `960x1350`

Any code, template, CSS, or tests that currently treat `1080x1350` as the fixed export size should be updated together so the artifact remains internally consistent.

## Layout Changes

### Header simplification

Remove the `Season Leaderboard` subheading line from the export header. The header should keep:

- season label
- main title

The dedicated subtitle styling for that removed line should also be removed if it is no longer used by the export.

### Column order

Change the export table order from:

- `Rank | Player | Total | event columns`

to:

- `Rank | Total | Player | event columns`

This is a presentation-only change. The export should still use the same row ordering and season totals it does now.

### Narrower frame

Reduce the export frame width from `1080px` to `960px` while keeping the height at `1350px`. The export root, viewport assertions, and any width-sensitive tests should all be updated to the same new value.

## Density Strategy

Because the export becomes narrower, the layout should tighten enough to make the narrower frame workable before relying on runtime compaction alone.

That includes modest adjustments such as:

- tighter cell padding
- smaller column widths where practical
- narrower overall header spacing

The existing compaction-and-overflow path remains the final protection layer. The build should still attempt compaction first and then fail clearly if the rendered export still cannot fit within `960x1350`.

## Data And Behavior

No new export-model concepts are required. The existing export data remains sufficient:

- season label
- title
- rows
- season points
- event headers

Only the export presentation order changes.

## Testing And Verification

Update the export-focused coverage so it reflects the new layout contract:

- export model tests should expect width `960`
- capture helper tests should expect viewport width `960` and updated overflow messaging
- build/template tests should assert:
  - no `Season Leaderboard` subheading line in the export page
  - `Total` appears before `Player` in the export table
  - fixed export dimensions are `960x1350`

Required verification:

- run focused export tests
- run full `npm test`
- run a real `npm run build`
- confirm `dist/season-leaderboard.png` is produced successfully

## Acceptance Criteria

1. The exported season leaderboard image is generated at `960x1350`.
2. The exported image no longer shows the `Season Leaderboard` subheading.
3. The export table column order is `Rank`, `Total`, `Player`, then event columns.
4. The existing build-time export flow remains intact.
5. Overflow handling still attempts compaction first and fails clearly if the export cannot fit within `960x1350`.
