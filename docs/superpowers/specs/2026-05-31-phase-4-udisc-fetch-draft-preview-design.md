# Phase 4 UDisc Fetch + Draft Preview Design

## Goal

Allow an authenticated admin to fetch an event from UDisc using a server-side API token, review a temporary normalized preview, and explicitly save a draft event only after confirmation.

## Scope

In scope for Phase 4:

- Live UDisc fetch using server env var token (`UDISC_API_TOKEN`)
- Temporary preview (no persistence on fetch)
- Explicit "Save Draft" action
- Draft creation for event metadata only (`name`, `slug`, `date`, `isMajor`, `notes`)
- Participant preview rendering only (no scoring computation in this phase)

Out of scope for Phase 4:

- Auto-saving drafts immediately after fetch
- Scoring preview/calculation in admin UI
- Confirm/import pipeline finalization behavior
- Background sync or retry workers

## Architecture

Use a thin integration boundary with strict normalization:

1. `lib/udiscClient.js` performs server-side UDisc API I/O.
2. `lib/udiscToDraftPreview.js` maps raw UDisc payloads into app-owned preview contracts.
3. `app/admin/events/new/page.js` hosts two server actions:
   - `fetchUdiscPreviewAction`: fetch + normalize + preview state
   - `saveFetchedDraftAction`: revalidate normalized input + create draft

This keeps external API concerns isolated from domain logic and allows deterministic unit tests for mapping/validation behavior.

## Component Design

### 1) UDisc client (`lib/udiscClient.js`)

Responsibilities:

- Read token from secure server context (action-level injection from `process.env.UDISC_API_TOKEN`)
- Call UDisc endpoint with required auth headers
- Return raw payload on success
- Convert HTTP/network failures into stable typed errors for UI handling

Public contract:

- `fetchUdiscEvent({ eventId, token, fetchImpl? })`
- Throws tagged errors with categories:
  - `CONFIG_ERROR` (missing token)
  - `AUTH_ERROR` (401/403)
  - `NOT_FOUND` (404)
  - `RATE_LIMITED` (429)
  - `UPSTREAM_ERROR` (5xx)
  - `NETWORK_ERROR` (timeout/connectivity)

### 2) Normalizer (`lib/udiscToDraftPreview.js`)

Responsibilities:

- Normalize external payload to internal preview shape
- Enforce required metadata and participant fields
- Generate deterministic validation errors for incomplete/unmappable payloads

Public contract:

- `mapUdiscEventToDraftPreview(raw)` returns:
  - `{ ok: true, preview }` or
  - `{ ok: false, fieldErrors }`

Preview shape:

- `event`: `{ name, slug, date, isMajor, notes }`
- `participants`: `[{ playerName, externalPlayerId, finishPlace }]`

### 3) Admin page actions (`app/admin/events/new/page.js`)

Responsibilities:

- Gate actions with `requireAdmin()`
- Fetch temporary preview without persistence
- Render preview UI and fetch/save error states
- Save draft only via explicit user action

Action behavior:

- `fetchUdiscPreviewAction(formData)`
  - Reads `udiscEventId`
  - Calls `fetchUdiscEvent` then `mapUdiscEventToDraftPreview`
  - On success: re-render with preview payload available for save
  - On failure: re-render with user-safe error message
- `saveFetchedDraftAction(formData)`
  - Revalidates preview payload server-side
  - Calls `createEventDraft(...)`
  - Redirects to `?created=1` on success
  - Returns field errors on validation/conflict failures

## Data Flow

1. Admin submits UDisc event id.
2. Server action authenticates admin and validates config.
3. UDisc client fetches raw payload.
4. Normalizer maps payload to internal preview contract.
5. Page renders preview panel and Save button.
6. Admin clicks Save Draft.
7. Server action revalidates preview contract and persists draft via existing domain function.
8. Success redirects to created state; failures return actionable field errors.

## Error Handling

User-facing messages:

- Missing token: "UDisc integration not configured."
- Auth failure: "UDisc authentication failed."
- Not found: "UDisc event not found."
- Rate limited: "UDisc is rate limiting requests. Please try again shortly."
- Upstream/network failure: "UDisc is temporarily unavailable. Please try again."
- Mapping errors: per-field messages (for example, missing event date)

Safety constraints:

- Never persist data during fetch preview
- Never trust client-roundtripped preview without server revalidation
- Never expose raw token values or verbose upstream error details

## Testing Strategy

### Unit tests

- `tests/udiscClient.test.js`
  - Success path with mocked `fetch`
  - Each HTTP category mapping (401/403/404/429/5xx)
  - Missing token and network failures
- `tests/udiscToDraftPreview.test.js`
  - Valid payload normalization
  - Slug/date/required field normalization failures
  - Participant mapping edge cases and deterministic error shapes

### Page/action tests

- `tests/adminNewEventPage.test.js`
  - Fetch action requires admin auth
  - Fetch action returns preview without calling persistence adapter
  - Save action requires admin auth
  - Save action uses validated preview and calls `createEventDraft`
  - Error states render correctly for client and mapping failures

### Regression

- Full `npm test` suite must remain green.

## Acceptance Criteria

1. Admin can fetch UDisc event data from `/admin/events/new` when authenticated.
2. Fetched data appears as temporary preview and is not persisted automatically.
3. Admin must explicitly click Save Draft to persist event metadata draft.
4. Save action uses existing draft creation validation and duplicate protections.
5. UDisc and mapping failures return stable user-safe errors.
6. No scoring preview is introduced in this phase.

## Ambiguity Resolutions

- Phase 4 stores only event metadata draft; participant rows are preview-only.
- Non-draft slug collision checks remain enforced through existing draft creation flow and page-level adapters.
- `UDISC_API_TOKEN` is mandatory in production-like environments for fetch functionality.
