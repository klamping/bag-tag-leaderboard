# Imported Event Confirm Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin UDisc confirm-import form autofill editable `name`, `slug`, and `date` fields, and ensure submitted edits are used during confirmation.

**Architecture:** Keep the existing preview -> confirm flow intact. Expand the confirm boundary in `app/admin/events/new/page.js` so the action merges submitted event metadata into `preview.event`, then expand the valid-preview confirm form to render editable inputs for all three event fields. Cover both behaviors in the existing phase 6 admin event tests.

**Tech Stack:** Next.js App Router server actions, React `createElement`, Node test runner (`node --test`)

---

## File Structure

- Modify: `app/admin/events/new/page.js`
Purpose: Replace the slug-only preview merge helper with a helper that merges `name`, `slug`, and `date` from confirm form submission, then render matching editable confirm inputs.

- Modify: `tests/adminNewEventPage.phase6.test.js`
Purpose: Add regression coverage for confirm action metadata overrides and confirm-form autofill rendering.

## Task 1: Merge Submitted Event Metadata In Confirm Action

**Files:**
- Modify: `tests/adminNewEventPage.phase6.test.js`
- Modify: `app/admin/events/new/page.js`
- Test: `tests/adminNewEventPage.phase6.test.js`

- [ ] **Step 1: Write the failing test**

Update the existing confirm-failure test in `tests/adminNewEventPage.phase6.test.js` so it proves all three submitted values override the imported preview metadata before `confirmImportedEventAdapter` runs.

```js
test("createConfirmUdiscImportAction preserves edited event fields and field errors when confirm fails", async () => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");

  const preview = buildPreview();
  const updatedPreview = {
    ...preview,
    event: {
      ...preview.event,
      name: "Spring Showdown Final",
      slug: "spring-showdown-3",
      date: "2026-04-19",
    },
  };
  const redirects = [];
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    confirmImportedEventAdapter: async ({ preview: receivedPreview }) => {
      assert.deepEqual(receivedPreview, updatedPreview);
      return {
        ok: false,
        fieldErrors: {
          date: "Date is invalid",
          slug: "Slug is already in use",
        },
      };
    },
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set("previewPayload", JSON.stringify(preview));
  formData.set("name", "Spring Showdown Final");
  formData.set("slug", "spring-showdown-3");
  formData.set("date", "2026-04-19");

  await action(formData);

  const location = new URL(redirects[0], "https://example.test");
  assert.deepEqual(JSON.parse(location.searchParams.get("udisc_preview")), updatedPreview);
  assert.deepEqual(JSON.parse(location.searchParams.get("review_errors")), {
    date: "Date is invalid",
    slug: "Slug is already in use",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js`
Expected: FAIL in `createConfirmUdiscImportAction preserves edited event fields and field errors when confirm fails` because the current implementation only changes `slug`.

- [ ] **Step 3: Write minimal implementation**

Replace the slug-only helper with an event-field merge helper in `app/admin/events/new/page.js`, and use it from `submitConfirmUdiscImport()`.

```js
function applyPreviewEventFields(preview, formData) {
  return {
    ...preview,
    event: {
      ...preview.event,
      name: String(formData.get("name") || preview.event?.name || ""),
      slug: String(formData.get("slug") || preview.event?.slug || ""),
      date: String(formData.get("date") || preview.event?.date || ""),
    },
  };
}

// inside submitConfirmUdiscImport(...)
const previewWithEventFields = applyPreviewEventFields(preview, formData);

const result = await confirmImportedEventAdapter({
  preview: previewWithEventFields,
  findExistingEventBySlug: async (slug) => {
    const [draftMatch, confirmedMatch] = await Promise.all([
      findDraftEventBySlugAdapter(slug),
      findConfirmedEventBySlugAdapter(slug),
    ]);

    return draftMatch || confirmedMatch;
  },
  insertPlayer: insertPlayerAdapter,
  rollbackPlayer: rollbackPlayerAdapter,
  insertConfirmedEvent: insertConfirmedEventAdapter,
  rollbackConfirmedEvent: rollbackConfirmedEventAdapter,
  insertEventResult: async (payload) => insertEventResultsAdapter([payload]).then((rows) => rows[0]),
  rollbackEventResult: rollbackEventResultAdapter,
  insertEventPoint: async (payload) => insertEventPointsAdapter([payload]).then((rows) => rows[0]),
  rollbackEventPoint: rollbackEventPointAdapter,
});

if (!result?.ok) {
  redirectTo(
    buildPreviewRedirectUrl({
      preview: previewWithEventFields,
      previewValid: true,
      reviewErrors: result?.fieldErrors,
    })
  );
  return;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js`
