# Scorecard Scraping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace UDisc API-based draft preview import with URL-driven leaderboard page scraping and keep admin draft preview flow working with typed error handling.

**Architecture:** Move UDisc integration to a single server-side HTML scraping boundary in `lib/udiscClient.js`, keep `lib/udiscToDraftPreview.js` as the app-owned normalization boundary, and update admin action/form wiring to accept `udiscUrl` input instead of `udiscEventId`. Add fixture-style parser tests and action tests to lock behavior.

**Tech Stack:** Next.js server actions, Node test runner (`node:test`), strict asserts, native `fetch`.

---

### Task 1: Replace UDisc client contract with URL validation + typed HTTP/network mapping

**Files:**
- Modify: `lib/udiscClient.js`
- Modify: `tests/udiscClient.test.js`

- [ ] **Step 1: Write failing tests for URL validation and error mapping**

```js
test("fetchUdiscEventFromUrl rejects invalid URL host/path", async () => {
  await assert.rejects(fetchUdiscEventFromUrl({ leaderboardUrl: "https://example.com/x" }), (e) => e.type === "VALIDATION_ERROR");
  await assert.rejects(fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/foo" }), (e) => e.type === "VALIDATION_ERROR");
});

test("fetchUdiscEventFromUrl maps HTTP statuses and network errors", async () => {
  for (const [status, type] of [[404, "NOT_FOUND"], [429, "RATE_LIMITED"], [500, "UPSTREAM_ERROR"]]) {
    await assert.rejects(
      fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/x/leaderboard", fetchImpl: async () => ({ ok: false, status }) }),
      (e) => e.type === type
    );
  }
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/x/leaderboard", fetchImpl: async () => { throw new Error("boom"); } }),
    (e) => e.type === "NETWORK_ERROR"
  );
});
```

- [ ] **Step 2: Run targeted tests and verify fail**

Run: `npm test -- tests/udiscClient.test.js`
Expected: FAIL because `fetchUdiscEventFromUrl` does not exist yet.

- [ ] **Step 3: Implement minimal URL-based client with typed errors**

```js
function fetchUdiscEventFromUrl({ leaderboardUrl, fetchImpl = fetch }) {
  // validate URL host/path
  // fetch HTML
  // map HTTP/network errors only (parsing comes next task)
}
```

Implementation details:
- Delete token/event-id requirements.
- Validate URL with `new URL(...)`, check host `udisc.com`/`www.udisc.com` and `/events/.../leaderboard` path.
- Return raw HTML string (or temporary object containing HTML) for now so tests can pass incrementally.

- [ ] **Step 4: Run targeted tests and verify pass**

Run: `npm test -- tests/udiscClient.test.js`
Expected: PASS for new validation + HTTP/network mapping tests.

- [ ] **Step 5: Commit**

```bash
git add lib/udiscClient.js tests/udiscClient.test.js
git commit -m "refactor: switch udisc client to URL validation and typed fetch errors"
```

### Task 2: Implement HTML parsing pipeline with structured-first/fallback extraction

**Files:**
- Modify: `lib/udiscClient.js`
- Modify: `tests/udiscClient.test.js`

- [ ] **Step 1: Write failing parser tests for structured, fallback, and format-changed cases**

```js
test("fetchUdiscEventFromUrl parses structured embedded payload", async () => {
  const html = `...fixture containing structured script payload...`;
  const result = await fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/e/leaderboard?round=1&view=scores", fetchImpl: async () => ({ ok: true, text: async () => html }) });
  assert.equal(result.name, "Spring Showdown");
  assert.equal(Array.isArray(result.participants), true);
});

test("fetchUdiscEventFromUrl uses fallback extraction when structured payload missing", async () => {
  const html = `...fixture with fallback markers only...`;
  const result = await fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/e/leaderboard", fetchImpl: async () => ({ ok: true, text: async () => html }) });
  assert.equal(result.participants[0].finishPlace, 1);
});

test("fetchUdiscEventFromUrl throws UPSTREAM_FORMAT_CHANGED when page is unparseable", async () => {
  await assert.rejects(
    fetchUdiscEventFromUrl({ leaderboardUrl: "https://udisc.com/events/e/leaderboard", fetchImpl: async () => ({ ok: true, text: async () => "<html></html>" }) }),
    (e) => e.type === "UPSTREAM_FORMAT_CHANGED"
  );
});
```

- [ ] **Step 2: Run parser tests and verify fail**

Run: `npm test -- tests/udiscClient.test.js`
Expected: FAIL because parser behavior is not implemented.

- [ ] **Step 3: Implement parser and normalization rules in client**

