const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchUdiscEvent } = require("../lib/udiscClient.js");

test("fetchUdiscEvent returns json on success", async () => {
  const result = await fetchUdiscEvent({
    eventId: "abc",
    token: "t",
    fetchImpl: async () => ({ ok: true, json: async () => ({ id: "abc" }) }),
  });
  assert.deepEqual(result, { id: "abc" });
});

test("fetchUdiscEvent maps status categories", async () => {
  for (const [status, type] of [[401, "AUTH_ERROR"], [403, "AUTH_ERROR"], [404, "NOT_FOUND"], [429, "RATE_LIMITED"], [500, "UPSTREAM_ERROR"]]) {
    await assert.rejects(
      fetchUdiscEvent({ eventId: "abc", token: "t", fetchImpl: async () => ({ ok: false, status }) }),
      (error) => error.type === type
    );
  }
});

test("fetchUdiscEvent handles missing token and network errors", async () => {
  await assert.rejects(fetchUdiscEvent({ eventId: "abc", token: "" }), (error) => error.type === "CONFIG_ERROR");
  await assert.rejects(
    fetchUdiscEvent({ eventId: "abc", token: "t", fetchImpl: async () => { throw new Error("boom"); } }),
    (error) => error.type === "NETWORK_ERROR"
  );
});
