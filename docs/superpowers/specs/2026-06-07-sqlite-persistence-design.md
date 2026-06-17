# Design: SQLite Persistence For App Data

## Overview

The app currently stores mutable business data in process memory:

- confirmed events, players, event results, and event points in `lib/eventsData.js`
- draft events in `lib/eventDraftStore.js`

This makes imports, drafts, and score data disappear on dev server restart or module reload. It also creates a misleading runtime state because `lib/eventsData.js` seeds a default confirmed `spring-showdown` event with no persisted results.

This change replaces the in-memory business-data stores with a real SQLite-backed persistence layer so event data survives reloads and the rest of the app reads from durable storage.

## Goals

- Make mutable app data truly persistent across dev server restarts and reloads.
- Use SQLite as the first real database backend.
- Preserve current business behavior for draft creation, confirmed import, public event pages, leaderboard queries, and admin event pages.
- Remove implicit runtime dependence on process-memory arrays for business data.
- Keep the application usable in local development without requiring a separate database service.

## Non-Goals

- No Postgres or multi-database support in this step.
- No ORM adoption in this step.
- No actual edit/save UI for admin event editing beyond existing scaffold work.
- No schema migration engine beyond what is needed to bootstrap SQLite for this app.
- No user-facing feature changes beyond persistence and the removal of misleading in-memory defaults.

## Recommended Approach

Introduce a thin SQLite repository layer as the new source of truth for mutable app data, then migrate existing domain and query modules to use repository functions instead of in-memory arrays.

This is the smallest correct change because it provides real durability without forcing a full ORM or a broad business-logic rewrite. Existing modules like `confirmImportedEvent`, `createEventDraft`, `publicEventsQuery`, and `leaderboardQuery` can keep their current responsibilities while reading and writing durable rows.

## Storage Model

### Database File

Use a project-local SQLite database file for local development.

Recommended location:

- `data/app.sqlite`

The database file should be treated as runtime state, not handwritten source. It should be created automatically if missing.

### Tables

Create SQLite tables for:

- `players`
- `event_drafts`
- `events`
- `event_results`
- `event_points`

Keep the current conceptual split between draft events and confirmed events:

- draft rows live in `event_drafts`
- confirmed/public rows live in `events`

This mirrors the existing app behavior and avoids forcing premature unification of draft and confirmed write paths.

### Row Identity

Preserve stable string IDs so the rest of the code does not need a broad rewrite.

Examples:

- `player_0001`
- `evt_draft_0001`
- `evt_confirmed_0001`
- `result_0001`
- `point_0001`

The repository layer remains responsible for generating the next ID in sequence for each table.

## Schema Shape

### players

- `id` text primary key
- `name` text not null

### event_drafts

- `id` text primary key
- `slug` text not null unique
- `name` text not null
- `date` text not null
- `is_major` integer not null default 0
- `notes` text not null default ''
- `status` text not null default 'draft'

### events

- `id` text primary key
- `slug` text not null unique
- `name` text not null
- `event_date` text not null
- `is_major` integer not null default 0
- `notes` text not null default ''
- `season` integer not null
- `confirmed` integer not null default 1
- `status` text not null default 'confirmed'

### event_results

- `id` text primary key
- `event_id` text not null references `events(id)` on delete cascade
- `player_id` text not null references `players(id)` on delete cascade
- `finish_place` integer not null
- `starting_tag` integer nullable

### event_points

- `id` text primary key
- `event_id` text not null references `events(id)` on delete cascade
- `event_result_id` text not null unique references `event_results(id)` on delete cascade
- `player_id` text not null references `players(id)` on delete cascade
- `attendance` integer not null default 0
- `placement` integer not null default 0
- `starting_tag_bonus` integer not null default 0
- `tag_one_bonus` integer not null default 0
- `beat_your_tag_bonus` integer not null default 0
- `event_total` integer nullable
- `points` integer nullable

The schema should support the existing points contract variants the app already normalizes in `resolvePointsValue` and public/leaderboard queries.

## Initialization And Bootstrapping

### Database Bootstrap

Add a database bootstrap path that:

1. opens the SQLite file
2. enables foreign keys
3. creates tables if they do not exist
4. exposes repository access to the rest of the app

Database initialization failures should fail loudly. The app must not silently fall back to in-memory business state once SQLite is introduced.

### Seeding

Remove the implicit runtime seed currently embedded in `lib/eventsData.js`.

Specifically:

