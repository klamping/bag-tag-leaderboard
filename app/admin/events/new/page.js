import { createElement } from "react";
import adminAuth from "../../../../lib/adminAuth.js";
import createEventDraftModule from "../../../../lib/createEventDraft.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";

const { requireAdmin } = adminAuth;
const { createEventDraft } = createEventDraftModule;
const { findEventBySlug, insertEventDraft } = eventDraftStore;

export function createAdminDraftEventAction({
  requireAdminAccess = requireAdmin,
  createDraft = createEventDraft,
  findEventBySlugAdapter = findEventBySlug,
  insertEventDraftAdapter = insertEventDraft,
} = {}) {
  return async function draftEventAction(_previousState, formData) {
    "use server";

    requireAdminAccess();

    const input = {
      slug: formData.get("slug"),
      name: formData.get("name"),
      eventDate: formData.get("eventDate"),
    };

    return createDraft({
      input,
      findEventBySlug: findEventBySlugAdapter,
      insertEventDraft: insertEventDraftAdapter,
    });
  };
}

export default function AdminNewEventPage() {
  requireAdmin();
  const draftEventAction = createAdminDraftEventAction();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Create Event Draft"),
    createElement(
      "form",
      { action: draftEventAction },
      createElement("label", { htmlFor: "slug" }, "Slug"),
      createElement("input", { id: "slug", name: "slug", type: "text", required: true }),
      createElement("label", { htmlFor: "name" }, "Name"),
      createElement("input", { id: "name", name: "name", type: "text", required: true }),
      createElement("label", { htmlFor: "eventDate" }, "Event Date"),
      createElement("input", {
        id: "eventDate",
        name: "eventDate",
        type: "date",
        required: true,
      }),
      createElement("button", { type: "submit" }, "Create Draft")
    )
  );
}
