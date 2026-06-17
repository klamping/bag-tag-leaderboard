# Design: Imported Event Confirm Autofill

## Overview

The admin UDisc import flow already carries imported event metadata through preview and confirmation, but the confirm form only exposes `slug` as an editable input. This change makes the imported `name`, `slug`, and `date` values visible as prefilled confirm-form inputs so admins can correct event metadata before final confirmation.

## Goals

- Autofill the imported event `name`, `slug`, and `date` in the confirm form.
- Keep all three fields editable at confirmation time.
- Preserve the existing participant review and confirmation flow.
- Reuse the current validation and error-return path so invalid edits round-trip back into the same confirm form.

## Non-Goals

- No new intermediate import step.
- No merge of the import confirm form with the manual draft-creation form.
- No changes to participant review behavior.
- No post-confirm editing or audit changes.

## Recommended Approach

Extend the existing confirm form in `renderUdiscPreviewSection()` instead of introducing a new screen or redirecting imported events into the manual draft form.

This is the smallest correct change because it preserves the current "valid preview -> confirm import" flow, keeps imported metadata review close to the confirm action, and limits the behavior change to the existing import confirmation boundary.

## Architecture

### Confirm Form Rendering

Update the valid-preview confirm form to render three labeled inputs:

- `name`
- `slug`
- `date`

Each input should use the imported value from `preview.event` as `defaultValue`.

The preview summary text can remain visible, but the confirm form becomes the authoritative editable source for event metadata at confirmation time.

### Confirm Action Boundary

`submitConfirmUdiscImport()` currently parses `previewPayload` and applies only an edited slug before calling `confirmImportedEvent`.

Change that boundary so the action reads `name`, `slug`, and `date` from `FormData`, merges them into `preview.event`, and sends the merged preview to `confirmImportedEvent`.

Participant rows, starting tags, and all other imported data continue to come from the preview payload unchanged.

## Data Flow

1. Admin fetches a UDisc preview.
2. Admin reviews participant mapping and starting tags.
3. When the preview is valid, the page renders a confirm form with autofilled `name`, `slug`, and `date` inputs.
4. Admin may edit any of those three values.
5. On submit, the confirm action merges submitted metadata into the preview payload.
6. `confirmImportedEvent` validates and persists the merged event if valid.
7. On success, the flow redirects with the existing confirmed state.
8. On validation failure, the page redirects back with the updated preview payload and field errors so the edited values remain visible.

## Validation And Error Handling

- The confirm step should continue to rely on `confirmImportedEvent` for event validation.
- Invalid edited `name`, `slug`, or `date` values should return through the existing `reviewErrors` path and render beside the corresponding confirm inputs.
- The redirect-back payload must preserve the submitted metadata, not the original imported metadata, so the admin does not lose edits after a validation failure.
- Invalid or missing preview payload behavior remains unchanged and should still surface the existing confirm error state.

## UX Notes

- The confirm form should keep event metadata correction lightweight: no new page, no modal, no secondary save step.
- The imported values should be immediately visible in editable fields instead of requiring admins to trust read-only preview text.
- The existing "Confirm Import" affordance remains the final explicit write action.

## Testing Strategy

### Rendering Tests

Update confirm-form rendering tests to assert:

- `name`, `slug`, and `date` inputs are present for valid previews
- each input is prefilled from `preview.event`
- the confirm form is still hidden for invalid previews

### Action Tests

Add or update tests covering:

- submitted `name`, `slug`, and `date` override the imported preview metadata passed to `confirmImportedEvent`
- successful confirmation still redirects with the confirmed slug
- validation failures redirect back with field errors and preserve edited metadata in the preview payload

### Regression Scope

Keep existing participant-review and confirm-import tests green to prove the metadata-editing change does not alter participant import behavior.

## Acceptance Criteria

1. A valid imported preview shows editable confirm inputs for `name`, `slug`, and `date`.
2. Those inputs are prefilled from the imported event metadata.
3. Edited values are used during confirmation instead of the original imported values.
4. Validation failures return field errors to the same confirm form without discarding edited metadata.
5. Participant import behavior and success redirects remain unchanged apart from the edited event metadata.