- the default in-memory `spring-showdown` row should no longer appear automatically at runtime
- empty app state should mean the database has no rows, not that hidden defaults are being served

If sample data is needed in local development, it should be created by an explicit seed step or test setup, not by automatic runtime defaults.

## Repository Layer

Add a dedicated SQLite repository boundary that becomes the single persistence interface for mutable app data.

Recommended responsibilities:

- initialize database connection and schema
- list and find draft events
- insert draft events
- list and find confirmed events
- insert confirmed events
- insert and delete players
- insert and delete event results
- insert and delete event points
- list all persisted rows needed by public/admin/leaderboard queries
- reset database state for tests and Playwright helpers

The repository should return plain JS objects shaped to match the rest of the app’s existing domain expectations.

## Application Migration Strategy

### Replace In-Memory Stores As Source Of Truth

`lib/eventsData.js` and `lib/eventDraftStore.js` should stop being authoritative runtime stores.

They can either:

- be removed entirely and replaced by more explicit SQLite repository modules, or
- be retained as compatibility wrappers whose operations delegate to SQLite

The preferred end state is explicit repository usage, but a short-lived wrapper phase is acceptable if it keeps the migration small and safe.

### Domain Logic

Preserve domain logic in its current modules:

- `lib/createEventDraft.js`
- `lib/confirmImportedEvent.js`
- `lib/scoreEvent.js`

These modules should continue to own validation and scoring behavior. Their dependencies should change from array-backed storage functions to SQLite-backed repository functions.

### Query Logic

`lib/publicEventsQuery.js`, `lib/leaderboardQuery.js`, and `lib/adminEventsQuery.js` should be updated so their data inputs come from SQLite-backed reads rather than shared in-memory arrays.

Where possible, keep the current normalization and sorting logic intact. The persistence migration should change where data comes from, not the user-facing business rules around ordering, visibility, and scoring.

## Runtime Behavior

### After Confirmed Import

When an imported event is confirmed:

- the confirmed event row should persist in SQLite
- created players should persist in SQLite
- event results should persist in SQLite
- event points should persist in SQLite

After a dev server restart, the imported event should still appear in:

- `/events`
- `/events/[slug]`
- leaderboard queries
- `/admin/events`
- `/admin/events/[slug]/edit`

### Draft Behavior

Draft events created through admin should also survive restarts because they now live in SQLite.

## Error Handling And Constraints

Keep the current validation-first behavior in domain services, but add database constraints as a second safety net.

Examples:

- unique slug constraints on `event_drafts.slug` and `events.slug`
- foreign-key constraints between events, results, points, and players
- unique `event_points.event_result_id` to prevent duplicate point rows per result

Repository errors caused by constraint violations should be mapped into existing user-facing validation flows where feasible, rather than leaking raw SQLite errors to the UI.

## Testing Strategy

### Unit And Integration Tests

Tests that currently rely on `resetEventsData`, `getEventsData`, or `resetEventDraftStore` need to move to isolated SQLite test databases.

Test infrastructure should support:

- creating a fresh SQLite database per test file or suite
- clearing tables between tests when needed
- seeding only the rows each test actually requires

### Critical Regression Coverage

Add or preserve tests proving:

- confirmed imports remain visible after reloading from SQLite
- public event scoreboards read persisted results and points correctly
- leaderboard queries aggregate persisted points correctly
- admin event index lists persisted drafts and confirmed events together
- admin edit scaffold resolves persisted draft and confirmed events by slug
- test reset helpers still clear persisted state for Playwright flows

### Runtime Confidence

At least one integration path should verify the exact bug being fixed:

- confirm an event import
- simulate a fresh data reload from SQLite
- verify `/events/[slug]` still shows the persisted scoreboard

## Developer Experience

The app should remain easy to run locally:

- no separate database server process
- database file created automatically when missing
- test setup handles isolated databases without manual steps

If environment configuration is needed, keep it minimal and explicit, such as a database file path variable with a sensible local default.

## Acceptance Criteria

1. Confirmed events, players, event results, event points, and draft events are stored in SQLite rather than process memory.
2. Confirmed imports remain visible after dev server restart or reload.
3. `/events/[slug]` reads persisted scoreboard data correctly from SQLite.
4. `/admin/events` and `/admin/events/[slug]/edit` read persisted event data correctly from SQLite.
5. The implicit seeded `spring-showdown` runtime default is removed.
6. Database initialization fails loudly instead of silently falling back to in-memory state.
7. Tests run against isolated SQLite-backed state rather than shared module-memory state.
