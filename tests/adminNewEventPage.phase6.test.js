const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");
const fs = require("node:fs/promises");

function buildPreview(overrides = {}) {
  return {
    event: {
      name: "Spring Showdown",
      slug: "spring-showdown-2",
      date: "2026-04-12",
      isMajor: false,
      notes: "",
      ...overrides.event,
    },
    participants: overrides.participants || [
      {
        playerName: "Alice Smith",
        externalPlayerId: "u1",
        finishPlace: 1,
        matchStatus: "matched",
        matchedPlayerId: "player_0001",
        matchedPlayerName: "Alice Smith",
        startingTag: 8,
      },
      {
        playerName: "Guest Player",
        externalPlayerId: "u2",
        finishPlace: 2,
        matchStatus: "unmatched",
      },
    ],
  };
}

test("createConfirmUdiscImportAction redirects malformed payloads with confirm error", async () => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set("previewPayload", "not json");

  await action({}, formData);

  assert.deepEqual(redirects, [
    "/admin/events/new?confirm_error=Imported+preview+is+invalid.",
  ]);
});

test("createConfirmUdiscImportAction preserves preview and field errors when confirm fails", async () => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");

  const preview = buildPreview();
  const updatedPreview = {
    ...preview,
    event: {
      ...preview.event,
      slug: "spring-showdown-3",
    },
  };
  const redirects = [];
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    confirmImportedEventAdapter: async ({ preview: receivedPreview }) => {
      assert.deepEqual(receivedPreview, updatedPreview);
      return {
        ok: false,
        fieldErrors: {
          slug: "Slug is already in use",
          participants_0_startingTag: "Starting tags must be unique",
        },
      };
    },
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set("previewPayload", JSON.stringify(preview));
  formData.set("slug", "spring-showdown-3");

  await action({}, formData);

  assert.equal(redirects.length, 1);
  const location = new URL(redirects[0], "https://example.test");
  assert.equal(location.pathname, "/admin/events/new");
  assert.equal(location.searchParams.get("preview_valid"), "1");
  assert.deepEqual(JSON.parse(location.searchParams.get("udisc_preview")), updatedPreview);
  assert.deepEqual(JSON.parse(location.searchParams.get("review_errors")), {
    slug: "Slug is already in use",
    participants_0_startingTag: "Starting tags must be unique",
  });
});

test("createConfirmUdiscImportAction default path confirms import and redirects with slug", async (t) => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");
  const eventsData = await import("../lib/eventsData.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  t.after(() => {
    eventsData.resetEventsData();
    eventDraftStore.resetEventDraftStore();
  });

  eventsData.resetEventsData({
    players: [{ id: "player_0001", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  eventDraftStore.resetEventDraftStore();

  const redirects = [];
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    redirectTo: (url) => redirects.push(url),
  });

  const preview = buildPreview();
  const formData = new FormData();
  formData.set("previewPayload", JSON.stringify(preview));

  await action({}, formData);

  assert.deepEqual(redirects, [
    "/admin/events/new?confirmed=1&confirmed_slug=spring-showdown-2",
  ]);

  const persisted = eventsData.getEventsData();
  assert.equal(persisted.events.length, 1);
  assert.equal(persisted.events[0].slug, "spring-showdown-2");
  assert.equal(persisted.players.length, 2);
  assert.equal(persisted.eventResults.length, 2);
  assert.equal(persisted.eventPoints.length, 2);
});

test("createConfirmUdiscImportAction default path rolls back partial writes when point insert fails", async (t) => {
  const { createConfirmUdiscImportAction } = await import("../app/admin/events/new/page.js");
  const eventsData = await import("../lib/eventsData.js");
  const eventDraftStore = await import("../lib/eventDraftStore.js");

  t.after(() => {
    eventsData.resetEventsData();
    eventDraftStore.resetEventDraftStore();
  });

  eventsData.resetEventsData({
    players: [{ id: "player_0001", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
  eventDraftStore.resetEventDraftStore();

  let insertAttempts = 0;
  const action = createConfirmUdiscImportAction({
    requireAdminAccess: () => {},
    insertEventPointsAdapter: async (rows) => {
      insertAttempts += 1;
      if (insertAttempts === 1) {
        return eventsData.insertEventPoints(rows);
      }

      throw new Error("point insert failed");
    },
    redirectTo: () => {
      throw new Error("redirect should not be reached");
    },
  });

  const formData = new FormData();
  formData.set("previewPayload", JSON.stringify(buildPreview()));

  await assert.rejects(() => action({}, formData), /point insert failed/);

  assert.deepEqual(eventsData.getEventsData(), {
    players: [{ id: "player_0001", name: "Alice Smith" }],
    events: [],
    eventResults: [],
    eventPoints: [],
  });
});

test("renderUdiscPreviewSection renders confirm affordance only for valid previews", async () => {
  const { renderUdiscPreviewSection } = await import("../app/admin/events/new/page.js");

  const validHtml = renderToStaticMarkup(
    renderUdiscPreviewSection({
      preview: buildPreview(),
      previewValid: true,
      reviewErrors: {
        slug: "Slug is already in use",
      },
      action: async () => {},
      confirmAction: async () => {},
    })
  );

  assert.match(validHtml, /Review Imported Players/);
  assert.match(validHtml, /Confirm Import/);
  assert.match(validHtml, /name="slug"/);
  assert.match(validHtml, /value="spring-showdown-2"/);
  assert.match(validHtml, /Slug is already in use/);
  assert.equal((validHtml.match(/name="previewPayload"/g) || []).length, 2);

  const invalidHtml = renderToStaticMarkup(
    renderUdiscPreviewSection({
      preview: buildPreview(),
      previewValid: false,
      action: async () => {},
      confirmAction: async () => {},
    })
  );

  assert.match(invalidHtml, /Review Imported Players/);
  assert.doesNotMatch(invalidHtml, /Confirm Import/);
  assert.equal((invalidHtml.match(/name="previewPayload"/g) || []).length, 1);
});

test("AdminNewEventPage source threads confirm query state", async () => {
  const source = await fs.readFile("app/admin/events/new/page.js", "utf8");

  assert.match(source, /preview_valid/);
  assert.match(source, /confirmed_slug/);
  assert.match(source, /confirmed/);
  assert.match(source, /Confirm Import/);
});
