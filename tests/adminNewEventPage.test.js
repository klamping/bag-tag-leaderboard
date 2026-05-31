const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

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
      return {
        fieldErrors: {
          name: "Name is required",
        },
      };
    },
    redirectTo: () => {},
  });

  const formData = new FormData();
  formData.set("slug", "  SPRING-SHOWDOWN ");
  formData.set("name", " Spring Showdown ");
  formData.set("date", "2026-04-12");
  formData.set("isMajor", "true");
  formData.set("notes", " Bring towels ");

  const result = await action({}, formData);

  assert.equal(requireAdminCalls, 1);
  assert.equal(createDraftCalls.length, 1);
  assert.deepEqual(createDraftCalls[0].input, {
    slug: "  SPRING-SHOWDOWN ",
    name: " Spring Showdown ",
    date: "2026-04-12",
    isMajor: "true",
    notes: " Bring towels ",
  });
  assert.equal(typeof createDraftCalls[0].findEventBySlug, "function");
  assert.equal(typeof createDraftCalls[0].insertEventDraft, "function");
  assert.equal(result, undefined);
});

test("draftEventAction default persistence path creates and dedupes drafts", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  eventDraftStore.resetEventDraftStore();
  const redirects = [];

  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
    redirectTo: (url) => {
      redirects.push(url);
    },
  });

  const firstFormData = new FormData();
  firstFormData.set("slug", "winter-blast");
  firstFormData.set("name", "Spring Showdown");
  firstFormData.set("date", "2026-04-12");
  firstFormData.set("isMajor", "false");
  firstFormData.set("notes", "Bring water");

  const created = await action({}, firstFormData);
  assert.equal(created, undefined);

  const duplicate = await action({}, firstFormData);
  assert.deepEqual(duplicate, undefined);
  assert.deepEqual(redirects, [
    "/admin/events/new?created=1",
    "/admin/events/new?error_slug=Slug+is+already+in+use",
  ]);
});

test("draftEventAction redirects to created flag on successful create", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
    createDraft: async () => ({ id: "evt_123", status: "draft" }),
    redirectTo: (url) => {
      redirects.push(url);
    },
  });

  const formData = new FormData();
  formData.set("slug", "spring-showdown");
  formData.set("name", "Spring Showdown");
  formData.set("date", "2026-04-12");
  formData.set("isMajor", "false");
  formData.set("notes", "");

  const result = await action({}, formData);

  assert.deepEqual(redirects, ["/admin/events/new?created=1"]);
  assert.equal(result, undefined);
});

test("draftEventAction prevents slug collisions from non-draft events", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  let insertCalls = 0;
  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
    findEventBySlugAdapter: async () => null,
    findNonDraftEventBySlugAdapter: async (slug) =>
      slug === "spring-showdown" ? { id: "evt_confirmed_1", slug } : null,
    insertEventDraftAdapter: async () => {
      insertCalls += 1;
      return { id: "evt_draft_1" };
    },
    redirectTo: (url) => {
      redirects.push(url);
    },
  });

  const formData = new FormData();
  formData.set("slug", "spring-showdown");
  formData.set("name", "Spring Showdown");
  formData.set("date", "2026-04-12");
  formData.set("isMajor", "false");
  formData.set("notes", "");

  const result = await action({}, formData);

  assert.equal(result, undefined);
  assert.equal(insertCalls, 0);
  assert.deepEqual(redirects, ["/admin/events/new?error_slug=Slug+is+already+in+use"]);
});

test("draftEventAction default path blocks slug collisions with public events", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  eventDraftStore.resetEventDraftStore();
  const redirects = [];
  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
    redirectTo: (url) => {
      redirects.push(url);
    },
  });

  const formData = new FormData();
  formData.set("slug", "spring-showdown");
  formData.set("name", "Spring Showdown");
  formData.set("date", "2026-04-12");
  formData.set("isMajor", "false");
  formData.set("notes", "");

  const result = await action({}, formData);

  assert.equal(result, undefined);
  assert.deepEqual(redirects, ["/admin/events/new?error_slug=Slug+is+already+in+use"]);
});

test("draftEventAction returns fieldErrors without redirect", async () => {
  const { createAdminDraftEventAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createAdminDraftEventAction({
    requireAdminAccess: () => {},
    createDraft: async () => ({
      fieldErrors: {
        date: "Date is invalid",
      },
    }),
    redirectTo: (url) => {
      redirects.push(url);
    },
  });

  const formData = new FormData();
  formData.set("slug", "spring-showdown");
  formData.set("name", "Spring Showdown");
  formData.set("date", "not-a-date");
  formData.set("isMajor", "false");
  formData.set("notes", "");

  const result = await action({}, formData);

  assert.deepEqual(redirects, ["/admin/events/new?error_date=Date+is+invalid"]);
  assert.equal(result, undefined);
});

test("renderAdminDraftEventForm renders contract fields and field errors", async () => {
  const module = await import("../app/admin/events/new/page.js");
  const html = renderToStaticMarkup(
    module.renderAdminDraftEventForm({
      action: async () => {},
      fieldErrors: {
        name: "Name is required",
        slug: "Slug is required",
        date: "Date is invalid",
        notes: "Notes are too long",
      },
    })
  );

  assert.match(html, /name="name"/);
  assert.match(html, /name="slug"/);
  assert.match(html, /name="date"/);
  assert.match(html, /name="isMajor"/);
  assert.match(html, /name="notes"/);
  assert.match(html, /Name is required/);
  assert.match(html, /Slug is required/);
  assert.match(html, /Date is invalid/);
  assert.match(html, /Notes are too long/);
});

test("fetchUdiscPreviewAction enforces auth and redirects with encoded preview", async () => {
  const { createFetchUdiscPreviewAction } = await import("../app/admin/events/new/page.js");
  const redirects = [];
  let requireAdminCalls = 0;
  const action = createFetchUdiscPreviewAction({
    requireAdminAccess: () => {
      requireAdminCalls += 1;
    },
    fetchUdiscEventAdapter: async () => ({ name: "Spring Showdown", startDate: "2026-04-12", participants: [] }),
    mapUdiscEventToDraftPreviewAdapter: () => ({ ok: true, preview: { event: { name: "Spring Showdown" }, participants: [] } }),
    redirectTo: (url) => redirects.push(url),
    token: "token",
  });

  const formData = new FormData();
  formData.set("udiscEventId", "evt_1");
  await action({}, formData);

  assert.equal(requireAdminCalls, 1);
  assert.equal(redirects.length, 1);
  assert.match(redirects[0], /udisc_preview=/);
});

test("fetchUdiscPreviewAction maps client errors to safe messages", async () => {
  const { createFetchUdiscPreviewAction } = await import("../app/admin/events/new/page.js");
  const redirects = [];
  const action = createFetchUdiscPreviewAction({
    requireAdminAccess: () => {},
    fetchUdiscEventAdapter: async () => {
      const error = new Error("x");
      error.type = "NOT_FOUND";
      throw error;
    },
    mapUdiscEventToDraftPreviewAdapter: () => ({ ok: true, preview: {} }),
    redirectTo: (url) => redirects.push(url),
    token: "token",
  });

  const formData = new FormData();
  formData.set("udiscEventId", "evt_1");
  await action({}, formData);

  assert.equal(redirects[0], "/admin/events/new?udisc_error=UDisc+event+not+found.");
});
