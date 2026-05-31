import { createElement } from "react";
import { redirect } from "next/navigation.js";
import adminAuth from "../../../../lib/adminAuth.js";
import createEventDraftModule from "../../../../lib/createEventDraft.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";
import publicEventsQuery from "../../../../lib/publicEventsQuery.js";
import eventsDataModule from "../../../../lib/eventsData.js";
import udiscClientModule from "../../../../lib/udiscClient.js";
import udiscToDraftPreviewModule from "../../../../lib/udiscToDraftPreview.js";

const { requireAdmin } = adminAuth;
const { createEventDraft } = createEventDraftModule;
const { findEventBySlug, insertEventDraft } = eventDraftStore;
const { getPublicEventScoreboardBySlug } = publicEventsQuery;
const { getEventsData } = eventsDataModule;
const { fetchUdiscEventFromUrl } = udiscClientModule;
const { mapUdiscEventToDraftPreview } = udiscToDraftPreviewModule;

async function findNonDraftEventBySlug(slug) {
  const { players, events, eventResults, eventPoints } = getEventsData();

  return getPublicEventScoreboardBySlug({
    slug,
    players,
    events,
    eventResults,
    eventPoints,
  });
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

function messageForUdiscError(type) {
  if (type === "NOT_FOUND") return "UDisc event not found.";
  if (type === "RATE_LIMITED") return "UDisc is rate limiting requests. Please try again shortly.";
  if (type === "VALIDATION_ERROR") return "Please enter a valid UDisc leaderboard URL.";
  if (type === "UPSTREAM_FORMAT_CHANGED") {
    return "UDisc changed their leaderboard format. Please verify URL and try again.";
  }
  if (type === "MAPPING_ERROR") {
    return "UDisc leaderboard data could not be processed. Please try again later.";
  }
  return "UDisc is temporarily unavailable. Please try again.";
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

export function createFetchUdiscPreviewAction({
  requireAdminAccess = requireAdmin,
  fetchUdiscEventAdapter = fetchUdiscEventFromUrl,
  mapUdiscEventToDraftPreviewAdapter = mapUdiscEventToDraftPreview,
  redirectTo = redirect,
} = {}) {
  return async function fetchUdiscPreviewAction(_previousState, formData) {
    "use server";

    requireAdminAccess();
    const udiscUrl = String(formData.get("udiscUrl") || "").trim();

    try {
      const raw = await fetchUdiscEventAdapter({ leaderboardUrl: udiscUrl });
      const mapped = mapUdiscEventToDraftPreviewAdapter(raw);
      if (!mapped.ok) {
        const params = new URLSearchParams();
        params.set("udisc_error", messageForUdiscError("MAPPING_ERROR"));
        redirectTo(`/admin/events/new?${params.toString()}`);
        return;
      }

      const encoded = encodeURIComponent(JSON.stringify(mapped.preview));
      redirectTo(`/admin/events/new?udisc_preview=${encoded}`);
      return;
    } catch (error) {
      const params = new URLSearchParams();
      params.set("udisc_error", messageForUdiscError(error?.type));
      redirectTo(`/admin/events/new?${params.toString()}`);
      return;
    }
  };
}

export default function AdminNewEventPage({ searchParams = {} } = {}) {
  requireAdmin();
  const draftEventAction = createAdminDraftEventAction();
  const fetchUdiscPreviewAction = createFetchUdiscPreviewAction();
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
    createElement(
      "form",
      { action: fetchUdiscPreviewAction },
      createElement("label", { htmlFor: "udiscUrl" }, "UDisc Leaderboard URL"),
      createElement("input", { id: "udiscUrl", name: "udiscUrl", type: "url", required: true }),
      createElement("button", { type: "submit" }, "Fetch UDisc Preview")
    ),
    searchParams?.udisc_error ? createElement("p", null, searchParams.udisc_error) : null,
    wasCreated ? createElement("p", null, "Draft created.") : null,
    renderAdminDraftEventForm({ action: draftEventAction, fieldErrors })
  );
}