```js
// add helpers:
// - extractStructuredPayload(html)
// - extractFallbackPayload(html)
// - normalizeParticipants(rows)
// - assertMinimumPayload(payload)
```

Implementation details:
- Structured-first extraction (script JSON/JSON-LD).
- Fallback extraction path.
- Participant normalization to `{ playerName, externalPlayerId, finishPlace }`.
- Deduplicate by `externalPlayerId` then normalized name.
- Contradictory duplicate placements => `UPSTREAM_FORMAT_CHANGED`.
- Missing event name/date/participants => `UPSTREAM_FORMAT_CHANGED`.

- [ ] **Step 4: Run parser tests and verify pass**

Run: `npm test -- tests/udiscClient.test.js`
Expected: PASS for structured/fallback/error parser coverage.

- [ ] **Step 5: Commit**

```bash
git add lib/udiscClient.js tests/udiscClient.test.js
git commit -m "feat: parse udisc leaderboard html into draft preview source payload"
```

### Task 3: Rewire admin fetch action + UI input from event ID to URL

**Files:**
- Modify: `app/admin/events/new/page.js`
- Modify: `tests/adminNewEventPage.test.js`

- [ ] **Step 1: Write failing tests for `udiscUrl` contract and new error mapping**

```js
test("fetchUdiscPreviewAction reads udiscUrl and redirects with encoded preview", async () => {
  const formData = new FormData();
  formData.set("udiscUrl", "https://udisc.com/events/x/leaderboard?round=1&view=scores");
  // assert redirect contains udisc_preview
});

test("fetchUdiscPreviewAction maps format-changed errors to user-safe message", async () => {
  // adapter throws error.type = "UPSTREAM_FORMAT_CHANGED"
  // assert redirect contains udisc_error=<expected message>
});
```

- [ ] **Step 2: Run targeted tests and verify fail**

Run: `npm test -- tests/adminNewEventPage.test.js`
Expected: FAIL because action still reads `udiscEventId` and old message table.

- [ ] **Step 3: Implement action + form rewiring**

```js
// page.js
const udiscUrl = String(formData.get("udiscUrl") || "").trim();
const raw = await fetchUdiscEventAdapter({ leaderboardUrl: udiscUrl });

createElement("label", { htmlFor: "udiscUrl" }, "UDisc Leaderboard URL")
createElement("input", { id: "udiscUrl", name: "udiscUrl", type: "url", required: true })
```

Implementation details:
- Remove token dependency from `createFetchUdiscPreviewAction` signature.
- Extend `messageForUdiscError` with `VALIDATION_ERROR` and `UPSTREAM_FORMAT_CHANGED` friendly messages.
- Preserve redirect query contract (`udisc_preview`, `udisc_error`).

- [ ] **Step 4: Run targeted tests and verify pass**

Run: `npm test -- tests/adminNewEventPage.test.js`
Expected: PASS with updated input contract and error mapping.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/new/page.js tests/adminNewEventPage.test.js
git commit -m "feat: switch admin udisc preview import input from event id to url"
```

### Task 4: Regression pass for mapper + focused suite verification

**Files:**
- Modify (if needed): `tests/udiscToDraftPreview.test.js`
- Verify: `tests/udiscClient.test.js`
- Verify: `tests/adminNewEventPage.test.js`

- [ ] **Step 1: Add mapper compatibility test only if parser introduced new raw keys**

```js
test("mapUdiscEventToDraftPreview accepts scraper-normalized keys", () => {
  const result = mapUdiscEventToDraftPreview({
    name: "Spring Showdown",
    date: "2026-04-12",
    participants: [{ playerName: "Alice", externalPlayerId: "p1", finishPlace: 1 }],
  });
  assert.equal(result.ok, true);
});
```

- [ ] **Step 2: Run mapper test and verify expected result**

Run: `npm test -- tests/udiscToDraftPreview.test.js`
Expected: PASS.

- [ ] **Step 3: Run full targeted suite for this feature**

Run: `npm test -- tests/udiscClient.test.js tests/adminNewEventPage.test.js tests/udiscToDraftPreview.test.js`
Expected: PASS, no warnings/errors.

- [ ] **Step 4: Commit final verification/cleanup changes**

```bash
git add tests/udiscToDraftPreview.test.js
git commit -m "test: lock scraper payload compatibility with draft preview mapper"
```

(If no mapper test changes were needed, skip file add and do not create an empty commit.)

## Spec Coverage Checklist

- URL input replaces event-id/token flow: Task 1 + Task 3.
- UDisc page scraping with structured-first/fallback parser: Task 2.
- Typed error taxonomy and admin-safe messaging: Task 1 + Task 3.
- Deterministic participant handling and fail-closed parsing: Task 2.
- Automated test coverage across client and admin action: Tasks 1-4.
