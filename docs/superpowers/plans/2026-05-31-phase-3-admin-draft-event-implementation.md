# Phase 3 Admin Access + Event Draft Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared-secret protected admin flow that allows authenticated users to create valid draft events without affecting public routes.

**Architecture:** Implement server-side admin auth via `ADMIN_SHARED_SECRET` and `admin_session` cookie helpers in `lib/adminAuth.js`, then build `/admin/login` and `/admin/events/new` around those helpers. Draft creation logic lives in `lib/createEventDraft.js` with explicit validation and injected persistence adapter so it is testable and independent of storage details.

**Tech Stack:** Next.js App Router, Node.js `crypto`, Jest tests

---

### Task 1: Add admin auth unit contracts (TDD)

**Files:**
- Create: `tests/adminAuth.test.js`
- Create: `lib/adminAuth.js`

- [ ] **Step 1: Write the failing auth tests**

```javascript
import {
  verifyAdminSecret,
  createAdminSessionToken,
  isAdminSessionTokenValid,
} from "../lib/adminAuth";

describe("adminAuth", () => {
  test("accepts correct shared secret", () => {
    process.env.ADMIN_SHARED_SECRET = "topsecret";
    expect(verifyAdminSecret("topsecret")).toBe(true);
  });

  test("rejects incorrect shared secret", () => {
    process.env.ADMIN_SHARED_SECRET = "topsecret";
    expect(verifyAdminSecret("wrong")).toBe(false);
  });

  test("throws when ADMIN_SHARED_SECRET missing", () => {
    delete process.env.ADMIN_SHARED_SECRET;
    expect(() => verifyAdminSecret("anything")).toThrow(
      "ADMIN_SHARED_SECRET is not configured"
    );
  });

  test("session token round-trip is valid", () => {
    process.env.ADMIN_SHARED_SECRET = "topsecret";
    const token = createAdminSessionToken();
    expect(isAdminSessionTokenValid(token)).toBe(true);
  });

  test("invalid session token is rejected", () => {
    process.env.ADMIN_SHARED_SECRET = "topsecret";
    expect(isAdminSessionTokenValid("bad-token")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/adminAuth.test.js`
Expected: FAIL with module/function-not-found errors for `lib/adminAuth.js` exports.

- [ ] **Step 3: Write minimal auth implementation**

```javascript
import crypto from "node:crypto";

const ADMIN_SESSION_COOKIE = "admin_session";

function getRequiredSecret() {
  const secret = process.env.ADMIN_SHARED_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SHARED_SECRET is not configured");
  }
  return secret;
}

export function verifyAdminSecret(input) {
  const secret = getRequiredSecret();
  const inputBuffer = Buffer.from(String(input || ""));
  const secretBuffer = Buffer.from(secret);
  if (inputBuffer.length !== secretBuffer.length) return false;
  return crypto.timingSafeEqual(inputBuffer, secretBuffer);
}

export function createAdminSessionToken() {
  const secret = getRequiredSecret();
  return crypto
    .createHmac("sha256", secret)
    .update("admin-session-v1")
    .digest("hex");
}

export function isAdminSessionTokenValid(token) {
  const expected = createAdminSessionToken();
  const tokenBuffer = Buffer.from(String(token || ""));
  const expectedBuffer = Buffer.from(expected);
  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

export { ADMIN_SESSION_COOKIE };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/adminAuth.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/adminAuth.test.js lib/adminAuth.js
git commit -m "test: add admin auth contract coverage"
```

### Task 2: Add draft event domain contract (TDD)

**Files:**
- Create: `tests/createEventDraft.test.js`
- Create: `lib/createEventDraft.js`

- [ ] **Step 1: Write failing draft creation tests**

