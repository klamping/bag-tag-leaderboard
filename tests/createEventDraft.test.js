const test = require("node:test");
const assert = require("node:assert/strict");

const { createEventDraft } = require("../lib/createEventDraft");

function buildValidInput(overrides = {}) {
  return {
    slug: "spring-showdown",
    name: "Spring Showdown",
    date: "2026-04-12",
    isMajor: false,
    notes: "",
    ...overrides,
  };
}

test("returns field error when required slug is missing", async () => {
  const result = await createEventDraft({
    input: buildValidInput({ slug: "" }),
    findEventBySlug: async () => null,
    insertEventDraft: async () => {
      throw new Error("should not insert");
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      slug: "Slug is required",
    },
  });
});

test("returns field error for invalid slug format", async () => {
  const result = await createEventDraft({
    input: buildValidInput({ slug: "Bad Slug!" }),
    findEventBySlug: async () => null,
    insertEventDraft: async () => {
      throw new Error("should not insert");
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      slug: "Slug format is invalid",
    },
  });
});

test("returns field error when slug already exists", async () => {
  const result = await createEventDraft({
    input: buildValidInput(),
    findEventBySlug: async () => ({ id: "evt_existing" }),
    insertEventDraft: async () => {
      throw new Error("should not insert");
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      slug: "Slug is already in use",
    },
  });
});

test("creates draft with normalized shape and status draft", async () => {
  let insertedPayload = null;

  const result = await createEventDraft({
    input: buildValidInput({
      slug: "  SPRING-SHOWDOWN  ",
      name: "  Spring Showdown  ",
      date: " 2026-04-12 ",
      isMajor: "true",
      notes: "  Bring towels  ",
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
    date: "2026-04-12",
    isMajor: true,
    notes: "Bring towels",
    status: "draft",
  });

  assert.deepEqual(result, {
    id: "evt_123",
    slug: "spring-showdown",
    name: "Spring Showdown",
    date: "2026-04-12",
    isMajor: true,
    notes: "Bring towels",
    status: "draft",
  });
});

test("returns field error for invalid date", async () => {
  const result = await createEventDraft({
    input: buildValidInput({ date: "not-a-date" }),
    findEventBySlug: async () => null,
    insertEventDraft: async () => {
      throw new Error("should not insert");
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      date: "Date is invalid",
    },
  });
});

test("returns field error for impossible calendar date", async () => {
  const result = await createEventDraft({
    input: buildValidInput({ date: "2026-02-31" }),
    findEventBySlug: async () => null,
    insertEventDraft: async () => {
      throw new Error("should not insert");
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      date: "Date is invalid",
    },
  });
});

test("returns fieldErrors and never writes on validation failure", async () => {
  let lookupCalls = 0;
  let insertCalls = 0;

  const result = await createEventDraft({
    input: buildValidInput({ slug: "" }),
    findEventBySlug: async () => {
      lookupCalls += 1;
      return null;
    },
    insertEventDraft: async () => {
      insertCalls += 1;
      return { id: "evt_should_not_exist" };
    },
  });

  assert.deepEqual(result, {
    fieldErrors: {
      slug: "Slug is required",
    },
  });
  assert.equal(lookupCalls, 0);
  assert.equal(insertCalls, 0);
});
