# Phase 7 Design: Post-Confirm Edits + Audit Trail

## Overview

Phase 7 adds the ability for admins to edit already confirmed events while preserving public data integrity and a readable audit history.

The core design keeps one confirmed event as the canonical live record. Post-confirm edits are handled as full-event update operations that revalidate the event, rescore all participant rows, replace persisted confirmed results and points, and write an event-level audit entry with before/after snapshots.

## Goals

- Allow admins to edit confirmed event metadata.
- Allow admins to edit confirmed participant result data and starting tags.
- Recalculate event points from canonical rules after every confirmed edit.
- Keep public leaderboard and event pages consistent with the latest successful confirmed state.
- Provide a per-event admin audit history that explains what changed and when.

## Non-Goals

- No revisioned public read model.
- No row-by-row autosave or partial save flow.
- No manual point overrides.
- No low-level per-row diff UI in MVP.

## Confirmed Scope

Phase 7 supports edits to the following confirmed event fields:

- event `name`
- event `slug`
- event `event_date`
- event `udisc_url`
- participant finish data
- participant starting tags

The MVP audit UX includes a per-event admin history timeline.

## Recommended Approach

The recommended approach is an event-scoped update service with snapshot audit logging.

Alternative approaches considered:

- direct row-level patching with separate audit rows per record
- immutable event revisions with latest-revision reads

The event-scoped update service is preferred because it fits the current confirm-import architecture, keeps public read paths simple, and produces an audit trail that matches how admins think about corrections: one event edit action at a time.

## Architecture

### Service Boundary

Add a protected `updateConfirmedEvent` service parallel to `confirmImportedEvent`.

The service accepts:

- event identity
- editable confirmed event metadata
- full participant/result payload for the event

The service is responsible for:

- validating the edit request
- recalculating scoring from scratch
- replacing confirmed result and point data for the event
- writing the audit record
- returning structured success or validation failures

### Canonical State Model

Existing `events`, `event_results`, and `event_points` tables remain the canonical live state.

There is no revision layer added to public queries in this phase. Public routes continue to read the current confirmed event state and current confirmed point rows.

## Data And Audit Model

### Live Tables

Keep the existing live state tables:

- `events`
- `event_results`
- `event_points`

### Audit Shape

Each successful confirmed edit writes one event-level audit entry.

Required audit fields:

- `entity_type = "event"`
- `entity_id = <event id>`
- `action = "update"`
- `before_json`
- `after_json`

The `before_json` and `after_json` payloads capture the event snapshot at the service boundary, including:

- event metadata
- participant result rows
- recalculated point rows

### Audit Summary

Add or formalize a compact summary field for admin-readable history rows. Example summaries:

- `Updated event metadata and rescored 14 participants`
- `Changed slug from spring-weekly-3 to spring-weekly-3b`

### Confirm History

The per-event history includes the original confirm action from phase 6 and subsequent update actions from phase 7, so the timeline starts with confirmation and continues through later edits.

## Edit Flow

1. Admin opens a confirmed event edit page from the existing admin event area.
2. The page loads current confirmed metadata and participant rows as editable form state.
3. Admin updates event fields and/or participant rows.
4. Admin submits one explicit save action for the whole event.
5. The protected action calls `updateConfirmedEvent`.
6. The service validates the full payload, recalculates points, persists the new confirmed state, and writes one audit entry.
7. Success returns the admin to the event view with a visible success state.
8. Failure returns structured validation errors or a non-field failure without mutating live public data.

## Validation And Integrity Rules

- Confirmed edits are full-event recalculations, not partial point overrides.
- `slug` must remain unique across all events except the current event being edited.
- `event_date` is required.
- Every participant must have a valid starting tag.
- Starting tags must be unique within the event.
- Duplicate player rows are rejected.
- Invalid scoring input blocks the edit before writes.
- Audit logging is part of the successful write contract. If the edit cannot be audited, the edit fails.

## Failure Model

- No partial updates are allowed.
- If persistence fails during an edit, the event remains at the previous confirmed state.
- Public leaderboard and public event pages only observe the last successful confirmed snapshot.
- Validation failures do not mutate live data.

## Admin UX

### Edit Screen

Add a confirmed-event edit screen anchored from the existing admin confirmed event flow.

The page has two primary sections:

- event metadata form fields
- editable participant/results table

MVP priorities:

- correctness over convenience
- one explicit save action
- no inline autosave
- no partial edit sessions

### Audit History UI

The same admin event area shows a per-event audit history:

- newest first
- timestamp
- action label such as `Confirmed` or `Edited`
- short summary
- expandable before/after snapshot inspection

The history view should be understandable without reconstructing row-level diffs.

## Public Read Behavior

- Public leaderboard continues to aggregate only confirmed points.
- Public event pages continue to show only confirmed event data.
- After a successful confirmed edit, public views reflect the latest recalculated confirmed state.

## Testing Scope

### Service Tests

Add tests for `updateConfirmedEvent` covering:

- successful metadata-only edit
- successful participant/tag edit with rescore
- slug collision rejection
- duplicate starting tag rejection
- invalid participant payload rejection
- rollback or no-mutation behavior on failed writes
- audit record creation on success
- failure when audit write cannot complete

### Admin Route And Action Tests

Add tests covering:

- auth guard behavior
- form error rendering
- success redirect or success state
- audit history rendering

### Query Regressions

Add or update regressions proving:

- public leaderboard reflects edited confirmed points
- public event page reflects edited confirmed metadata and results

## Acceptance Criteria

1. Admin can edit a confirmed event's metadata and participant rows from the admin area.
2. Saving a confirmed event recalculates points from canonical scoring rules.
3. Invalid edits are rejected before live confirmed data changes.
4. Failed writes do not leave the event in a partially updated state.
5. Every successful confirmed edit writes one event-level audit record with before/after snapshots.
6. Admin can view a per-event history timeline that includes the original confirm action and later edits.
7. Public leaderboard and event pages reflect the latest successful confirmed state after an edit.
