const test = require("node:test");
const assert = require("node:assert/strict");

const {
  listAdminEvents,
  getAdminEventBySlug,
} = require("../lib/adminEventsQuery");
const {
  insertEventDraft,
  listEventDrafts,
  resetEventDraftStore,
} = require("../lib/eventDraftStore");

test("listAdminEvents normalizes confirmed events and drafts into one admin list", async () => {
  resetEventDraftStore();

  await insertEventDraft({
    slug: "draft-night",
    name: "Draft Night",
    date: "2026-05-01",
    status: "draft",
  });

  const rows = listAdminEvents({
    events: [
      {
        id: "evt_confirmed_0001",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        status: "confirmed",
      },
      {
        id: "evt_hidden_0001",
        slug: "hidden-draft",
        name: "Hidden Draft",
        eventDate: "2026-04-15",
        status: "draft",
      },
    ],
    drafts: await listEventDrafts(),
  });

  assert.deepEqual(rows, [
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
  ]);
});

test("listAdminEvents sorts deterministically by date, slug, and source type", async () => {
  resetEventDraftStore();

  await insertEventDraft({
    slug: "alpha-open",
    name: "Alpha Open Draft",
    date: "2026-05-01",
    status: "draft",
  });

  const rows = listAdminEvents({
    events: [
      {
        id: "evt_confirmed_0002",
        slug: "alpha-open",
        name: "Alpha Open Confirmed",
        eventDate: "2026-05-01",
        status: "confirmed",
      },
      {
        id: "evt_confirmed_0003",
        slug: "beta-bash",
        name: "Beta Bash",
        eventDate: "2026-05-01",
        status: "confirmed",
      },
      {
        id: "evt_confirmed_0004",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        status: "confirmed",
      },
    ],
    drafts: await listEventDrafts(),
  });

  assert.deepEqual(
    rows.map((row) => `${row.date}:${row.slug}:${row.sourceType}`),
    [
      "2026-05-01:alpha-open:draft",
      "2026-05-01:alpha-open:confirmed",
      "2026-05-01:beta-bash:confirmed",
      "2026-04-12:spring-showdown:confirmed",
    ]
  );
});

test("getAdminEventBySlug returns the draft when draft and confirmed slugs collide", async () => {
  resetEventDraftStore();

  await insertEventDraft({
    slug: "spring-showdown",
    name: "Spring Showdown Draft",
    date: "2026-04-19",
    status: "draft",
  });

  const event = getAdminEventBySlug({
    slug: "spring-showdown",
    events: [
      {
        id: "evt_confirmed_0001",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        status: "confirmed",
      },
    ],
    drafts: await listEventDrafts(),
  });

  assert.deepEqual(event, {
    id: "evt_draft_0001",
    slug: "spring-showdown",
    name: "Spring Showdown Draft",
    date: "2026-04-19",
    status: "draft",
    sourceType: "draft",
  });
});

test("getAdminEventBySlug returns null for a missing slug", () => {
  resetEventDraftStore();

  const event = getAdminEventBySlug({
    slug: "missing-slug",
    events: [
      {
        id: "evt_confirmed_0001",
        slug: "spring-showdown",
        name: "Spring Showdown",
        eventDate: "2026-04-12",
        status: "confirmed",
      },
    ],
    drafts: [],
  });

  assert.equal(event, null);
});
