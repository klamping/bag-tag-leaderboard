# Design: Optional Season Image Export

## Context

The site build currently generates the season leaderboard PNG as part of `bag-tag site build`. That behavior now creates friction in environments like Netlify where Playwright browser dependencies are not installed and the image export is not needed on every build.

The requested change is to make PNG export opt-in through a CLI flag so the default site build does not attempt image generation.

## Goals

- Keep normal site builds working without Playwright browser installation requirements
- Generate the season leaderboard PNG only when explicitly requested
- Preserve the current export implementation for local/manual use
- Keep the CLI behavior simple and discoverable

## Non-Goals

- Changing the export image layout or dimensions
- Removing the export feature entirely
- Adding CI-specific or environment-variable-based control in this version

## Chosen Approach

Add an explicit CLI flag on `site build`:

- `bag-tag site build --export-season-image`

Without that flag, the build should skip PNG generation entirely.

This is the best fit because it is explicit, easy to document, and keeps the default build path free of optional browser-export dependencies.

## Rejected Alternatives

### Environment variable only

An environment variable would work technically, but it is less discoverable than a first-class CLI argument and makes routine local use less obvious.

### Flag plus environment variable

Supporting both adds behavior surface area without solving a pressing problem. The single explicit flag is enough for the current need.

## Behavior

The `site build` command should accept an optional boolean flag:

- `--export-season-image`

Behavior by case:

1. without the flag
   - build the HTML/CSS site output normally
   - do not call `captureSeasonLeaderboardImage()`
   - do not require Playwright browser installation for a successful build

2. with the flag
   - keep the current PNG export behavior
   - if leaderboard data exists, attempt to generate the PNG
   - if leaderboard rows are absent, keep the existing skip behavior for missing data

The opt-in gate belongs in CLI/build orchestration, before the capture helper is called.

## Architecture

Add the export preference at the CLI command layer and pass it into `siteBuildCommand()` as an option.

Recommended flow:

1. parse `site build` arguments
2. derive `shouldExportSeasonImage`
3. pass that boolean into `siteBuildCommand()`
4. in `siteBuildCommand()`, only invoke `captureSeasonLeaderboardImage()` when both:
   - the flag is enabled
   - exportable leaderboard data exists

This keeps the capture helper unchanged. It remains responsible only for turning an already-requested export page into a PNG.

## Testing And Verification

Required test updates:

- CLI argument-routing coverage should verify `site build --export-season-image` reaches `siteBuildCommand()` with the export option enabled.
- `siteBuildCommand` coverage should verify:
  - default builds do not call the capture helper
  - flagged builds do call the capture helper
  - default builds still succeed without export
- Existing PNG integration tests should become explicit opt-in tests instead of assuming export always runs.

Required verification:

- run focused CLI/build tests
- run full `npm test`
- run `npm run build` and confirm it succeeds without requiring PNG export
- run `node ./bin/bag-tag.js site build --export-season-image` and confirm the PNG is generated when local Playwright prerequisites are available

## Acceptance Criteria

1. `bag-tag site build` no longer attempts season leaderboard PNG generation by default.
2. `bag-tag site build --export-season-image` still generates the PNG using the existing export flow.
3. Normal site builds succeed without requiring Playwright browser installation for image export.
4. Automated tests cover both default-off and explicit-opt-in behavior.
