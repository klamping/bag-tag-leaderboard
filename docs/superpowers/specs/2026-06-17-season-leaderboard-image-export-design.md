# Design: Season Leaderboard Image Export

## Context

The site already builds a public homepage leaderboard from a shared public model and renders it as a horizontally scrollable HTML table. The new request is to export the season leaderboard as a single image that is ready to post on Facebook.

The requested constraints are:

- generate the export during the site build rather than from a public-page button
- write the artifact into the built site output
- include the full season leaderboard by default
- target a portrait `1080x1350` image first
- prefer including every player on one image over preserving larger text sizes
- use a cleaner social-post treatment derived from the current site theme rather than duplicating the homepage exactly

The current stack is a static Eleventy site with a Node-based build command and an existing public-model layer, so the export should fit that architecture instead of introducing an unrelated runtime workflow.

## Goals

- Produce a single Facebook-ready PNG during `npm run build`.
- Write the PNG into `dist` with the rest of the public build output.
- Reuse the existing season leaderboard ordering and scoring data.
- Render a portrait layout specifically designed for social posting.
- Keep the export deterministic and trustworthy so a successful build always means a usable image was generated.

## Non-Goals

- Adding a homepage button or interactive UI for generating the image.
- Changing leaderboard calculations, ordering rules, or season data selection.
- Replacing the current homepage leaderboard markup.
- Supporting multiple image sizes in the first version.
- Splitting the leaderboard across multiple images in the first version.

## Chosen Approach

Generate a dedicated export-only HTML page during the site build, then capture that page as a PNG with a headless browser and write the result into `dist`.

This is the best fit for the existing codebase because it keeps the current public model as the source of truth, uses the site's existing HTML/CSS rendering strengths, and avoids re-implementing layout logic in a server-side graphics library. It also allows the export layout to diverge from the homepage enough to fit a portrait social-post format without changing the public browsing experience.

## Rejected Alternatives

### Screenshot the homepage leaderboard directly

This is smaller on paper, but the homepage leaderboard is optimized for horizontal browsing, not a fixed portrait graphic. Reusing it directly would either produce a cramped image or require brittle homepage-specific screenshot overrides.

### Draw the image directly with a canvas or image library

This would avoid a browser dependency, but it would require custom drawing code for typography, row layout, spacing, alignment, and theme styling. That is a larger and less maintainable change than rendering HTML and capturing it.

## Architecture

The build path should gain one export-specific branch that sits alongside the existing public-site generation:

1. build the existing `publicModel`
2. render the normal public pages as today
3. render one dedicated leaderboard-image HTML page from the same leaderboard data
4. load that generated page in a headless browser at fixed dimensions
5. capture the export region to a PNG
6. write the PNG into `dist`

The export HTML page is an implementation detail of the build pipeline. It may be written into `dist` temporarily or as a hidden/internal page, but the primary deliverable is the PNG artifact.

## Data Shape

The export should consume the existing homepage leaderboard data rather than introducing a second leaderboard query. The source of truth remains:

- `publicModel.homepage.leaderboardRows`
- `publicModel.homepage.leaderboardEvents`

To keep templates simple, add a small derived export view model before rendering the export page. Recommended shape:

- `title`
- `subtitle`
- `seasonLabel`
- `generatedLabel`
- `rows`
- `eventHeaders`
- `filename`

Each export row should contain only display-ready fields needed by the image template, such as:

- `rank`
- `playerName`
- `seasonPoints`
- `eventOverview`

This derived model should not recompute points. It is only a presentation adapter over the existing homepage leaderboard output.

## Export Layout

The exported image should use a dedicated portrait composition at `1080x1350`.

Recommended structure:

1. header area with season title and lightweight subtitle
2. main leaderboard panel with the full player list
3. footer area with subtle site branding or context text

The leaderboard body should preserve the current content priorities:

1. season total
2. player name
3. per-event point cells

