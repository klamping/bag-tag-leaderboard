# Design: Admin Event Index And Edit Scaffold

## Overview

The current admin area only provides login and the `/admin/events/new` create/import page. There is no protected admin view for browsing the events already in the system, and no admin event route that can serve as the entry point for future edit work.

This change adds a protected admin event index at `/admin/events` that lists both draft and confirmed events in one view, plus a protected scaffold page at `/admin/events/[slug]/edit` that establishes the route and data-loading boundary for later event editing.

## Goals

- Add a protected admin event index that lists all events in the system.
- Include both draft events and confirmed events in the same admin list.
- Add an `Edit` link for each event row.
- Add a basic protected event edit scaffold page that resolves the event and shows a not-yet-implemented placeholder.
- Make `/admin/events` the main landing page after admin login.

## Non-Goals

- No actual event editing or save action yet.
- No participant editing UI.
- No audit trail UI.
- No rework of the underlying draft and confirmed event storage split.
- No filtering, searching, pagination, or sorting controls beyond a default server-side sort.

## Recommended Approach

Add one admin event index page that merges data from the existing confirmed-event store and draft-event store at read time, then add a minimal event edit scaffold route that can load either event type by slug.

This is the smallest correct change because it creates a real admin browse/edit entry point without forcing the later edit implementation to exist now. It also respects the current repository shape, where confirmed events live in `lib/eventsData.js` and drafts live in `lib/eventDraftStore.js`.

## Route Structure

- `/admin/login`
  - remains the login page
  - successful login redirects to `/admin/events`

- `/admin/events`
  - new protected admin index page
  - lists all draft and confirmed events
  - links to `/admin/events/new`
  - links each listed event to `/admin/events/[slug]/edit`

- `/admin/events/new`
  - remains the create/import page
  - becomes a secondary route reached from the new admin index

- `/admin/events/[slug]/edit`
  - new protected scaffold page
  - resolves a draft or confirmed event by slug
  - renders event metadata and a placeholder that editing is not implemented yet

## Architecture

### Admin Event Query Boundary

Add a small admin-oriented read seam that normalizes event rows from both stores into one shared shape for route rendering.

Recommended normalized row shape:

- `id`
- `slug`
- `name`
- `date`
- `status`
- `sourceType`

Normalization is needed because the two stores use different field contracts today:

- confirmed events use `eventDate` in `lib/eventsData.js`
- draft events use `date` in `lib/eventDraftStore.js`

The normalized admin row should always expose `date` and a string `status` that is already suitable for display.

### Event Resolution For Edit Scaffold

The scaffold edit page should resolve the slug across both stores.

Resolution order:

1. check draft store for matching slug
2. check confirmed events store for matching slug
3. if neither exists, return `notFound()`

The page should not try to unify full event-edit behavior yet. It only needs enough normalized event metadata to identify what the page is referring to and to support a later edit implementation.

## Data Flow

### Admin Event Index

1. Admin requests `/admin/events`.
2. Server enforces admin auth with the existing `requireAdmin()` gate.
3. Route loads confirmed events from `lib/eventsData.js`.
4. Route loads drafts from `lib/eventDraftStore.js`.
5. Route normalizes both collections into one list.
6. Route sorts the combined list server-side.
7. Page renders event rows with metadata and edit links.

### Edit Scaffold

1. Admin requests `/admin/events/[slug]/edit`.
2. Server enforces admin auth with the existing admin gate.
3. Route looks up the slug in both stores.
4. If found, the page renders a basic event summary and placeholder edit scaffold.
5. If not found, the route returns `notFound()`.

## Default Sorting

Render one unified event list sorted by:

1. date descending
2. name ascending
3. slug ascending

This keeps the newest events first while remaining deterministic when dates tie.

## UX Notes

### Admin Event Index

Each row should show at least:

- event name
- slug
- date
- status (`draft` or `confirmed`)
- `Edit` link

The page should also include a clear entry point to the existing `/admin/events/new` page, such as a top-level `Create or Import Event` link.

If there are no events in either store, render a simple empty state and still show the link to create/import a new event.

### Edit Scaffold

The scaffold page should render:

- page title including the event name or slug
- event metadata summary
- event status
- placeholder text such as `Editing is not implemented yet.`

The page exists to make the index’s `Edit` links real and to establish the route boundary for later phase 7 editing work.

## Error Handling

- Unknown edit slug returns `notFound()`.
- Empty admin event list is not an error; render an empty state.
- Admin auth remains enforced server-side for both routes.
- No mutation path is introduced in this phase, so there are no write-time validation or rollback concerns.

## Testing Strategy

### Admin Index Tests

Add tests covering:

- authenticated `/admin/events` route renders both draft and confirmed events
- normalized date rendering works across `eventDate` and `date`
- rows expose `draft` and `confirmed` statuses correctly
- each row links to `/admin/events/[slug]/edit`
- empty state renders when both stores are empty
- page exposes a link to `/admin/events/new`

### Edit Scaffold Tests

Add tests covering:

- draft slug resolves and renders scaffold metadata
- confirmed slug resolves and renders scaffold metadata
- unknown slug returns `notFound()`

### Redirect And Navigation Tests

Update admin login tests so successful login redirects to `/admin/events` instead of `/admin/events/new`.

## Relationship To Future Editing Work

This design intentionally stops before implementing edit behavior.

It prepares for later confirmed-event editing by:

- creating a stable admin event browse surface
- establishing `/admin/events/[slug]/edit` as the future edit route
- introducing a normalized admin event read shape that later edit pages can build on

It does not attempt to implement the phase 7 edit service, participant editing, or audit history in this step.

## Acceptance Criteria

1. Admin users can visit `/admin/events` after login.
2. The admin event index lists both draft and confirmed events in one unified view.
3. Each listed event shows basic metadata and an `Edit` link.
4. The index includes a clear link to `/admin/events/new`.
5. `/admin/events/[slug]/edit` exists as a protected scaffold page for both draft and confirmed events.
6. Unknown event slugs return `notFound()`.
7. No actual edit/save behavior is introduced yet.
