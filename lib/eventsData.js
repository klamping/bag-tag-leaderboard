const EVENTS_DATA = {
  players: [],
  events: [
    {
      id: "evt_confirmed_0001",
      slug: "spring-showdown",
      name: "Spring Showdown",
      eventDate: "2026-04-12",
      status: "confirmed",
    },
  ],
  eventResults: [],
  eventPoints: [],
};

function getEventsData() {
  return EVENTS_DATA;
}

module.exports = {
  getEventsData,
};
