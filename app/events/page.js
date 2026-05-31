import { createElement } from "react";
import publicEventsQuery from "../../lib/publicEventsQuery.js";
import demoLeaderboard from "../../lib/demoLeaderboard.js";
import eventsDataModule from "../../lib/eventsData.js";

const { listPublicEvents } = publicEventsQuery;
const { scoreDemoSeason } = demoLeaderboard;
const { getEventsData } = eventsDataModule;

function loadPublicEvents() {
  const { events } = getEventsData();
  return listPublicEvents({ events });
}

function loadDemoEvents() {
  const { scoredEvents } = scoreDemoSeason();

  return scoredEvents.map((event, index) => ({
    slug: event.id,
    name: event.label,
    eventDate: `2026-01-${String(index + 1).padStart(2, "0")}`,
  }));
}

function renderEventListItem(event, demoMode) {
  const href = demoMode ? `/events/${event.slug}?demo=1` : `/events/${event.slug}`;

  return createElement(
    "li",
    { key: event.slug },
    createElement("a", { href }, event.name)
  );
}

export default function EventsPage({ loadEvents = loadPublicEvents, searchParams = {} } = {}) {
  const demoMode = searchParams.demo === "1";
  const events = demoMode ? loadDemoEvents() : loadEvents();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Events"),
    events.length === 0
      ? createElement("p", null, "No public events yet.")
      : createElement("ul", null, events.map((event) => renderEventListItem(event, demoMode)))
  );
}