The layout should be inspired by the current theme colors and overall tone, but simplified for a cleaner social graphic. That means keeping recognizable palette cues while using tighter spacing, clearer contrast, and more deliberate poster-style composition than the browser page uses.

## Density Strategy

The required constraint is to keep every player on one image, so the export must optimize for vertical density before considering omission.

Allowed density adjustments:

- reduced row padding
- reduced font sizes within readable bounds
- shortened event headers using the existing compact dates
- compact header and footer spacing
- narrower decorative treatment than the public homepage

The export should not silently crop rows or overflow beyond the bottom edge. If the season grows past what can fit inside the fixed portrait frame after the allowed compaction steps are applied, the build should fail with a clear error describing that the current season leaderboard exceeds the supported single-image bounds.

## Template And Styling Strategy

Add a dedicated export template, such as `site/season-leaderboard-image.njk`, rather than trying to branch heavily inside `site/index.njk`.

Add dedicated CSS selectors for the export page/layout instead of reusing the homepage leaderboard classes directly. Shared tokens like colors or type scale can still be reused, but the export should have its own class names so it remains easy to tune without destabilizing the homepage.

The export template should avoid interactive elements such as `<details>` and should render a single static representation of the leaderboard intended only for image capture.

## Build Integration

The site build command should gain an export step after the HTML and CSS are available.

That step should:

1. locate the generated export page
2. open it in a headless browser with the target viewport
3. wait for the export root element to be fully rendered
4. validate that the content fits within the expected bounds
5. capture the export root as a PNG
6. write the file into `dist`

If the browser-based export dependency needs lazy setup, it should be isolated behind a small helper so the build command remains readable and the dependency boundary stays testable.

## Output Contract

The first version should emit one deterministic PNG file into `dist`. A stable filename such as `season-leaderboard.png` is sufficient unless the existing build already prefers dated or slugged artifact names.

The artifact contract is:

- file exists after a successful build
- file dimensions are `1080x1350`
- file contains the current season leaderboard in build order

## Error Handling And Edge Cases

- If there are no homepage leaderboard rows, skip PNG generation and log that no export was produced.
- If the export page cannot be rendered or loaded for capture, fail the build.
- If the screenshot step throws, fail the build.
- If the rendered leaderboard exceeds the fixed portrait bounds, fail the build with an explicit overflow error instead of shipping a clipped image.
- If a player missed an event, the export should render the same blank event cell behavior used by the homepage leaderboard.
- If a player has a visible zero-point event value, the export should render `0` explicitly.

## Testing And Verification

Follow TDD:

1. add failing tests for any new export view-model shaping logic
2. add failing build-command coverage for generating the export page and invoking PNG output
3. implement the minimal model and template changes
4. implement the minimal capture helper and build integration
5. rerun focused tests until green
6. rerun the full `npm test` suite

Required coverage:

- export view-model derives from existing homepage leaderboard data without changing scoring
- build path skips export cleanly when there are no leaderboard rows
- build path fails clearly when capture fails
- build path writes the PNG artifact into `dist` on success
- export template renders full leaderboard rows in the expected order
- export uses portrait dimensions and fit validation

Required verification:

- run focused coverage in `tests/siteBuildCommand.test.js`
- run the full `npm test` suite
- run a real build and confirm the PNG artifact is produced in `dist`

## Acceptance Criteria

1. `npm run build` generates a single PNG season leaderboard export in `dist` when leaderboard rows exist.
2. The PNG uses the existing season leaderboard ordering and totals.
3. The PNG targets a portrait `1080x1350` Facebook-ready format.
4. The export uses a dedicated social-post layout derived from the existing site theme rather than a raw screenshot of the homepage.
5. The export includes every leaderboard player on one image when the content fits within supported density bounds.
6. The build fails clearly instead of clipping content when the leaderboard cannot fit within the single-image portrait layout.
7. Automated tests cover the new export data path and build integration behavior.
