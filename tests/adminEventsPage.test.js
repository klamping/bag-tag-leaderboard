const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("AdminEventsPage enforces admin access and renders event rows with edit links", async () => {
  const { default: AdminEventsPage } = await import("../app/admin/events/page.js");

  let requireAdminCalls = 0;
  let loadRowsCalls = 0;

  const html = renderToStaticMarkup(
    await AdminEventsPage({
      requireAdminAccess: () => {
        requireAdminCalls += 1;
      },
      loadRows: () => {
        loadRowsCalls += 1;
        return [
          {
            id: "evt_draft_0001",
            slug: "draft-night",
            name: "Draft Night",
            date: "2026-05-01",
            status: "draft",
            sourceType: "draft",
          },
          {
            id: "evt_confirmed_0001",
            slug: "spring-showdown",
            name: "Spring Showdown",
            date: "2026-04-12",
            status: "confirmed",
            sourceType: "confirmed",
          },
        ];
      },
    })
  );

  assert.equal(requireAdminCalls, 1);
  assert.equal(loadRowsCalls, 1);
  assert.match(html, /href="\/admin\/events\/new"/);
  assert.match(html, /Draft Night/);
  assert.match(html, /Spring Showdown/);
  assert.match(html, />draft-night</);
  assert.match(html, />spring-showdown</);
  assert.match(html, /2026-05-01/);
  assert.match(html, /2026-04-12/);
  assert.match(html, />draft</);
  assert.match(html, />confirmed</);
  assert.match(html, /href="\/admin\/events\/draft-night\/edit"/);
  assert.match(html, /href="\/admin\/events\/spring-showdown\/edit"/);
});

test("AdminEventsPage renders a simple empty state", async () => {
  const { default: AdminEventsPage } = await import("../app/admin/events/page.js");

  const html = renderToStaticMarkup(
    await AdminEventsPage({
      requireAdminAccess: () => {},
      loadRows: () => [],
    })
  );

  assert.match(html, /No events yet\./);
});

test("AdminEventsPage default path renders draft and confirmed events from the admin query seam", async (t) => {
  const { default: AdminEventsPage } = await import("../app/admin/events/page.js");
  const eventsData = await import("../lib/eventsData.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  t.after(() => {
    eventsData.resetEventsData();
    eventDraftStore.resetEventDraftStore();
  });

  eventsData.resetEventsData({
    events: [
      {
        id: "evt_confirmed_0007",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        status: "confirmed",
      },
    ],
  });

  eventDraftStore.resetEventDraftStore();
  await eventDraftStore.insertEventDraft({
    slug: "draft-night",
    name: "Draft Night",
    date: "2026-05-01",
    status: "draft",
  });

  const html = renderToStaticMarkup(
    await AdminEventsPage({
      requireAdminAccess: () => {},
    })
  );

  assert.match(html, /Draft Night/);
  assert.match(html, /Spring Showdown/);
  assert.match(html, />draft-night</);
  assert.match(html, />spring-showdown</);
  assert.match(html, /href="\/admin\/events\/draft-night\/edit"/);
  assert.match(html, /href="\/admin\/events\/spring-showdown\/edit"/);
});
