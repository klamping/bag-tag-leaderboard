const test = require("node:test");
const assert = require("node:assert/strict");

const { getEventsData, resetEventsData } = require("../lib/eventsData.js");
const { insertEventDraft, findEventBySlug, resetEventDraftStore } = require("../lib/eventDraftStore.js");

test("POST /api/test/reset rejects requests without the configured secret header", async (t) => {
  t.after(() => {
    resetEventsData();
    resetEventDraftStore();
  });

  resetEventsData({
    players: [{ id: "player_0001", name: "Protected Player" }],
    events: [{ id: "evt_confirmed_9999", slug: "protected-event", name: "Protected Event", eventDate: "2026-06-05", status: "confirmed" }],
    eventResults: [],
    eventPoints: [],
  });

  const { POST } = await import("../app/api/test/reset/route.js");
  const response = await POST(new Request("http://127.0.0.1:3000/api/test/reset", { method: "POST" }));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
  assert.equal(getEventsData().events.length, 1);
});

test("POST /api/test/reset clears events data and draft store with a valid secret header", async (t) => {
  t.after(() => {
    resetEventsData();
    resetEventDraftStore();
  });

  resetEventsData({
    players: [{ id: "player_0001", name: "Reset Player" }],
    events: [{ id: "evt_confirmed_1111", slug: "reset-event", name: "Reset Event", eventDate: "2026-06-05", status: "confirmed" }],
    eventResults: [{ id: "result_0001", eventId: "evt_confirmed_1111", playerId: "player_0001", finishPlace: 1 }],
    eventPoints: [{ id: "point_0001", eventId: "evt_confirmed_1111", eventResultId: "result_0001", playerId: "player_0001", points: 10 }],
  });
  await insertEventDraft({ slug: "draft-to-clear", name: "Draft To Clear", date: "2026-06-06", status: "draft" });

  process.env.PLAYWRIGHT_TEST_MODE = "true";
  process.env.PLAYWRIGHT_TEST_SECRET = "playwright-reset-secret";

  const { POST } = await import("../app/api/test/reset/route.js");
  const response = await POST(
    new Request("http://127.0.0.1:3000/api/test/reset", {
      method: "POST",
      headers: {
        "x-playwright-test-secret": "playwright-reset-secret",
      },
    })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(getEventsData(), {
    players: [],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  assert.equal(await findEventBySlug("draft-to-clear"), null);
});

test("POST /api/test/reset rejects valid secret requests when Playwright test mode is disabled", async (t) => {
  t.after(() => {
    resetEventsData();
    resetEventDraftStore();
    delete process.env.PLAYWRIGHT_TEST_MODE;
    delete process.env.PLAYWRIGHT_TEST_SECRET;
  });

  resetEventsData({
    players: [],
    events: [{ id: "evt_confirmed_2222", slug: "disabled-mode-event", name: "Disabled Mode Event", eventDate: "2026-06-05", status: "confirmed" }],
    eventResults: [],
    eventPoints: [],
  });

  process.env.PLAYWRIGHT_TEST_MODE = "false";
  process.env.PLAYWRIGHT_TEST_SECRET = "playwright-reset-secret";

  const { POST } = await import("../app/api/test/reset/route.js");
  const response = await POST(
    new Request("http://127.0.0.1:3000/api/test/reset", {
      method: "POST",
      headers: {
        "x-playwright-test-secret": "playwright-reset-secret",
      },
    })
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
  assert.equal(getEventsData().events.length, 1);
});
