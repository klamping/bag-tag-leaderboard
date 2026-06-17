# Admin Event Index And Edit Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected `/admin/events` index that lists draft and confirmed events together, plus a protected `/admin/events/[slug]/edit` scaffold page and updated admin login redirect.

**Architecture:** Keep the current split storage model intact by adding a small admin read module that normalizes draft and confirmed events into one route-friendly shape. Build two new admin route pages on top of that seam: an index page for listing events and an edit scaffold page that resolves either event type by slug and stops at a placeholder.

**Tech Stack:** Next.js App Router, React `createElement`, Node test runner (`node --test`)

---

## File Structure

- Create: `lib/adminEventsQuery.js`
Purpose: Read confirmed events from `lib/eventsData.js` and drafts from `lib/eventDraftStore.js`, normalize them into a shared admin event shape, sort them, and resolve an event by slug for the edit scaffold.

- Create: `app/admin/events/page.js`
Purpose: Protected admin event index page that renders the unified list and a link to `/admin/events/new`.

- Create: `app/admin/events/[slug]/edit/page.js`
Purpose: Protected scaffold page for future editing that resolves a draft or confirmed event and renders metadata plus a placeholder.

- Modify: `app/admin/login/page.js`
Purpose: Redirect successful admin login to `/admin/events` instead of `/admin/events/new`.

- Create: `tests/adminEventsQuery.test.js`
Purpose: Unit coverage for normalization, sort order, and slug resolution across both stores.

- Create: `tests/adminEventsPage.test.js`
Purpose: Route-level markup coverage for `/admin/events` and `/admin/events/[slug]/edit`.

- Modify: `tests/adminLoginPage.test.js`
Purpose: Update redirect expectation to the new admin landing page.

- Modify: `tests/adminLoginRuntime.test.js`
Purpose: Update runtime redirect expectation to the new admin landing page.

## Task 1: Add Admin Event Query Module

**Files:**
- Create: `tests/adminEventsQuery.test.js`
- Create: `lib/adminEventsQuery.js`
- Test: `tests/adminEventsQuery.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/adminEventsQuery.test.js` with focused unit tests for normalization, sort order, and slug lookup.

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  listAdminEvents,
  getAdminEventBySlug,
} = require("../lib/adminEventsQuery");

test("listAdminEvents normalizes confirmed and draft events into one sorted list", () => {
  const events = listAdminEvents({
    confirmedEvents: [
      {
        id: "evt_confirmed_0001",
        slug: "spring-open",
        name: "Spring Open",
        eventDate: "2026-03-09",
        status: "confirmed",
      },
    ],
    draftEvents: [
      {
        id: "evt_draft_0001",
        slug: "summer-preview",
        name: "Summer Preview",
        date: "2026-06-20",
        status: "draft",
      },
    ],
  });

  assert.deepEqual(events, [
    {
      id: "evt_draft_0001",
      slug: "summer-preview",
      name: "Summer Preview",
      date: "2026-06-20",
      status: "draft",
      sourceType: "draft",
    },
    {
      id: "evt_confirmed_0001",
      slug: "spring-open",
      name: "Spring Open",
      date: "2026-03-09",
      status: "confirmed",
      sourceType: "confirmed",
    },
  ]);
});

test("listAdminEvents uses deterministic sort for matching dates", () => {
  const events = listAdminEvents({
    confirmedEvents: [
      { id: "evt_confirmed_0001", slug: "zeta", name: "Zeta", eventDate: "2026-03-09", status: "confirmed" },
    ],
    draftEvents: [
      { id: "evt_draft_0001", slug: "alpha", name: "Alpha", date: "2026-03-09", status: "draft" },
    ],
  });

  assert.deepEqual(events.map((event) => event.slug), ["alpha", "zeta"]);
});

test("getAdminEventBySlug resolves drafts before confirmed events", () => {
  const event = getAdminEventBySlug({
    slug: "shared-slug",
    draftEvents: [
      { id: "evt_draft_0001", slug: "shared-slug", name: "Draft", date: "2026-05-01", status: "draft" },
    ],
    confirmedEvents: [
      { id: "evt_confirmed_0001", slug: "shared-slug", name: "Confirmed", eventDate: "2026-04-01", status: "confirmed" },
    ],
  });

  assert.deepEqual(event, {
    id: "evt_draft_0001",
    slug: "shared-slug",
    name: "Draft",
    date: "2026-05-01",
    status: "draft",
    sourceType: "draft",
  });
});

