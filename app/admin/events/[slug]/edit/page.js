import { createElement } from "react";
import { notFound } from "next/navigation.js";
import adminAuth from "../../../../../lib/adminAuth.js";
import adminEventsQuery from "../../../../../lib/adminEventsQuery.js";
import eventDraftStore from "../../../../../lib/eventDraftStore.js";
import eventsDataModule from "../../../../../lib/eventsData.js";

const { requireAdmin } = adminAuth;
const { getAdminEventBySlug } = adminEventsQuery;
const { listEventDrafts } = eventDraftStore;
const { getEventsData } = eventsDataModule;

async function loadAdminEvent({
  slug,
  getEventsData: loadEventsData = getEventsData,
  listEventDrafts: loadEventDrafts = listEventDrafts,
}) {
  const { events } = loadEventsData();

  return getAdminEventBySlug({
    slug,
    events,
    drafts: await loadEventDrafts(),
  });
}

export default async function AdminEventEditPage({
  params = {},
  requireAdminAccess = requireAdmin,
  getEventsData: loadEventsData = getEventsData,
  listEventDrafts: loadEventDrafts = listEventDrafts,
  handleNotFound = notFound,
} = {}) {
  requireAdminAccess();

  const event = await loadAdminEvent({
    slug: params.slug,
    getEventsData: loadEventsData,
    listEventDrafts: loadEventDrafts,
  });

  if (!event) {
    handleNotFound();
    return null;
  }

  return createElement(
    "main",
    null,
    createElement("h1", null, "Edit Event"),
    createElement("p", null, `Name: ${event.name || event.slug}`),
    createElement("p", null, `Slug: ${event.slug}`),
    createElement("p", null, `Date: ${event.date}`),
    createElement("p", null, `Status: ${event.status}`),
    createElement("p", null, "Editing is not implemented yet.")
  );
}
