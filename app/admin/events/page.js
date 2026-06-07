import { createElement } from "react";
import adminAuth from "../../../lib/adminAuth.js";
import adminEventsQuery from "../../../lib/adminEventsQuery.js";
import eventDraftStore from "../../../lib/eventDraftStore.js";
import eventsDataModule from "../../../lib/eventsData.js";

const { requireAdmin } = adminAuth;
const { listAdminEvents } = adminEventsQuery;
const { listEventDrafts } = eventDraftStore;
const { getEventsData } = eventsDataModule;

async function loadAdminEvents() {
  const { events } = getEventsData();

  return listAdminEvents({
    events,
    drafts: await listEventDrafts(),
  });
}

function renderEventRow(row) {
  return createElement(
    "tr",
    { key: row.id },
    createElement("td", null, row.name),
    createElement("td", null, row.date),
    createElement("td", null, row.status),
    createElement(
      "td",
      null,
      createElement("a", { href: `/admin/events/${row.slug}/edit` }, "Edit")
    )
  );
}

function renderEventTable(rows) {
  return createElement(
    "table",
    null,
    createElement(
      "thead",
      null,
      createElement(
        "tr",
        null,
        createElement("th", { scope: "col" }, "Name"),
        createElement("th", { scope: "col" }, "Date"),
        createElement("th", { scope: "col" }, "Status"),
        createElement("th", { scope: "col" }, "Actions")
      )
    ),
    createElement("tbody", null, rows.map(renderEventRow))
  );
}

export default async function AdminEventsPage({
  requireAdminAccess = requireAdmin,
  loadRows = loadAdminEvents,
} = {}) {
  requireAdminAccess();
  const rows = await loadRows();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Admin Events"),
    createElement("a", { href: "/admin/events/new" }, "New Event"),
    rows.length === 0 ? createElement("p", null, "No events yet.") : renderEventTable(rows)
  );
}
