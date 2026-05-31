const test = require("node:test");
const assert = require("node:assert/strict");

const { createEventDraft } = require("../lib/createEventDraft");

function buildValidInput(overrides = {}) {
  return {
    slug: "spring-showdown",
    name: "Spring Showdown",
    eventDate: "2026-04-12",
    ...overrides,
  };
}

test("rejects missing required fields with Validation failed", async () => {
  await assert.rejects(
    () =>
      createEventDraft({
        input: buildValidInput({ slug: "" }),
        findEventBySlug: async () => null,
        insertEventDraft: async () => {
          throw new Error("should not insert");
        },
      }),
    /Validation failed/
  );
});

test("rejects invalid slug format", async () => {
  await assert.rejects(
    () =>
      createEventDraft({
        input: buildValidInput({ slug: "Bad Slug!" }),
        findEventBySlug: async () => null,
        insertEventDraft: async () => {
          throw new Error("should not insert");
        },
      }),
    /Validation failed/
  );
});

test("rejects duplicate slug", async () => {
  await assert.rejects(
    () =>
      createEventDraft({
        input: buildValidInput(),
        findEventBySlug: async () => ({ id: "evt_existing" }),
        insertEventDraft: async () => {
          throw new Error("should not insert");
        },
      }),
    /Validation failed/
  );
});

test("creates draft with normalized shape and status draft", async () => {
  let insertedPayload = null;

  const result = await createEventDraft({
    input: buildValidInput({
      slug: "  SPRING-SHOWDOWN  ",
      name: "  Spring Showdown  ",
      eventDate: " 2026-04-12 ",
    }),
    findEventBySlug: async () => null,
    insertEventDraft: async (payload) => {
      insertedPayload = payload;
      return { id: "evt_123", ...payload };
    },
  });

  assert.deepEqual(insertedPayload, {
    slug: "spring-showdown",
    name: "Spring Showdown",
    eventDate: "2026-04-12",
    status: "draft",
  });

  assert.deepEqual(result, {
    id: "evt_123",
    slug: "spring-showdown",
    name: "Spring Showdown",
    eventDate: "2026-04-12",
    status: "draft",
  });
});
