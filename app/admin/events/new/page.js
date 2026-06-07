import { createElement } from "react";
import { redirect } from "next/navigation.js";
import adminAuth from "../../../../lib/adminAuth.js";
import createEventDraftModule from "../../../../lib/createEventDraft.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";
import publicEventsQuery from "../../../../lib/publicEventsQuery.js";
import eventsDataModule from "../../../../lib/eventsData.js";
import confirmImportedEventModule from "../../../../lib/confirmImportedEvent.js";
import reviewUdiscDraftPreviewModule from "../../../../lib/reviewUdiscDraftPreview.js";
import udiscClientModule from "../../../../lib/udiscClient.js";
import udiscToDraftPreviewModule from "../../../../lib/udiscToDraftPreview.js";

const { requireAdmin } = adminAuth;
const { createEventDraft } = createEventDraftModule;
const { findEventBySlug, insertEventDraft } = eventDraftStore;
const { getPublicEventScoreboardBySlug } = publicEventsQuery;
const {
  getEventsData,
  findConfirmedEventBySlug,
  insertPlayer,
  deletePlayer,
  insertConfirmedEvent,
  deleteConfirmedEvent,
  insertEventResults,
  deleteEventResult,
  insertEventPoints,
  deleteEventPoint,
} = eventsDataModule;
const { confirmImportedEvent } = confirmImportedEventModule;
const { reviewUdiscDraftPreview } = reviewUdiscDraftPreviewModule;
const { fetchUdiscEventFromUrl } = udiscClientModule;
const { mapUdiscEventToDraftPreview } = udiscToDraftPreviewModule;

function getKnownPlayers() {
  return getEventsData().players;
}

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

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parsePreviewPayload(value) {
  const parsed = parseJsonObject(value);
  if (!parsed || !parsed.event || !Array.isArray(parsed.participants)) {
    return null;
  }

  return parsed;
}

function parseReviewErrors(value) {
  return parseJsonObject(value) || {};
}

function applySubmittedPreviewMetadata(preview, formData) {
  const submittedName = formData.get("name");
  const submittedSlug = formData.get("slug");
  const submittedDate = formData.get("date");

  return {
    ...preview,
    event: {
      ...preview.event,
      name: submittedName === null ? String(preview.event?.name || "") : String(submittedName),
      slug: submittedSlug === null ? String(preview.event?.slug || "") : String(submittedSlug),
      date: submittedDate === null ? String(preview.event?.date || "") : String(submittedDate),
    },
  };
}

function buildPreviewRedirectUrl({ preview, previewValid = false, reviewErrors = null, udiscError = "" } = {}) {
  const params = new URLSearchParams();

  if (preview) {
    params.set("udisc_preview", JSON.stringify(preview));
  }

  if (previewValid) {
    params.set("preview_valid", "1");
  }

  if (reviewErrors && Object.keys(reviewErrors).length > 0) {
    params.set("review_errors", JSON.stringify(reviewErrors));
  }

  if (udiscError) {
    params.set("udisc_error", udiscError);
  }

  return `/admin/events/new?${params.toString()}`;
}

function collectStartingTagsByIndex(formData, participantCount) {
  const startingTagsByIndex = {};

  for (let index = 0; index < participantCount; index += 1) {
    startingTagsByIndex[index] = formData.get(`participants_${index}_startingTag`);
  }

  return startingTagsByIndex;
}

export function createAdminDraftEventAction({
  requireAdminAccess = requireAdmin,
  createDraft = createEventDraft,
  findEventBySlugAdapter = findEventBySlug,
  findNonDraftEventBySlugAdapter = findNonDraftEventBySlug,
  insertEventDraftAdapter = insertEventDraft,
  redirectTo = redirect,
} = {}) {
  return async function draftEventAction(formData) {
    "use server";

    return submitAdminDraftEvent(formData, {
      requireAdminAccess,
      createDraft,
      findEventBySlugAdapter,
      findNonDraftEventBySlugAdapter,
      insertEventDraftAdapter,
      redirectTo,
    });
  };
}

