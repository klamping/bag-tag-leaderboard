# Design: Phase 3 Admin Access + Event Draft Creation

## Context

The codebase has completed public leaderboard/event views and scoring hardening. The next implementation priority is new feature work, starting with Phase 3: Admin Access + Event Draft Creation. The goal is a minimal but real admin workflow that is isolated from public routes and can be expanded in later phases.

## Scope

### In scope

- Add a shared-secret admin login flow.
- Protect admin routes with server-side auth checks.
- Add a first draft-event creation flow for core event metadata.
- Validate draft payloads and prevent invalid writes.
- Add tests for auth, route guards, draft creation contracts, and integration flow.

### Out of scope

- OAuth, magic-link, or third-party identity providers.
- Full admin dashboard UX polish.
- UDisc ingestion and import preview.
- Starting-tag entry UI.
- Post-confirm edit/audit workflows.

## Recommended Approach

Use a thin vertical slice:

1. Implement minimal shared-secret admin auth.
2. Gate admin pages server-side.
3. Add one create-draft event form.
4. Validate and persist draft.
5. Cover flow with focused tests.

This aligns with the repository's phased, test-backed delivery style and provides fast feedback with controlled risk.

## Architecture

- Introduce an admin route area at `/admin`.
- Add `/admin/login` for credential entry.
- Add `/admin/events/new` for first draft creation.
- Enforce auth on all admin pages using a shared `requireAdmin()` gate.
- Keep public routes (`/`, `/events`, `/events/:slug`) behavior unchanged.

Authentication model:

- Runtime secret source: `ADMIN_SHARED_SECRET`.
- Login compares submitted secret using a constant-time comparison helper.
- On success, server sets `admin_session` cookie.
- Admin pages verify cookie server-side for every request.
- Logout action clears cookie and redirects to login.

## Components and Responsibilities

- `app/admin/login/page.js`
  - Renders password form.
  - Submits to a server action/handler that verifies secret and sets session cookie.
  - Shows generic credential failure message.

- `lib/adminAuth.js`
  - `verifyAdminSecret(input)` for secret validation.
  - `isAdminAuthenticated()` for cookie-based auth state.
  - `requireAdmin()` for server-side route protection.

- `app/admin/events/new/page.js`
  - Renders draft event form with core fields:
    - required: `name`, `slug`, `date`
    - optional: `isMajor`, `notes`
  - Calls draft creation entrypoint.
  - Displays field-level validation errors.

- `lib/createEventDraft.js`
  - Validates draft event payload.
  - Enforces slug format and uniqueness.
  - Writes draft event via existing data access seam.
  - Returns normalized result for UI handling.

## Data Flow

1. User visits `/admin/events/new`.
2. Server checks auth with `requireAdmin()`.
3. Authenticated user submits draft form.
4. Server validates payload in `createEventDraft`.
5. On success, draft persists and UI redirects to confirmation target.
6. On failure, UI re-renders with field-specific errors and no partial write.

## Error Handling and Security

- Login failures return only a generic invalid-credentials message.
- Missing `ADMIN_SHARED_SECRET` causes explicit server-side failure for admin auth paths and logs a clear config error.
- Cookie attributes:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` in non-local development environments
- All admin mutations re-check auth server-side regardless of client state.
- Draft creation failure paths must not persist partial/incomplete drafts.

## Validation Rules

- `name`: non-empty string.
- `slug`: non-empty, URL-safe slug pattern, unique among events.
- `date`: valid date string accepted by contract.
- `isMajor`: optional boolean.
- `notes`: optional bounded text field.

## Testing Strategy

- Unit tests (`lib/adminAuth.js`):
  - accepts correct secret
  - rejects incorrect secret
  - handles missing configured secret deterministically

- Route guard tests:
  - unauthenticated admin route access redirects to `/admin/login`
  - authenticated access is allowed

- Contract tests (`lib/createEventDraft.js`):
  - required-field enforcement
  - slug format validation
  - duplicate slug rejection
  - successful draft creation result shape

- Integration tests:
  - login success path to admin access
  - login failure behavior
  - create-draft success and validation-error paths

- Regression focus:
  - existing public leaderboard/events tests remain green to prove isolation.

## Success Criteria

- Admin users can authenticate with a shared secret.
- Unauthenticated users cannot access admin pages.
- Authenticated users can create valid draft events.
- Invalid drafts are rejected with actionable validation errors.
- Public routes remain unaffected.

## Risks and Follow-ups

- Shared-secret auth is MVP-grade and should be replaced by stronger identity later.
- Rate limiting for failed logins is deferred but should be added if exposed broadly.
- Admin list/detail management is intentionally deferred to later phases.
