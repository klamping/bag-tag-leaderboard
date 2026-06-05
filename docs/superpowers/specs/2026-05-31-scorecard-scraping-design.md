# Scorecard Scraping Design (UDisc Event Page URL)

## Context

The current Phase 4 draft-preview import flow is implemented against a presumed UDisc API endpoint in `lib/udiscClient.js` (`https://api.udisc.com/events/{id}`) and requires an API token. That assumption is incorrect for this project: we should import scorecard/event details by scraping the public UDisc event leaderboard page URL directly.

This design replaces API-style fetch-by-event-id with URL-driven page scraping while preserving the existing draft-preview mapping boundary and admin redirect UX patterns.

## Goals

- Use a full UDisc leaderboard URL as the admin input source.
- Fetch and parse event details + participant placements from the leaderboard page HTML.
- Normalize parsed data into the existing draft preview contract.
- Preserve existing admin draft validation behavior where possible.
- Fail safely and explicitly when upstream markup/data format changes.

## Non-Goals

- Headless browser runtime (Playwright/Puppeteer) adoption.
- Multi-round aggregation beyond the exact URL provided by admin.
- Historical import/backfill workflows.
- Changes to persisted event/participant schema.

## Recommended Approach

Implement server-side HTML scraping from the provided leaderboard URL in `lib/udiscClient.js`, with layered parsing:

1. Prefer structured embedded payloads (JSON-LD or script-embedded JSON blobs).
2. Fallback to targeted DOM-pattern extraction.
3. If neither yields a trustworthy payload, throw `UPSTREAM_FORMAT_CHANGED`.

This balances operational simplicity and reliability without introducing a heavy browser automation runtime.

## Architecture

### 1) UDisc client boundary (`lib/udiscClient.js`)

- Replace `fetchUdiscEvent({ eventId, token, fetchImpl })` with URL-based import:
  - `fetchUdiscEventFromUrl({ leaderboardUrl, fetchImpl = fetch })`
- Validate input URL before network calls:
  - Host must be `udisc.com` (or allowed subdomain pattern if needed by implementation).
  - Path must match event leaderboard route shape (`/events/.../leaderboard`).
  - Reject invalid input with `VALIDATION_ERROR`.
- Fetch HTML with browser-like headers.
- Parse HTML into normalized raw payload:
  - `name`, `date`, optional `slug`, optional `isMajor`
  - `participants: [{ playerName, externalPlayerId?, finishPlace }]`

### 2) Mapping boundary (`lib/udiscToDraftPreview.js`)

- Keep mapper as the stable contract boundary for app-owned draft preview shape.
- Expand accepted source keys only if parser output naming differs.
- Preserve current validation semantics (`fieldErrors` behavior unchanged unless intentionally extended).

### 3) Admin action integration (`app/admin/events/new/page.js`)

- Replace form input contract:
  - `udiscEventId` -> `udiscUrl`
- Invoke URL scraper adapter instead of event-id/token fetch adapter.
- Preserve redirect-based preview/error flow and mapping to query params.

## Parsing + Data Rules

- Respect URL query parameters exactly as supplied (e.g. `?round=1&view=scores`), with no silent query rewriting.
- Participant extraction requirements:
  - Name is required.
  - Placement must be positive integer.
- Deduplication strategy:
  - Primary identity: `externalPlayerId` (if available).
  - Fallback identity: normalized player name.
  - Keep first-seen placement for exact duplicates.
  - If contradictory duplicates appear (same identity with conflicting placements), treat as parse ambiguity and throw `UPSTREAM_FORMAT_CHANGED`.
- If parsed payload lacks minimum required fields (event name/date/usable participants), throw `UPSTREAM_FORMAT_CHANGED`.

## Error Taxonomy

`lib/udiscClient.js` should surface typed errors for reliable UX mapping:

- `VALIDATION_ERROR` - invalid/non-UDisc/non-leaderboard URL input.
- `NETWORK_ERROR` - connectivity/DNS/TLS/request failures.
- `NOT_FOUND` - upstream returns 404.
- `RATE_LIMITED` - upstream returns 429.
- `UPSTREAM_ERROR` - upstream 5xx or unexpected non-OK categories.
- `UPSTREAM_FORMAT_CHANGED` - HTML loads but expected parseable structures are missing/ambiguous.

Admin error messaging should add clear guidance for format changes (e.g. “Could not read this UDisc page format. Please verify URL and try again.”).

## Testing Strategy (TDD)

### Unit tests (`tests/udiscClient.test.js`)

- Replace token/event-id API assumptions with URL + HTML parsing tests.
- Cover:
  - Valid UDisc leaderboard URL + parse success.
  - Invalid URL host/path -> `VALIDATION_ERROR`.
  - HTTP status mapping (404, 429, 5xx).
  - Network exception -> `NETWORK_ERROR`.
  - Structured parser success path.
  - Fallback parser success path.
  - Missing/ambiguous payload -> `UPSTREAM_FORMAT_CHANGED`.

Use in-test HTML fixtures (or fixture files) to make parser behavior explicit and maintainable.

### Admin action tests (`tests/adminNewEventPage.test.js`)

- Update form-data contract tests to send `udiscUrl`.
- Verify redirect success still sets `udisc_preview` payload.
- Verify each new error type maps to expected user-facing error query value.

### Mapper tests (`tests/udiscToDraftPreview.test.js`)

- Keep existing coverage; add cases only if parser introduces newly accepted raw field aliases.

## Rollout + Compatibility

- Backward compatibility:
  - Persisted domain schema unchanged.
  - Public leaderboard/event behavior unchanged.
- Breaking admin contract change:
  - Admin draft import input changes from ID to URL.
- Operationally safer failure mode:
  - Fail closed on parse uncertainty (`UPSTREAM_FORMAT_CHANGED`) rather than guessing potentially wrong results.

## Risks and Mitigations

- **Risk:** UDisc markup changes break parser.
  - **Mitigation:** layered parser + dedicated fixture tests + explicit format-changed error.
- **Risk:** Some pages are script-rendered in ways not present in fetched HTML.
  - **Mitigation:** dual extraction paths; if both fail, explicit error and future headless escalation path remains available.
- **Risk:** Duplicate participant rows create inconsistent standings.
  - **Mitigation:** deterministic dedupe and ambiguity detection.

## Acceptance Criteria

1. Admin can submit a full UDisc leaderboard URL and receive draft preview payload on success.
2. Import no longer requires UDisc API token/event-id flow.
3. Parser outputs include valid event name/date and participant placements suitable for existing mapper validation.
4. Typed errors are mapped to user-friendly admin messages, including upstream format change guidance.
5. Automated tests cover success path and primary failure modes for URL validation, HTTP mapping, parsing, and admin action integration.