test("getAdminEventBySlug returns null when slug is unknown", () => {
  assert.equal(
    getAdminEventBySlug({ slug: "missing", draftEvents: [], confirmedEvents: [] }),
    null
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminEventsQuery.test.js`
Expected: FAIL with module-not-found or missing export errors for `../lib/adminEventsQuery`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/adminEventsQuery.js` with normalization, sort, and slug-resolution helpers.

```js
const eventsDataModule = require("./eventsData.js");
const eventDraftStore = require("./eventDraftStore.js");

const { getEventsData } = eventsDataModule;

function normalizeConfirmedEvent(event) {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: event.eventDate,
    status: "confirmed",
    sourceType: "confirmed",
  };
}

function normalizeDraftEvent(event) {
  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: event.date,
    status: "draft",
    sourceType: "draft",
  };
}

function compareAdminEvents(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.name !== b.name) return a.name.localeCompare(b.name);
  return a.slug.localeCompare(b.slug);
}

function listAdminEvents({
  confirmedEvents = getEventsData().events,
  draftEvents = eventDraftStore.__getDrafts ? eventDraftStore.__getDrafts() : [],
} = {}) {
  return [
    ...draftEvents.map(normalizeDraftEvent),
    ...confirmedEvents.map(normalizeConfirmedEvent),
  ].sort(compareAdminEvents);
}

function getAdminEventBySlug({
  slug,
  confirmedEvents = getEventsData().events,
  draftEvents = eventDraftStore.__getDrafts ? eventDraftStore.__getDrafts() : [],
} = {}) {
  const draftMatch = draftEvents.find((event) => event.slug === slug);
  if (draftMatch) return normalizeDraftEvent(draftMatch);

  const confirmedMatch = confirmedEvents.find((event) => event.slug === slug);
  return confirmedMatch ? normalizeConfirmedEvent(confirmedMatch) : null;
}

module.exports = {
  listAdminEvents,
  getAdminEventBySlug,
};
```

Also extend `lib/eventDraftStore.js` with a read helper for the full draft list:

```js
function listEventDrafts() {
  return drafts.map((draft) => ({ ...draft }));
}

module.exports = {
  findEventBySlug,
  insertEventDraft,
  listEventDrafts,
  resetEventDraftStore,
};
```

Use `listEventDrafts` instead of the placeholder `__getDrafts` name in `adminEventsQuery.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/adminEventsQuery.test.js`
Expected: PASS with `4` tests passing.

- [ ] **Step 5: Commit**

```bash
git add tests/adminEventsQuery.test.js lib/adminEventsQuery.js lib/eventDraftStore.js
git commit -m "feat: add admin event query helpers"
```

## Task 2: Add Admin Event Index Page

**Files:**
- Create: `tests/adminEventsPage.test.js`
- Create: `app/admin/events/page.js`
- Modify: `app/admin/login/page.js`
- Modify: `tests/adminLoginPage.test.js`
- Modify: `tests/adminLoginRuntime.test.js`
- Test: `tests/adminEventsPage.test.js`
- Test: `tests/adminLoginPage.test.js`

- [ ] **Step 1: Write the failing tests**

Create initial `tests/adminEventsPage.test.js` coverage for the new index route.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("/admin/events renders both draft and confirmed events with edit links", async () => {
  const { default: AdminEventsPage } = await import("../app/admin/events/page.js");

  const markup = renderToStaticMarkup(
    AdminEventsPage({
      loadEvents: () => [
        { id: "evt_draft_0001", slug: "summer-preview", name: "Summer Preview", date: "2026-06-20", status: "draft", sourceType: "draft" },
        { id: "evt_confirmed_0001", slug: "spring-open", name: "Spring Open", date: "2026-03-09", status: "confirmed", sourceType: "confirmed" },
      ],
      requireAdminAccess: () => true,
    })
  );

  assert.match(markup, /<h1>Admin Events<\/h1>/);
  assert.match(markup, /Summer Preview/);
  assert.match(markup, /Spring Open/);
  assert.match(markup, /draft/);
  assert.match(markup, /confirmed/);
  assert.match(markup, /href="\/admin\/events\/summer-preview\/edit"/);
  assert.match(markup, /href="\/admin\/events\/spring-open\/edit"/);
  assert.match(markup, /href="\/admin\/events\/new"/);
});

test("/admin/events renders empty state when no events exist", async () => {
  const { default: AdminEventsPage } = await import("../app/admin/events/page.js");

  const markup = renderToStaticMarkup(
    AdminEventsPage({
      loadEvents: () => [],
      requireAdminAccess: () => true,
    })
  );

  assert.match(markup, /No admin events yet\./);
  assert.match(markup, /href="\/admin\/events\/new"/);
});
```

Update login redirect expectations in `tests/adminLoginPage.test.js` and `tests/adminLoginRuntime.test.js`:

```js
assert.equal(redirectedTo, "/admin/events");
assert.equal(submitResponse.headers.get("location"), "/admin/events");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/adminEventsPage.test.js tests/adminLoginPage.test.js tests/adminLoginRuntime.test.js`
Expected: FAIL because `app/admin/events/page.js` does not exist and login still redirects to `/admin/events/new`.

- [ ] **Step 3: Write minimal implementation**

Create `app/admin/events/page.js` and update login redirect.

```js
import { createElement } from "react";
import adminAuth from "../../../lib/adminAuth.js";
import adminEventsQuery from "../../../lib/adminEventsQuery.js";

const { requireAdmin } = adminAuth;
const { listAdminEvents } = adminEventsQuery;

function loadAdminEvents() {
  return listAdminEvents();
}

function renderEventRow(event) {
  return createElement(
    "li",
    { key: event.id },
    createElement("span", null, event.name),
    createElement("span", null, ` ${event.slug}`),
    createElement("span", null, ` ${event.date}`),
    createElement("span", null, ` ${event.status}`),
    createElement("a", { href: `/admin/events/${event.slug}/edit` }, "Edit")
  );
}

export default function AdminEventsPage({
  loadEvents = loadAdminEvents,
  requireAdminAccess = requireAdmin,
} = {}) {
  requireAdminAccess();
  const events = loadEvents();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Admin Events"),
    createElement("a", { href: "/admin/events/new" }, "Create or Import Event"),
    events.length === 0
      ? createElement("p", null, "No admin events yet.")
      : createElement("ul", null, events.map(renderEventRow))
  );
}
```

Update `app/admin/login/page.js`:

```js
redirectTo("/admin/events");
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/adminEventsPage.test.js tests/adminLoginPage.test.js tests/adminLoginRuntime.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/page.js app/admin/login/page.js tests/adminEventsPage.test.js tests/adminLoginPage.test.js tests/adminLoginRuntime.test.js
git commit -m "feat: add admin event index page"
```

## Task 3: Add Edit Scaffold Page

**Files:**
- Modify: `tests/adminEventsPage.test.js`
- Create: `app/admin/events/[slug]/edit/page.js`
- Test: `tests/adminEventsPage.test.js`

- [ ] **Step 1: Write the failing tests**

Expand `tests/adminEventsPage.test.js` with edit scaffold coverage.

```js
test("/admin/events/[slug]/edit renders draft event scaffold", async () => {
  const { default: AdminEditEventPage } = await import("../app/admin/events/[slug]/edit/page.js");

  const markup = renderToStaticMarkup(
    AdminEditEventPage({
      params: { slug: "summer-preview" },
      loadEvent: ({ slug }) => ({
        id: "evt_draft_0001",
        slug,
        name: "Summer Preview",
        date: "2026-06-20",
        status: "draft",
        sourceType: "draft",
      }),
      requireAdminAccess: () => true,
      notFoundHandler: () => {
        throw new Error("should not hit notFound");
      },
    })
  );

  assert.match(markup, /<h1>Edit Event<\/h1>/);
  assert.match(markup, /Summer Preview/);
  assert.match(markup, /draft/);
  assert.match(markup, /Editing is not implemented yet\./);
});

test("/admin/events/[slug]/edit calls notFound for missing slugs", async () => {
  const { default: AdminEditEventPage } = await import("../app/admin/events/[slug]/edit/page.js");
  let called = false;

  const rendered = AdminEditEventPage({
    params: { slug: "missing" },
    loadEvent: () => null,
    requireAdminAccess: () => true,
    notFoundHandler: () => {
      called = true;
      return null;
    },
  });

  assert.equal(called, true);
  assert.equal(rendered, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminEventsPage.test.js`
Expected: FAIL because `app/admin/events/[slug]/edit/page.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `app/admin/events/[slug]/edit/page.js`.

```js
import { createElement } from "react";
import { notFound } from "next/navigation.js";
import adminAuth from "../../../../../lib/adminAuth.js";
import adminEventsQuery from "../../../../../lib/adminEventsQuery.js";

const { requireAdmin } = adminAuth;
const { getAdminEventBySlug } = adminEventsQuery;

function loadAdminEvent({ slug }) {
  return getAdminEventBySlug({ slug });
}

export default function AdminEditEventPage({
  params = {},
  loadEvent = loadAdminEvent,
  requireAdminAccess = requireAdmin,
  notFoundHandler = notFound,
} = {}) {
  requireAdminAccess();
  const event = loadEvent({ slug: params.slug });

  if (!event) {
    notFoundHandler();
    return null;
  }

  return createElement(
    "main",
    null,
    createElement("h1", null, "Edit Event"),
    createElement("p", null, event.name),
    createElement("p", null, event.slug),
    createElement("p", null, event.date),
    createElement("p", null, event.status),
    createElement("p", null, "Editing is not implemented yet.")
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/adminEventsPage.test.js`
Expected: PASS with index and edit scaffold coverage.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/[slug]/edit/page.js tests/adminEventsPage.test.js
git commit -m "feat: add admin event edit scaffold"
```

## Task 4: Verify Full Admin Surface Regression Set

**Files:**
- Modify: `tests/adminEventsPage.test.js`
- Modify: `tests/adminEventsQuery.test.js`
- Test: `tests/adminEventsPage.test.js`
- Test: `tests/adminEventsQuery.test.js`
- Test: `tests/adminLoginPage.test.js`
- Test: `tests/adminLoginRuntime.test.js`
- Test: `tests/adminRoutes.test.js`

- [ ] **Step 1: Write any missing failing regression assertions**

Before the final verification run, add a confirmed-event scaffold assertion if it is still missing from `tests/adminEventsPage.test.js`.

```js
test("/admin/events/[slug]/edit renders confirmed event scaffold", async () => {
  const { default: AdminEditEventPage } = await import("../app/admin/events/[slug]/edit/page.js");

  const markup = renderToStaticMarkup(
    AdminEditEventPage({
      params: { slug: "spring-open" },
      loadEvent: ({ slug }) => ({
        id: "evt_confirmed_0001",
        slug,
        name: "Spring Open",
        date: "2026-03-09",
        status: "confirmed",
        sourceType: "confirmed",
      }),
      requireAdminAccess: () => true,
    })
  );

  assert.match(markup, /Spring Open/);
  assert.match(markup, /confirmed/);
});
```

- [ ] **Step 2: Run focused regression tests to verify they fail if needed**

Run: `npm test -- tests/adminEventsQuery.test.js tests/adminEventsPage.test.js`
Expected: If you added the missing confirmed-event scaffold assertion and it exposes a bug, FAIL for that reason; otherwise skip to Step 3 without extra code changes.

- [ ] **Step 3: Run the full targeted admin verification suite**

Run: `npm test -- tests/adminEventsQuery.test.js tests/adminEventsPage.test.js tests/adminLoginPage.test.js tests/adminLoginRuntime.test.js tests/adminRoutes.test.js`
Expected: PASS for all targeted admin browse/edit scaffold coverage.

- [ ] **Step 4: Commit only if code changed in this task**

If you changed tests or code in Task 4, commit them:

```bash
git add tests/adminEventsQuery.test.js tests/adminEventsPage.test.js app/admin/events/[slug]/edit/page.js
git commit -m "test: complete admin event scaffold coverage"
```

If no files changed in Task 4, do not create an empty commit.

## Spec Coverage Check

- Protected `/admin/events` index: covered in Task 2.
- Unified draft + confirmed list: covered in Tasks 1 and 2.
- Edit links for each row: covered in Task 2.
- Protected `/admin/events/[slug]/edit` scaffold: covered in Task 3.
- `notFound()` for unknown slugs: covered in Task 3.
- Login redirect to `/admin/events`: covered in Task 2.
- No actual edit/save behavior: preserved by Task 3 scaffold-only implementation.

## Placeholder Scan

- No `TODO`, `TBD`, or deferred code placeholders remain in the plan.
- Every task includes exact file paths, commands, and concrete test/code snippets.
- Helper names are consistent across tasks: `listAdminEvents`, `getAdminEventBySlug`, `AdminEventsPage`, `AdminEditEventPage`, `listEventDrafts`.