Expected: PASS for the updated confirm-failure test and the rest of the file.

- [ ] **Step 5: Commit**

```bash
git add tests/adminNewEventPage.phase6.test.js app/admin/events/new/page.js
git commit -m "feat: preserve edited imported event fields"
```

## Task 2: Render Editable Autofill Inputs For Name, Slug, And Date

**Files:**
- Modify: `tests/adminNewEventPage.phase6.test.js`
- Modify: `app/admin/events/new/page.js`
- Test: `tests/adminNewEventPage.phase6.test.js`

- [ ] **Step 1: Write the failing test**

Expand the valid-preview render test in `tests/adminNewEventPage.phase6.test.js` to require autofilled confirm inputs for all three event fields.

```js
assert.match(validHtml, /data-testid="confirm-import-form"/);
assert.match(validHtml, /data-testid="confirm-import-name"/);
assert.match(validHtml, /data-testid="confirm-import-slug"/);
assert.match(validHtml, /data-testid="confirm-import-date"/);
assert.match(validHtml, /name="name"/);
assert.match(validHtml, /name="slug"/);
assert.match(validHtml, /name="date"/);
assert.match(validHtml, /value="Spring Showdown"/);
assert.match(validHtml, /value="spring-showdown-2"/);
assert.match(validHtml, /value="2026-04-12"/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js`
Expected: FAIL because the current confirm form only renders the `slug` input and lacks `confirm-import-name` and `confirm-import-date`.

- [ ] **Step 3: Write minimal implementation**

Update the valid-preview confirm form in `app/admin/events/new/page.js` to render all three labeled inputs with imported `defaultValue`s.

```js
createElement("label", { htmlFor: "confirm_name" }, "Name"),
createElement("input", {
  id: "confirm_name",
  name: "name",
  type: "text",
  required: true,
  defaultValue: preview.event?.name || "",
  "data-testid": "confirm-import-name",
}),
createElement("label", { htmlFor: "confirm_slug" }, "Slug"),
createElement("input", {
  id: "confirm_slug",
  name: "slug",
  type: "text",
  required: true,
  defaultValue: preview.event?.slug || "",
  "data-testid": "confirm-import-slug",
}),
createElement("label", { htmlFor: "confirm_date" }, "Date"),
createElement("input", {
  id: "confirm_date",
  name: "date",
  type: "date",
  required: true,
  defaultValue: preview.event?.date || "",
  "data-testid": "confirm-import-date",
}),
```

Leave the existing `reviewErrors.name`, `reviewErrors.slug`, and `reviewErrors.date` rendering in place so validation failures still show next to the preview section.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js`
Expected: PASS, including the updated render test and the confirm-action regressions.

- [ ] **Step 5: Run the focused regression suite**

Run: `npm test -- tests/adminNewEventPage.phase6.test.js tests/confirmImportedEvent.test.js`
Expected: PASS. `confirmImportedEvent.test.js` should remain green because the validation contract is unchanged.

- [ ] **Step 6: Commit**

```bash
git add tests/adminNewEventPage.phase6.test.js app/admin/events/new/page.js
git commit -m "feat: autofill imported event confirm fields"
```

## Spec Coverage Check

- Editable autofill inputs for `name`, `slug`, and `date`: covered in Task 2.
- Submitted edits override imported preview values: covered in Task 1.
- Validation errors round-trip with edited metadata preserved: covered in Task 1.
- Participant import flow remains unchanged: covered by Task 2 focused regression run.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation notes remain.
- All file paths, test commands, helper names, and expected assertions are concrete.
- Later task names and helper names match earlier definitions: `applyPreviewEventFields`, `confirm-import-name`, `confirm-import-slug`, `confirm-import-date`.