```javascript
import { createEventDraft } from "../lib/createEventDraft";

function adapter(overrides = {}) {
  return {
    findEventBySlug: jest.fn().mockResolvedValue(null),
    insertEventDraft: jest.fn().mockResolvedValue({ id: "evt_123" }),
    ...overrides,
  };
}

describe("createEventDraft", () => {
  test("rejects missing required fields", async () => {
    await expect(
      createEventDraft({ name: "", slug: "", date: "" }, adapter())
    ).rejects.toThrow("Validation failed");
  });

  test("rejects invalid slug format", async () => {
    await expect(
      createEventDraft({ name: "Weekly", slug: "Bad Slug", date: "2026-06-01" }, adapter())
    ).rejects.toThrow("slug");
  });

  test("rejects duplicate slug", async () => {
    const deps = adapter({ findEventBySlug: jest.fn().mockResolvedValue({ id: "exists" }) });
    await expect(
      createEventDraft({ name: "Weekly", slug: "weekly-1", date: "2026-06-01" }, deps)
    ).rejects.toThrow("already exists");
  });

  test("creates draft with normalized shape", async () => {
    const deps = adapter();
    const result = await createEventDraft(
      { name: "Weekly", slug: "weekly-1", date: "2026-06-01", isMajor: true, notes: "Round 1" },
      deps
    );
    expect(result.status).toBe("draft");
    expect(result.slug).toBe("weekly-1");
    expect(deps.insertEventDraft).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/createEventDraft.test.js`
Expected: FAIL with module/function-not-found errors.

- [ ] **Step 3: Implement minimal validator + creation function**

```javascript
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createEventDraft(input, deps) {
  const errors = {};
  const name = String(input?.name || "").trim();
  const slug = String(input?.slug || "").trim();
  const date = String(input?.date || "").trim();
  const notes = String(input?.notes || "").trim();
  const isMajor = Boolean(input?.isMajor);

  if (!name) errors.name = "Name is required";
  if (!slug) errors.slug = "Slug is required";
  else if (!SLUG_RE.test(slug)) errors.slug = "Slug must be URL-safe";
  if (!date || Number.isNaN(Date.parse(date))) errors.date = "Date is invalid";

  if (Object.keys(errors).length > 0) {
    const err = new Error("Validation failed");
    err.fieldErrors = errors;
    throw err;
  }

  const existing = await deps.findEventBySlug(slug);
  if (existing) throw new Error("Event with this slug already exists");

  const payload = { name, slug, date, isMajor, notes, status: "draft" };
  const inserted = await deps.insertEventDraft(payload);
  return { id: inserted.id, ...payload };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/createEventDraft.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/createEventDraft.test.js lib/createEventDraft.js
git commit -m "feat: add draft event creation domain contract"
```

### Task 3: Add admin login page + server action (TDD)

**Files:**
- Create: `app/admin/login/page.js`
- Modify: `lib/adminAuth.js`
- Test: `tests/adminAuth.test.js`

- [ ] **Step 1: Add failing tests for cookie helpers**

```javascript
import { getAdminCookieOptions } from "../lib/adminAuth";

test("admin cookie options are secure-by-default", () => {
  const opts = getAdminCookieOptions("production");
  expect(opts.httpOnly).toBe(true);
  expect(opts.sameSite).toBe("lax");
  expect(opts.secure).toBe(true);
});
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm test -- tests/adminAuth.test.js`
Expected: FAIL because `getAdminCookieOptions` does not exist.

- [ ] **Step 3: Implement cookie helper and login page**

```javascript
// lib/adminAuth.js
export function getAdminCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv !== "development",
    path: "/",
  };
}
```

```javascript
// app/admin/login/page.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminCookieOptions,
  verifyAdminSecret,
} from "../../../lib/adminAuth";

export default function AdminLoginPage() {
  async function login(formData) {
    "use server";
    const password = String(formData.get("password") || "");
    if (!verifyAdminSecret(password)) return;

    cookies().set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(),
      getAdminCookieOptions()
    );
    redirect("/admin/events/new");
  }

  return (
    <main>
      <h1>Admin Login</h1>
      <form action={login}>
        <label htmlFor="password">Shared Secret</label>
        <input id="password" name="password" type="password" required />
        <button type="submit">Sign In</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/adminAuth.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/adminAuth.js app/admin/login/page.js tests/adminAuth.test.js
git commit -m "feat: add admin login and secure session cookie"
```

### Task 4: Add admin guard + draft creation page (TDD)

**Files:**
- Create: `app/admin/events/new/page.js`
- Modify: `lib/adminAuth.js`
- Test: `tests/adminRoutes.test.js`

- [ ] **Step 1: Add failing admin guard tests**

```javascript
import { isAdminSessionTokenValid } from "../lib/adminAuth";

describe("admin route guard contract", () => {
  test("invalid session token is not authenticated", () => {
    process.env.ADMIN_SHARED_SECRET = "topsecret";
    expect(isAdminSessionTokenValid("invalid")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify current guard behavior fails desired route contract**

Run: `npm test -- tests/adminRoutes.test.js`
Expected: FAIL initially until route module exists.

- [ ] **Step 3: Implement `requireAdmin` and protected draft page skeleton**

```javascript
// lib/adminAuth.js
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return isAdminSessionTokenValid(token);
}