async function submitAdminDraftEvent(
  formData,
  {
    requireAdminAccess = requireAdmin,
    createDraft = createEventDraft,
    findEventBySlugAdapter = findEventBySlug,
    findNonDraftEventBySlugAdapter = findNonDraftEventBySlug,
    insertEventDraftAdapter = insertEventDraft,
    redirectTo = redirect,
  } = {}
) {
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
}

async function draftEventAction(formData) {
  "use server";

  return submitAdminDraftEvent(formData);
}

export async function adminDraftEventAction(formData) {
  "use server";

  return submitAdminDraftEvent(formData);
}

export function createFetchUdiscPreviewAction({
  requireAdminAccess = requireAdmin,
  fetchUdiscEventAdapter = fetchUdiscEventFromUrl,
  mapUdiscEventToDraftPreviewAdapter = mapUdiscEventToDraftPreview,
  getKnownPlayers: getKnownPlayersAdapter = getKnownPlayers,
  redirectTo = redirect,
} = {}) {
  return async function fetchUdiscPreviewAction(formData) {
    "use server";

    return submitFetchUdiscPreview(formData, {
      requireAdminAccess,
      fetchUdiscEventAdapter,
      mapUdiscEventToDraftPreviewAdapter,
      getKnownPlayersAdapter,
      redirectTo,
    });
  };
}

async function submitFetchUdiscPreview(
  formData,
  {
    requireAdminAccess = requireAdmin,
    fetchUdiscEventAdapter = fetchUdiscEventFromUrl,
    mapUdiscEventToDraftPreviewAdapter = mapUdiscEventToDraftPreview,
    getKnownPlayersAdapter = getKnownPlayers,
    redirectTo = redirect,
  } = {}
) {
  requireAdminAccess();
  const udiscUrl = String(formData.get("udiscUrl") || "").trim();
  let redirectUrl;

  try {
    const raw = await fetchUdiscEventAdapter({ leaderboardUrl: udiscUrl });
    const mapped = mapUdiscEventToDraftPreviewAdapter(raw);
    if (!mapped.ok) {
      redirectUrl = buildPreviewRedirectUrl({
        udiscError: messageForUdiscError("MAPPING_ERROR"),
      });
    } else {
      redirectUrl = buildPreviewRedirectUrl({
        preview: reviewUdiscDraftPreview({
          preview: mapped.preview,
          knownPlayers: getKnownPlayersAdapter(),
          validateStartingTags: false,
        }).preview,
      });
    }
  } catch (error) {
    redirectUrl = buildPreviewRedirectUrl({
      udiscError: messageForUdiscError(error?.type),
    });
  }

  redirectTo(redirectUrl);
}

export async function fetchUdiscPreviewAction(formData) {
  "use server";

  return submitFetchUdiscPreview(formData);
}

export function createReviewUdiscPreviewAction({
  requireAdminAccess = requireAdmin,
  getKnownPlayers: getKnownPlayersAdapter = getKnownPlayers,
  redirectTo = redirect,
} = {}) {
  return async function reviewUdiscPreviewAction(formData) {
    "use server";

    return submitReviewUdiscPreview(formData, {
      requireAdminAccess,
      getKnownPlayersAdapter,
      redirectTo,
    });
  };
}

async function submitReviewUdiscPreview(
  formData,
  {
    requireAdminAccess = requireAdmin,
    getKnownPlayersAdapter = getKnownPlayers,
    redirectTo = redirect,
  } = {}
) {
  requireAdminAccess();

  const preview = parsePreviewPayload(formData.get("previewPayload"));
  if (!preview) {
    redirectTo(
      buildPreviewRedirectUrl({
        udiscError: messageForUdiscError("MAPPING_ERROR"),
      })
    );
    return;
  }

  const result = reviewUdiscDraftPreview({
    preview,
    knownPlayers: getKnownPlayersAdapter(),
    startingTagsByIndex: collectStartingTagsByIndex(formData, preview.participants.length),
  });

  redirectTo(
    buildPreviewRedirectUrl({
      preview: result.preview,
      previewValid: result.ok,
      reviewErrors: result.ok ? null : result.fieldErrors,
    })
  );
}

