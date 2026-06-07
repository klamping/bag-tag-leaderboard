import eventsData from "../../../../lib/eventsData.js";
import eventDraftStore from "../../../../lib/eventDraftStore.js";
import testMode from "../../../../lib/e2e/testMode.js";

const { resetEventsData } = eventsData;
const { resetEventDraftStore } = eventDraftStore;
const { isValidPlaywrightTestRequest } = testMode;

export async function POST(request) {
  if (!isValidPlaywrightTestRequest({ headers: request.headers })) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  resetEventsData({
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  resetEventDraftStore();

  return Response.json({ ok: true });
}