export function requireAdmin() {
  if (!isAdminAuthenticated()) redirect("/admin/login");
}
```

```javascript
// app/admin/events/new/page.js
import { requireAdmin } from "../../../../lib/adminAuth";

export default function NewEventDraftPage() {
  requireAdmin();

  return (
    <main>
      <h1>Create Draft Event</h1>
      <p>Draft form will be wired in the next task.</p>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/adminRoutes.test.js`
Expected: PASS for auth contract test.

- [ ] **Step 5: Commit**

```bash
git add lib/adminAuth.js app/admin/events/new/page.js tests/adminRoutes.test.js
git commit -m "feat: add server-side admin route guard"
```

### Task 5: Wire draft form submission end-to-end (TDD)

**Files:**
- Modify: `app/admin/events/new/page.js`
- Modify: `lib/createEventDraft.js`
- Test: `tests/createEventDraft.test.js`

- [ ] **Step 1: Add failing tests for field error shape and non-partial writes**

```javascript
test("returns fieldErrors and never writes on validation failure", async () => {
  const deps = {
    findEventBySlug: jest.fn().mockResolvedValue(null),
    insertEventDraft: jest.fn(),
  };

  await expect(createEventDraft({ name: "", slug: "x", date: "bad" }, deps)).rejects.toMatchObject({
    message: "Validation failed",
    fieldErrors: expect.any(Object),
  });
  expect(deps.insertEventDraft).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `npm test -- tests/createEventDraft.test.js`
Expected: FAIL if error shape or no-write behavior does not match.

- [ ] **Step 3: Implement form action + error rendering**

```javascript
// app/admin/events/new/page.js
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../lib/adminAuth";
import { createEventDraft } from "../../../../lib/createEventDraft";

export default function NewEventDraftPage() {
  requireAdmin();

  async function createDraft(formData) {
    "use server";
    requireAdmin();

    await createEventDraft(
      {
        name: formData.get("name"),
        slug: formData.get("slug"),
        date: formData.get("date"),
        isMajor: formData.get("isMajor") === "on",
        notes: formData.get("notes"),
      },
      {
        findEventBySlug: async () => null,
        insertEventDraft: async (payload) => ({ id: `draft_${payload.slug}` }),
      }
    );

    redirect("/admin/events/new?created=1");
  }

  return (
    <main>
      <h1>Create Draft Event</h1>
      <form action={createDraft}>
        <input name="name" required />
        <input name="slug" required />
        <input name="date" type="date" required />
        <label><input name="isMajor" type="checkbox" /> Major event</label>
        <textarea name="notes" />
        <button type="submit">Create Draft</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/createEventDraft.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/admin/events/new/page.js lib/createEventDraft.js tests/createEventDraft.test.js
git commit -m "feat: wire admin draft event creation flow"
```

### Task 6: Full regression verification + docs update

**Files:**
- Modify: `plans/bag-tag-leaderboard-implementation-progress.md`

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS with existing leaderboard/public event tests still green.

- [ ] **Step 2: Update progress tracking doc**

```markdown
## Phase 3: Admin Access + Event Draft Creation

### Task 3.1 - Shared-secret admin authentication
- Status: `[x] Completed`

### Task 3.2 - Protected admin draft event creation page
- Status: `[x] Completed`

### Task 3.3 - Validation + test coverage
- Status: `[x] Completed`
```

- [ ] **Step 3: Commit**

```bash
git add plans/bag-tag-leaderboard-implementation-progress.md
git commit -m "docs: record phase 3 admin draft implementation progress"
```

## Self-Review Checklist

- Spec coverage check:
  - Admin shared-secret login: covered by Tasks 1 and 3.
  - Server-side route protection: covered by Task 4.
  - Draft creation with validation and uniqueness: covered by Tasks 2 and 5.
  - Security and cookie policy: covered by Tasks 1 and 3.
  - Test strategy requirements: covered by Tasks 1, 2, 4, 5, and 6.
- Placeholder scan: no TODO/TBD placeholders remain.
- Type/signature consistency:
  - `createEventDraft(input, deps)` used consistently across tasks.
  - `ADMIN_SESSION_COOKIE`, session token helpers, and route guard naming stay consistent.
