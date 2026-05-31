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

test("fetchUdiscEventFromUrl throws VALIDATION_ERROR for empty or malformed urls", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "" }),
    (error) => error.type === "VALIDATION_ERROR"
  );

  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "not-a-url" }),
    (error) => error.type === "VALIDATION_ERROR"
  );
});

test("fetchUdiscEventFromUrl accepts www host and trailing slash", async () => {
  const result = await fetchUdiscEventFromUrl({
    leaderboardUrl: "https://www.udisc.com/events/demo/leaderboard/",
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"name":"Spring Open","startDate":"2026-05-01","url":"https://udisc.com/events/spring-open/leaderboard","competitor":[{"name":"A Player","identifier":"1","position":1}]}</script>',
    }),
  });

  assert.deepEqual(result, {
    name: "Spring Open",
    date: "2026-05-01",
    slug: "spring-open",
    participants: [{ playerName: "A Player", externalPlayerId: "1", finishPlace: 1 }],
  });
});

test("fetchUdiscEventFromUrl rejects non-https protocol", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "http://udisc.com/events/demo/leaderboard" }),
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

test("fetchUdiscEventFromUrl does not passthrough unknown typed errors", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({
      leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
      fetchImpl: async () => {
        const error = new Error("custom");
        error.type = "SOME_OTHER_ERROR";
        throw error;
      },
    }),
    (error) => error.type === "NETWORK_ERROR"
  );
});

test("fetchUdiscEventFromUrl parses structured payload from JSON-LD script", async () => {
  const result = await fetchUdiscEventFromUrl({
    leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        '<html><head><script type="application/ld+json">{"name":"Championship","startDate":"2026-04-20T09:00:00Z","url":"https://udisc.com/events/championship/leaderboard","description":"UDisc Major event","competitor":[{"name":"Jane Doe","identifier":"p-123","position":"2"},{"name":"John Roe","identifier":"p-999","position":1}]}</script></head></html>',
    }),
  });

  assert.deepEqual(result, {
    name: "Championship",
    date: "2026-04-20",
    slug: "championship",
    isMajor: true,
    participants: [
      { playerName: "Jane Doe", externalPlayerId: "p-123", finishPlace: 2 },
      { playerName: "John Roe", externalPlayerId: "p-999", finishPlace: 1 },
    ],
  });
});

test("fetchUdiscEventFromUrl falls back to html extraction when structured data absent", async () => {
  const result = await fetchUdiscEventFromUrl({
    leaderboardUrl: "https://udisc.com/events/fallback-event/leaderboard",
    fetchImpl: async () => ({
      ok: true,
      text: async () =>
        '<html><h1>Fallback Event</h1><time datetime="2026-05-22">May 22</time><a href="/events/fallback-event/leaderboard">Leaderboard</a><table><tr data-player-id="abc"><td class="place">1</td><td class="name">Alice Smith</td></tr><tr><td class="place">2</td><td class="name">Bob Jones</td></tr></table></html>',
    }),
  });

  assert.deepEqual(result, {
    name: "Fallback Event",
    date: "2026-05-22",
    slug: "fallback-event",
    participants: [
      { playerName: "Alice Smith", externalPlayerId: "abc", finishPlace: 1 },
      { playerName: "Bob Jones", finishPlace: 2 },
    ],
  });
});

test("fetchUdiscEventFromUrl throws UPSTREAM_FORMAT_CHANGED for unparseable success page", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({
      leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
      fetchImpl: async () => ({ ok: true, text: async () => "<html><body>nothing useful</body></html>" }),
    }),
    (error) => error.type === "UPSTREAM_FORMAT_CHANGED"
  );
});

test("fetchUdiscEventFromUrl throws UPSTREAM_FORMAT_CHANGED for contradictory duplicate participants", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({
      leaderboardUrl: "https://udisc.com/events/demo/leaderboard",
      fetchImpl: async () => ({
        ok: true,
        text: async () =>
          '<script type="application/ld+json">{"name":"Conflict Event","startDate":"2026-03-10","competitor":[{"name":"Dup Player","identifier":"dup-1","position":1},{"name":"Dup Player","identifier":"dup-1","position":3}]}</script>',
      }),
    }),
    (error) => error.type === "UPSTREAM_FORMAT_CHANGED"
  );
});
