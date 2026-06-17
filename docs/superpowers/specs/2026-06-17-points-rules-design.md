# Design: Public Points Rules

## Context

The site already computes scoring correctly and documents the rules in `point-rules.md`, but public visitors currently have to infer how points work from leaderboard totals and expanded breakdown tables. The request is to add the points rules to the public site so users can quickly understand how points are calculated.

The current public site has two primary entry points:

- the homepage leaderboard at `/`
- event detail pages at `/events/:slug/`

The site also already uses a panel-based visual language and Eleventy templates, so the new rules content should fit into that existing structure without changing site behavior or introducing runtime JavaScript.

## Goals

- Help visitors quickly understand the main scoring rules from both the homepage and event pages.
- Add a dedicated public page at `/points-rules/` for the full explanation.
- Keep the homepage and event pages scannable by showing a short summary plus a link to the full rules.
- Keep the rules content consistent across all public pages by deriving it from one shared source in the build.

## Non-Goals

- Changing any scoring calculations or leaderboard ordering.
- Parsing arbitrary Markdown into rich page sections at runtime.
- Reworking the existing leaderboard or event scoreboard layouts beyond adding the rules panels.
- Moving the canonical internal rules source away from `point-rules.md`.

## Chosen Approach

Add one shared scoring-rules content structure to the public model, render a compact summary panel on both the homepage and event pages, and add a dedicated `/points-rules/` page for the full explanation.

This is the smallest change that satisfies the request. It gives users immediate context where they already are, while keeping one canonical public destination for the complete rule explanation. It also avoids cluttering the homepage and event pages with the full duplicate-tag policy text, which is important but not part of the quick-scan experience.

## Content Strategy

The public summary shown on the homepage and event pages should include only the most important scoring concepts:

- attendance: `2` points
- placement bands: `1st 8`, `2nd 6`, `3rd 5`, `4th 4`, plus top-half and top-75-percent placement points
- starting tag bonus: `+1` per worse tag at the event, capped at `6`
- tag `#1` bonus: `+2`
- beat-your-tag bonus: `+1`, `+2`, or `+3` based on improvement bands
- a short tie note explaining that tied players share placement points
- a clear call to action linking to `/points-rules/`

The dedicated `/points-rules/` page should provide the fuller explanation in clear sections. That page should include the duplicate starting-tag rules because they are too detailed for the summary cards but still belong in the public rule reference.

## Implementation Shape

Add a shared `pointsRules` object to the public model. That object should contain display-ready content for both the summary cards and the full rules page.

Recommended shape:

- `summaryTitle`
- `summaryIntro`
- `summaryItems`: ordered array of short rule summaries
- `summaryTieNote`
- `fullPageTitle`
- `fullPageIntro`
- `sections`: ordered array of full-rule sections
- `href`: `/points-rules/`

Each `summaryItems` entry should include:

- `label`
- `detail`

Each full-page section should include:

- `title`
- `items`: ordered array of strings or short paragraphs

The content should be explicit and hand-curated in code rather than generated automatically from `point-rules.md`. This keeps the public copy concise, stable, and easy to control. `point-rules.md` remains the canonical source document for internal rule wording and traceability, but the site should render a purpose-built presentation layer.

## Template Changes

Add one reusable include for the compact summary panel and render it in both existing public entry points:

1. homepage leaderboard page
2. event detail page

The summary panel should use the existing panel treatment and contain:

- a short heading such as `How points work`
- the compact summary items
- the tie note
- a link to the full rules page

Add a new Eleventy page at `site/points-rules.njk` for `/points-rules/`. That page should:

- use the existing site layout
- render the full title and intro
- render the rules in grouped sections with readable spacing
- include a link back to the homepage

## Placement

Homepage placement:

- render the summary panel near the leaderboard section so the rules explanation is visible where users first inspect season totals

Event page placement:

- render the summary panel near the event scoreboard or event metadata so visitors can connect per-event point totals to the rule summary without leaving the page

The exact placement should preserve the current reading order and avoid interrupting the main scoreboard content.

## Data Flow

The relevant build path after this change should be:

1. build the existing public homepage and event-page models
2. derive one shared `pointsRules` display object during public-model construction
3. expose `pointsRules` at the top level of `publicModel`
4. render the homepage summary panel from `publicModel.pointsRules`
5. render the event-page summary panel from `publicModel.pointsRules`
6. render `/points-rules/` from the same `publicModel.pointsRules`

## Error Handling And Edge Cases

- If rule wording changes later, only the shared `pointsRules` source needs updating for all public pages to stay aligned.
- If the homepage has no events yet, the rules summary should still render normally because it explains scoring independent of schedule state.
- If an event page exists, the summary panel should render even if the scoreboard is sparse or includes DNF rows.
- The full rules page should not depend on event data being present.

## Testing And Verification

Follow TDD:

1. add failing public-model assertions for the new `pointsRules` object
2. run the focused tests and confirm they fail for missing rules data
3. implement the minimal public-model change
4. add failing homepage and event-page rendering assertions for the summary panel and `/points-rules/` link
5. add failing build assertions for the new `/points-rules/` page output
6. implement the minimal template and styling changes
7. rerun focused tests until green
8. rerun the full `npm test` suite

Required coverage:

- `buildPublicModel()` exposes shared points-rules summary and full-page content
- generated homepage HTML includes the summary panel and link to `/points-rules/`
- generated event-page HTML includes the same summary panel and link to `/points-rules/`
- generated `/points-rules/` HTML includes the full rules content, including duplicate starting-tag guidance

Required verification:

- run focused coverage in `tests/siteBuildCommand.test.js`
- run the full `npm test` suite

## Acceptance Criteria

1. The homepage displays a compact points-rules summary with a link to `/points-rules/`.
2. Event pages display the same compact points-rules summary with a link to `/points-rules/`.
3. A new public page exists at `/points-rules/`.
4. The dedicated rules page includes the fuller scoring explanation, including duplicate starting-tag rules.
5. The public rules content is driven from one shared source in the build so homepage, event pages, and the rules page stay consistent.
6. Scoring behavior and leaderboard calculations remain unchanged.
7. Automated tests cover the shared data shape and all new rendered outputs.
