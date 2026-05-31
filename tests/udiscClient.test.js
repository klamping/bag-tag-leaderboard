const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchUdiscEventFromUrl } = require("../lib/udiscClient.js");

test("fetchUdiscEventFromUrl throws VALIDATION_ERROR for invalid host", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "https://example.com/events/demo/leaderboard" }),
    (error) => error.type === "VALIDATION_ERROR"
  );
});

test("fetchUdiscEventFromUrl throws VALIDATION_ERROR for invalid path", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/demo/results" }),
    (error) => error.type === "VALIDATION_ERROR"
  );
});

test("fetchUdiscEventFromUrl maps response statuses to typed errors", async () => {
  for (const [status, type] of [[404, "NOT_FOUND"], [429, "RATE_LIMITED"], [500, "UPSTREAM_ERROR"], [418, "UPSTREAM_ERROR"]]) {
    await assert.rejects(
      fetchUdiscEventFromUrl({
        leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
        fetchImpl: async () => ({ ok: false, status }),
      }),
      (error) => error.type === type
    );
  }
});

test("fetchUdiscEventFromUrl maps fetch exceptions to NETWORK_ERROR", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({
      leaderboardUrl: "https://www.udisc.com/events/demo/leaderboard",
      fetchImpl: async () => {
        throw new Error("boom");
      },
    }),
    (error) => error.type === "NETWORK_ERROR"
  );
});

test("fetchUdiscEventFromUrl returns html payload on success", async () => {
  const result = await fetchUdiscEventFromUrl({
    leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
    fetchImpl: async () => ({ ok: true, text: async () => "<html>scorecard</html>" }),
  });

  assert.deepEqual(result, { html: "<html>scorecard</html>" });
});