export async function reviewUdiscPreviewAction(formData) {
  "use server";

  return submitReviewUdiscPreview(formData);
}

export function createConfirmUdiscImportAction({
  requireAdminAccess = requireAdmin,
  confirmImportedEventAdapter = confirmImportedEvent,
  findDraftEventBySlugAdapter = findEventBySlug,
  findConfirmedEventBySlugAdapter = findConfirmedEventBySlug,
  insertPlayerAdapter = insertPlayer,
  rollbackPlayerAdapter = deletePlayer,
  insertConfirmedEventAdapter = insertConfirmedEvent,
  rollbackConfirmedEventAdapter = deleteConfirmedEvent,
  insertEventResultsAdapter = insertEventResults,
  rollbackEventResultAdapter = deleteEventResult,
  insertEventPointsAdapter = insertEventPoints,
  rollbackEventPointAdapter = deleteEventPoint,
  redirectTo = redirect,
} = {}) {
  return async function confirmUdiscImportAction(formData) {
    "use server";

    return submitConfirmUdiscImport(formData, {
      requireAdminAccess,
      confirmImportedEventAdapter,
      findDraftEventBySlugAdapter,
      findConfirmedEventBySlugAdapter,
      insertPlayerAdapter,
      rollbackPlayerAdapter,
      insertConfirmedEventAdapter,
      rollbackConfirmedEventAdapter,
      insertEventResultsAdapter,
      rollbackEventResultAdapter,
      insertEventPointsAdapter,
      rollbackEventPointAdapter,
      redirectTo,
    });
  };
}

async function submitConfirmUdiscImport(
  formData,
  {
    requireAdminAccess = requireAdmin,
    confirmImportedEventAdapter = confirmImportedEvent,
    findDraftEventBySlugAdapter = findEventBySlug,
    findConfirmedEventBySlugAdapter = findConfirmedEventBySlug,
    insertPlayerAdapter = insertPlayer,
    rollbackPlayerAdapter = deletePlayer,
    insertConfirmedEventAdapter = insertConfirmedEvent,
    rollbackConfirmedEventAdapter = deleteConfirmedEvent,
    insertEventResultsAdapter = insertEventResults,
    rollbackEventResultAdapter = deleteEventResult,
    insertEventPointsAdapter = insertEventPoints,
    rollbackEventPointAdapter = deleteEventPoint,
    redirectTo = redirect,
  } = {}
) {
  requireAdminAccess();

  const preview = parsePreviewPayload(formData.get("previewPayload"));
  if (!preview) {
    redirectTo("/admin/events/new?confirm_error=Imported+preview+is+invalid.");
    return;
  }

  const previewWithSubmittedMetadata = applySubmittedPreviewMetadata(preview, formData);

  const result = await confirmImportedEventAdapter({
    preview: previewWithSubmittedMetadata,
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
        preview: previewWithSubmittedMetadata,
        previewValid: true,
        reviewErrors: result?.fieldErrors,
      })
    );
    return;
  }

  const params = new URLSearchParams();
  params.set("confirmed", "1");
  params.set("confirmed_slug", result.event.slug);
  redirectTo(`/admin/events/new?${params.toString()}`);
}

export async function confirmUdiscImportAction(formData) {
  "use server";

  return submitConfirmUdiscImport(formData);
}

