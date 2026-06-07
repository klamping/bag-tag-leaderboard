const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("AdminEventEditPage resolves a draft event by slug before a confirmed event", async () => {
  const { default: AdminEventEditPage } = await import("../app/admin/events/[slug]/edit/page.js");

  let requireAdminCalls = 0;
  const html = renderToStaticMarkup(
    await AdminEventEditPage({
      params: { slug: "spring-showdown" },
      requireAdminAccess: () => {
        requireAdminCalls += 1;
      },
      getEventsData: () => ({
        events: [
          {
            id: "evt_confirmed_0001",
            slug: "spring-showdown",
            name: "Spring Showdown",
            eventDate: "2026-04-12",
            status: "confirmed",
          },
        ],
      }),
      listEventDrafts: async () => [
        {
          id: "evt_draft_0001",
          slug: "spring-showdown",
          name: "Spring Showdown Draft",
          date: "2026-04-19",
          status: "draft",
        },
      ],
    })
  );

  assert.equal(requireAdminCalls, 1);
  assert.match(html, /Edit Event/);
  assert.match(html, /Spring Showdown Draft/);
  assert.match(html, /spring-showdown/);
  assert.match(html, /2026-04-19/);
  assert.match(html, /draft/);
  assert.match(html, /Editing is not implemented yet\./);
});

test("AdminEventEditPage resolves a confirmed event when no draft matches the slug", async () => {
  const { default: AdminEventEditPage } = await import("../app/admin/events/[slug]/edit/page.js");

  const html = renderToStaticMarkup(
    await AdminEventEditPage({
      params: { slug: "spring-showdown" },
      requireAdminAccess: () => {},
      getEventsData: () => ({
        events: [
          {
            id: "evt_confirmed_0001",
            slug: "spring-showdown",
            name: "Spring Showdown",
            eventDate: "2026-04-12",
            status: "confirmed",
          },
        ],
      }),
      listEventDrafts: async () => [],
    })
  );

  assert.match(html, /Spring Showdown/);
  assert.match(html, /spring-showdown/);
  assert.match(html, /2026-04-12/);
  assert.match(html, /confirmed/);
  assert.match(html, /Editing is not implemented yet\./);
});

test("AdminEventEditPage calls notFound for an unknown slug", async () => {
  const { default: AdminEventEditPage } = await import("../app/admin/events/[slug]/edit/page.js");

  const error = new Error("not found");

  await assert.rejects(
    AdminEventEditPage({
      params: { slug: "missing-slug" },
      requireAdminAccess: () => {},
      getEventsData: () => ({
        events: [
          {
            id: "evt_confirmed_0001",
            slug: "spring-showdown",
            name: "Spring Showdown",
            eventDate: "2026-04-12",
            status: "confirmed",
          },
        ],
      }),
      listEventDrafts: async () => [],
      handleNotFound: () => {
        throw error;
      },
    }),
    error
  );
});
