# Design: Beach Flyer Site Theme

## Context

The public site currently uses a very small Eleventy surface area:

- `site/_includes/layout.njk`
- `site/index.njk`
- `site/events/event.njk`
- `site/styles/site.css`

The markup is already clean and simple, but the visual presentation is intentionally minimal. The site currently reads as a neutral utility page rather than a league or event destination.

The chosen design direction is `Beach Flyer`: a tournament-poster look with summer rec-league energy.

## Goals

- Give the site a distinctive themed identity instead of a plain utility look.
- Make the homepage feel like a summer league poster and leaderboard hub.
- Make event pages feel like event-specific score posters around the existing scoreboard data.
- Preserve readability of standings and scoring tables.
- Keep the implementation compatible with the current Eleventy template structure.

## Non-Goals

- Redesigning the site information architecture.
- Adding JavaScript-driven interactivity or theme toggles.
- Reworking the public data model.
- Replacing the current table-based scoreboard with cards.

## Chosen Approach

Implement the theme primarily through CSS and a small number of targeted template adjustments.

The current site is already structurally suitable for theming work: a shared layout, a homepage, an event page, and one site stylesheet. That means the visual upgrade can be concentrated in:

- global page framing and typography
- homepage hero and section styling
- event-page header treatment
- leaderboard, event-list, and table presentation

This keeps the change focused while still creating a substantial shift in visual tone.

## Visual Direction

### Core personality

The theme should feel like a printed summer tournament flyer adapted to the web:

- bright and upbeat
- recreational and welcoming
- bold enough to feel event-driven
- still clear enough for standings and score breakdowns

The visual tone should avoid looking corporate, sterile, or overly dark. It should also avoid becoming so decorative that the scoreboard becomes hard to scan.

The approved tone should lean more sporty and competitive than playful, while still feeling accessible to a rec-league audience.

### Color system

Use a warm, summery palette with strong contrast anchors.

Expected palette roles:

- a warm sun/sand background tone for the page shell
- a brighter accent color for headings or poster highlights
- a deeper navy or indigo for text, borders, and contrast structure
- a second accent for badges, links, and callout moments
- white or near-white card surfaces for readability

The palette should support:

- clear contrast on body text
- obvious hierarchy between page background, panels, and data tables
- a louder `Major` badge treatment without reducing readability

### Typography

Typography should do more work than it does today.

- Headlines should feel poster-like: heavier weight, tighter line-height, stronger scale.
- Supporting labels and metadata should feel more intentional and branded.
- Body and table text should remain straightforward and legible.

The design should prefer safe web-font stacks rather than adding external font dependencies in this phase.

## Page-Level Design

### Shared layout

The shared layout should gain a stronger page frame so the site feels composed rather than raw:

- more distinctive page background treatment
- more generous spacing around the main content shell
- a more intentional content width and vertical rhythm

The `page-shell` should remain the main container, but it should feel more like a centered poster board on a themed backdrop than a simple max-width wrapper.

### Homepage

The homepage should become the clearest expression of the theme.

#### Hero/header

The current plain title block should become a poster-like hero with:

- larger title treatment
- stronger spacing and separation from the data sections below

The hero should communicate league identity before the user reaches the standings.

The approved direction is title-only. The theme should create the competitive flyer feeling through layout, type, spacing, and color rather than by adding subtitle copy.

#### Leaderboard section

The leaderboard should remain an ordered list, but its visual treatment should shift from plain rows to branded placards or cards.

Desired characteristics:

- more spacing between rows
- stronger row framing
- clearer emphasis on player name and points
- event-count metadata visually de-emphasized but still present

The result should feel like standings cards pinned to a poster rather than a generic list.

#### Events section

The event list should feel more like upcoming-event poster tiles than a plain vertical list, even though it still represents the current event listing data.

Desired characteristics:

- card or tile treatment per event
- date styling that feels like event metadata, not leftover body text
- stronger hover/focus affordances on event links

### Event pages

The event page should feel like a single event poster wrapped around the scoreboard.

#### Event header

The event header should receive a more dramatic treatment than it has now:

- stronger back-link styling
- larger event title styling
- event date and `Major` badge grouped as part of the poster metadata
- UDisc link styled as a more intentional secondary action

#### Scoreboard container

The scoreboard should stay tabular, but the surrounding panel should feel branded.

Desired characteristics:

- stronger table header styling
- subtle row striping or row separation
- clearer numeric scanning
- preserved horizontal scroll behavior on small screens

The table should feel upgraded, not reinvented.

## Component Treatment

### Panels

The current `.panel` component is the main visual building block. It should become more expressive through:

- richer border and shadow treatment
- larger corner radius
- more intentional internal spacing

Panels should feel like layered printed cards sitting on the page background.

### Badge

The `.badge` component, especially for `Major`, should become a signature accent element.

It should feel:

- more vibrant
- more thematic
- more visually important than the current black pill

The approved direction is closer to a tournament stamp than a polished league label.

### Links

Links should be styled to fit the poster theme rather than default browser-blue behavior.

This includes:

- body links
- event-list links
- the back-to-home link
- the UDisc external link

### Table styling

The scoreboard table should be the most restrained area of the theme.

It can receive:

- custom header background
- cleaner dividers
- zebra striping or softened row separators
- improved padding and alignment

But it should not lose density or clarity.

## Responsive Behavior

The current site already shifts list rows from columns to rows at larger breakpoints. The theme work should preserve mobile usability and improve it where possible.

Requirements:

- hero and section spacing should still work on small screens
- leaderboard and event cards should stack cleanly on mobile
- event metadata should remain readable without crowding
- the scoreboard table must continue to scroll horizontally on narrow screens

Any decorative treatment should degrade gracefully on mobile rather than compressing the layout.

## Implementation Shape

Most of the work should live in `site/styles/site.css`.

Template changes should remain targeted and minimal, likely limited to:

- adding semantic wrapper classes for hero or section variants
- slightly refining homepage and event header markup to support stronger visual hierarchy

The implementation should avoid introducing unnecessary partials or a more complex asset pipeline unless the existing templates truly need it.

## Testing and Verification

This is a presentation-focused change, so verification should emphasize real rendered output as well as regression safety.

Required verification:

- run the existing automated test suite to confirm the data/rendering pipeline still works
- run the site build successfully
- inspect the rendered homepage on desktop and mobile widths
- inspect the rendered event page on desktop and mobile widths

Because the public site is static and simple, visual review is a key part of acceptance.

## Acceptance Criteria

1. The public site clearly reads as a themed `Beach Flyer` experience rather than a neutral utility page.
2. The homepage has a stronger hero treatment and branded sections for leaderboard and events.
3. Event pages have a more distinctive event-poster header while preserving scoreboard readability.
4. The `Major` badge and links feel intentionally themed rather than default-styled.
5. The scoreboard table remains readable and horizontally scrollable on small screens.
6. The implementation fits the existing Eleventy structure without unnecessary architectural churn.