export function renderUdiscPreviewSection({
  preview,
  previewValid = false,
  reviewErrors = {},
  action,
  confirmAction,
} = {}) {
  if (!preview) return null;

  const participantRows = (Array.isArray(preview.participants) ? preview.participants : []).map(
    (participant, index) => {
      const startingTagField = `participants_${index}_startingTag`;
      const matchStatusField = `participants_${index}_matchStatus`;

      return createElement(
        "div",
        {
          key: `${participant.externalPlayerId || participant.playerName || index}`,
          "data-testid": `participant-review-row-${index}`,
        },
        createElement("p", null, participant.playerName),
        createElement("p", null, `Finish place: ${participant.finishPlace}`),
        participant.matchStatus === "matched"
          ? createElement("p", null, `Matched player: ${participant.matchedPlayerName}`)
          : null,
        participant.matchStatus === "unmatched" ? createElement("p", null, "New player") : null,
        participant.matchStatus === "matched"
          ? createElement(
              "div",
              null,
              createElement("label", { htmlFor: startingTagField }, "Starting Tag"),
              createElement("input", {
                id: startingTagField,
                name: startingTagField,
                type: "number",
                min: 1,
                required: true,
                defaultValue: participant.startingTag,
                "data-testid": `participant-review-starting-tag-${index}`,
              })
            )
          : null,
        reviewErrors[matchStatusField]
          ? createElement("p", { "data-field-error": matchStatusField }, reviewErrors[matchStatusField])
          : null,
        reviewErrors[startingTagField]
          ? createElement("p", { "data-field-error": startingTagField }, reviewErrors[startingTagField])
          : null
      );
    }
  );

  return createElement(
    "section",
    null,
    createElement("h2", null, "Preview Event"),
    createElement("p", null, preview.event?.name || ""),
    createElement("p", null, preview.event?.slug || ""),
    createElement("p", null, preview.event?.date || ""),
    reviewErrors.name ? createElement("p", { "data-field-error": "name" }, reviewErrors.name) : null,
    reviewErrors.slug ? createElement("p", { "data-field-error": "slug" }, reviewErrors.slug) : null,
    reviewErrors.date ? createElement("p", { "data-field-error": "date" }, reviewErrors.date) : null,
    createElement(
      "form",
      { action, "data-testid": "participant-review-form" },
      createElement("input", {
        type: "hidden",
        name: "previewPayload",
        value: JSON.stringify(preview),
      }),
      createElement("h3", null, "Participant Review"),
      ...participantRows,
      createElement("button", { type: "submit" }, "Review Imported Players")
    ),
    previewValid === true
      ? createElement(
          "form",
          { action: confirmAction, "data-testid": "confirm-import-form" },
          createElement("input", {
            type: "hidden",
            name: "previewPayload",
            value: JSON.stringify(preview),
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
          createElement("p", null, "This import is ready to confirm."),
          createElement("button", { type: "submit" }, "Confirm Import")
        )
      : null
  );
}

export default function AdminNewEventPage({ searchParams = {} } = {}) {
  requireAdmin();
  const wasCreated = searchParams?.created === "1";
  const wasConfirmed = searchParams?.confirmed === "1";
  const previewValid = searchParams?.preview_valid === "1";
  const preview = parsePreviewPayload(searchParams?.udisc_preview);
  const reviewErrors = parseReviewErrors(searchParams?.review_errors);
  const confirmError = searchParams?.confirm_error || "";
  const confirmedSlug = searchParams?.confirmed_slug || "";
  const udiscError = preview || !searchParams?.udisc_preview
    ? searchParams?.udisc_error
    : messageForUdiscError("MAPPING_ERROR");
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
    udiscError ? createElement("p", null, udiscError) : null,
    confirmError ? createElement("p", null, confirmError) : null,
    renderUdiscPreviewSection({
      preview,
      previewValid,
      reviewErrors,
      action: reviewUdiscPreviewAction,
      confirmAction: confirmUdiscImportAction,
    }),
    wasConfirmed ? createElement("p", null, `Imported event confirmed. ${confirmedSlug}`) : null,
    wasCreated ? createElement("p", null, "Draft created.") : null,
    renderAdminDraftEventForm({ action: adminDraftEventAction, fieldErrors })
  );
}
