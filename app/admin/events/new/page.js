import { createElement } from "react";
import { redirect } from "next/navigation.js";
import adminAuth from "../../../../lib/adminAuth.js";
import createEventDraftModule from "../../../../lib/createEventDraft.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";

const { requireAdmin } = adminAuth;
const { createEventDraft } = createEventDraftModule;
const { findEventBySlug, insertEventDraft } = eventDraftStore;

async function findNonDraftEventBySlug() {
  return null;
}

export function renderAdminDraftEventForm({ action, fieldErrors }) {
  return createElement(
    "form",
    { action },
    createElement("label", { htmlFor: "name" }, "Name"),
    createElement("input", { id: "name", name: "name", type: "text", required: true }),
    fieldErrors.name ? createElement("p", { "data-field-error": "name" }, fieldErrors.name) : null,
    createElement("label", { htmlFor: "slug" }, "Slug"),
    createElement("input", { id: "slug", name: "slug", type: "text", required: true }),
    fieldErrors.slug ? createElement("p", { "data-field-error": "slug" }, fieldErrors.slug) : null,
    createElement("label", { htmlFor: "date" }, "Date"),
    createElement("input", { id: "date", name: "date", type: "date", required: true }),
    fieldErrors.date ? createElement("p", { "data-field-error": "date" }, fieldErrors.date) : null,
    createElement("label", { htmlFor: "isMajor" }, "Major event"),
    createElement("input", { id: "isMajor", name: "isMajor", type: "checkbox", value: "true" }),
    fieldErrors.isMajor
      ? createElement("p", { "data-field-error": "isMajor" }, fieldErrors.isMajor)
      : null,
    createElement("label", { htmlFor: "notes" }, "Notes"),
    createElement("textarea", { id: "notes", name: "notes" }),
    fieldErrors.notes ? createElement("p", { "data-field-error": "notes" }, fieldErrors.notes) : null,
    createElement("button", { type: "submit" }, "Create Draft")
  );
}

export function createAdminDraftEventAction({
  requireAdminAccess = requireAdmin,
  createDraft = createEventDraft,
  findEventBySlugAdapter = findEventBySlug,
  findNonDraftEventBySlugAdapter = findNonDraftEventBySlug,
  insertEventDraftAdapter = insertEventDraft,
  redirectTo = redirect,
} = {}) {
  return async function draftEventAction(_previousState, formData) {
    "use server";

    requireAdminAccess();

    const input = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      date: formData.get("date"),
      isMajor: formData.get("isMajor"),
      notes: formData.get("notes"),
    };

    const result = await createDraft({
      input,
      findEventBySlug: async (slug) => {
        const [draftMatch, nonDraftMatch] = await Promise.all([
          findEventBySlugAdapter(slug),
          findNonDraftEventBySlugAdapter(slug),
        ]);

        return draftMatch || nonDraftMatch;
      },
      insertEventDraft: insertEventDraftAdapter,
    });

    if (result?.fieldErrors) {
      const params = new URLSearchParams();
      const fieldErrorEntries = Object.entries(result.fieldErrors);
      for (const [fieldName, message] of fieldErrorEntries) {
        params.set(`error_${fieldName}`, message);
      }

      redirectTo(`/admin/events/new?${params.toString()}`);
      return;
    }

    redirectTo("/admin/events/new?created=1");
  };
}

export default function AdminNewEventPage({ searchParams = {} } = {}) {
  requireAdmin();
  const draftEventAction = createAdminDraftEventAction();
  const wasCreated = searchParams?.created === "1";
  const fieldErrors = {
    name: searchParams?.error_name || "",
    slug: searchParams?.error_slug || "",
    date: searchParams?.error_date || "",
    isMajor: searchParams?.error_isMajor || "",
    notes: searchParams?.error_notes || "",
  };

  return createElement(
    "main",
    null,
    createElement("h1", null, "Create Event Draft"),
    wasCreated ? createElement("p", null, "Draft created.") : null,
    renderAdminDraftEventForm({ action: draftEventAction, fieldErrors })
  );
}
