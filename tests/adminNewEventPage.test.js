const test = require("node:test");
const assert = require("node:assert/strict");

test("draftEventAction enforces admin guard and forwards form payload", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");

  let requireAdminCalls = 0;
  const createDraftCalls = [];

  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {
      requireAdminCalls += 1;
    },
    createDraft: async (payload) => {
      createDraftCalls.push(payload);
      return { id: "evt_789", status: "draft" };
    },
  });

  const formData = new FormData();
  formData.set("slug", "  SPRING-SHOWDOWN ");
  formData.set("name", " Spring Showdown ");
  formData.set("eventDate", "2026-04-12");

  const result = await action({}, formData);

  assert.equal(requireAdminCalls, 1);
  assert.equal(createDraftCalls.length, 1);
  assert.deepEqual(createDraftCalls[0].input, {
    slug: "  SPRING-SHOWDOWN ",
    name: " Spring Showdown ",
    eventDate: "2026-04-12",
  });
  assert.equal(typeof createDraftCalls[0].findEventBySlug, "function");
  assert.equal(typeof createDraftCalls[0].insertEventDraft, "function");
  assert.deepEqual(result, { id: "evt_789", status: "draft" });
});

test("draftEventAction default persistence path creates and dedupes drafts", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  eventDraftStore.resetEventDraftStore();

  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
  });

  const firstFormData = new FormData();
  firstFormData.set("slug", "spring-showdown");
  firstFormData.set("name", "Spring Showdown");
  firstFormData.set("eventDate", "2026-04-12");

  const created = await action({}, firstFormData);
  assert.equal(created.slug, "spring-showdown");
  assert.equal(created.status, "draft");
  assert.ok(created.id);

  const duplicate = await action({}, firstFormData);
  assert.deepEqual(duplicate, {
    fieldErrors: {
      slug: "Slug is already in use",
    },
  });
});
