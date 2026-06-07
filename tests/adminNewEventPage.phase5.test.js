const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

function decodePreviewFromRedirect(url) {
  const location = new URL(url, "https://example.test");
  return JSON.parse(location.searchParams.get("udisc_preview"));
}

test("renderUdiscPreviewSection renders preview summary and participant review rows", async () => {
  const { renderUdiscPreviewSection } = await import("../app/admin/events/new/page.js");
  const html = renderToStaticMarkup(
    renderUdiscPreviewSection({
      preview: {
        event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
        participants: [
          {
            playerName: "Alice Smith",
            externalPlayerId: "u1",
            finishPlace: 1,
            matchStatus: "matched",
            matchedPlayerId: "player_1",
            matchedPlayerName: "Alice Smith",
          },
          {
            playerName: "New Person",
            externalPlayerId: "u2",
            finishPlace: 2,
            matchStatus: "unmatched",
          },
        ],
      },
    })
  );

  assert.match(html, /Preview Event/);
  assert.match(html, /Spring Showdown/);
  assert.match(html, /Participant Review/);
  assert.match(html, /Matched player: Alice Smith/);
  assert.match(html, /name="participants_0_startingTag"/);
  assert.match(html, /<input[^>]*name="participants_0_startingTag"[^>]*required=""/);
  assert.match(html, /New player/);
  assert.doesNotMatch(html, /name="participants_1_startingTag"/);
});

test("renderUdiscPreviewSection renders row-level participant review validation errors", async () => {
  const { renderUdiscPreviewSection } = await import("../app/admin/events/new/page.js");
  const html = renderToStaticMarkup(
    renderUdiscPreviewSection({
      preview: {
        event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
        participants: [
          {
            playerName: "Alice Smith",
            externalPlayerId: "u1",
            finishPlace: 1,
            matchStatus: "matched",
            matchedPlayerId: "player_1",
            matchedPlayerName: "Alice Smith",
            startingTag: "",
          },
        ],
      },
      reviewErrors: {
        participants_0_startingTag: "Starting tag is required",
      },
    })
  );

  assert.match(html, /Starting tag is required/);
  assert.match(html, /data-field-error="participants_0_startingTag"/);
});

test("reviewUdiscPreviewAction validates matched rows and carries enriched preview forward", async () => {
  const { createReviewUdiscPreviewAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createReviewUdiscPreviewAction({
    requireAdminAccess: () => {},
    getKnownPlayers: () => [
      { id: "player_1", name: "Alice Smith" },
      { id: "player_2", name: "Bob Jones" },
    ],
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set(
    "previewPayload",
    JSON.stringify({
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
      participants: [
        { playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1 },
        { playerName: "Guest", externalPlayerId: "u2", finishPlace: 2 },
      ],
    })
  );
  formData.set("participants_0_startingTag", "8");

  await action(formData);

  assert.equal(redirects.length, 1);
  assert.match(redirects[0], /preview_valid=1/);

  const preview = decodePreviewFromRedirect(redirects[0]);
  assert.deepEqual(preview.participants, [
    {
      playerName: "Alice Smith",
      externalPlayerId: "u1",
      finishPlace: 1,
      matchStatus: "matched",
      matchedPlayerId: "player_1",
      matchedPlayerName: "Alice Smith",
      startingTag: 8,
    },
    {
      playerName: "Guest",
      externalPlayerId: "u2",
      finishPlace: 2,
      matchStatus: "unmatched",
    },
  ]);
});

test("reviewUdiscPreviewAction redirects with row-level validation errors when tags are invalid", async () => {
  const { createReviewUdiscPreviewAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createReviewUdiscPreviewAction({
    requireAdminAccess: () => {},
    getKnownPlayers: () => [{ id: "player_1", name: "Alice Smith" }],
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set(
    "previewPayload",
    JSON.stringify({
      event: { name: "Spring Showdown", slug: "spring-showdown", date: "2026-04-12" },
      participants: [{ playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1 }],
    })
  );

  await action(formData);

  assert.equal(redirects.length, 1);
  assert.doesNotMatch(redirects[0], /preview_valid=1/);

  const location = new URL(redirects[0], "https://example.test");
  const errors = JSON.parse(location.searchParams.get("review_errors"));
  assert.equal(errors.participants_0_startingTag, "Starting tag is required");

  const preview = decodePreviewFromRedirect(redirects[0]);
  assert.equal(preview.participants[0].matchStatus, "matched");
});

test("fetchUdiscPreviewAction enriches fetched preview with initial match classifications", async () => {
  const { createFetchUdiscPreviewAction } = await import("../app/admin/events/new/page.js");

  const redirects = [];
  const action = createFetchUdiscPreviewAction({
    requireAdminAccess: () => {},
    fetchUdiscEventAdapter: async () => ({
      name: "Spring Showdown",
      startDate: "2026-04-12",
      participants: [
        { name: "Alice Smith", id: "u1", place: 1 },
        { name: "New Person", id: "u2", place: 2 },
      ],
    }),
    mapUdiscEventToDraftPreviewAdapter: (raw) => ({
      ok: true,
      preview: {
        event: { name: raw.name, slug: "spring-showdown", date: "2026-04-12" },
        participants: [
          { playerName: "Alice Smith", externalPlayerId: "u1", finishPlace: 1 },
          { playerName: "New Person", externalPlayerId: "u2", finishPlace: 2 },
        ],
      },
    }),
    getKnownPlayers: () => [{ id: "player_1", name: "Alice Smith" }],
    redirectTo: (url) => redirects.push(url),
  });

  const formData = new FormData();
  formData.set("udiscUrl", "https://udisc.com/events/spring-showdown");
  await action(formData);

  const preview = decodePreviewFromRedirect(redirects[0]);
  assert.deepEqual(preview.participants, [
    {
      playerName: "Alice Smith",
      externalPlayerId: "u1",
      finishPlace: 1,
      matchStatus: "matched",
      matchedPlayerId: "player_1",
      matchedPlayerName: "Alice Smith",
      startingTag: "",
    },
    {
      playerName: "New Person",
      externalPlayerId: "u2",
      finishPlace: 2,
      matchStatus: "unmatched",
    },
  ]);
});
